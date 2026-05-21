import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { encryptToken, decryptToken } from '../services/tokenCipher.js'
import { assertPublicHost } from '../services/ssrfGuard.js'
import nodemailer from 'nodemailer'

const settingsBody = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1),
  password: z.string().optional(),
  fromAddress: z.string().email(),
  fromName: z.string().optional(),
  replyTo: z.string().email().optional(),
  secure: z.enum(['starttls', 'ssl', 'none']).default('starttls'),
})

export async function smtpRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // GET /smtp — load current org SMTP config (no password returned)
  app.get('/', async (req, reply) => {
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })
    const rows = await db`
      SELECT id, host, port, username, from_address, from_name, reply_to,
             secure, is_active, last_test_at, last_test_ok, last_test_error, created_at, updated_at
      FROM org_smtp_settings WHERE organization_id = ${orgId} LIMIT 1
    `
    return reply.send({ settings: rows[0] ?? null })
  })

  // POST /smtp — save (upsert) SMTP settings
  app.post('/', async (req, reply) => {
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })
    const body = settingsBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })
    const d = body.data

    try {
      await assertPublicHost(d.host)
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Invalid SMTP host' })
    }

    // Require password on first-time save; allow empty on update (reuse existing)
    const existing = await db`SELECT id, password_enc FROM org_smtp_settings WHERE organization_id = ${orgId} LIMIT 1`
    let passwordEnc: string
    if (d.password && d.password.trim()) {
      passwordEnc = encryptToken(d.password) ?? d.password
    } else if (existing.length > 0) {
      passwordEnc = existing[0]!.passwordEnc as string
    } else {
      return reply.code(400).send({ error: 'Password required for initial setup' })
    }

    const [row] = await db`
      INSERT INTO org_smtp_settings (
        organization_id, host, port, username, password_enc,
        from_address, from_name, reply_to, secure, is_active
      ) VALUES (
        ${orgId}, ${d.host}, ${d.port}, ${d.username}, ${passwordEnc},
        ${d.fromAddress}, ${d.fromName ?? null}, ${d.replyTo ?? null}, ${d.secure}, true
      )
      ON CONFLICT (organization_id) DO UPDATE SET
        host = EXCLUDED.host, port = EXCLUDED.port, username = EXCLUDED.username,
        password_enc = EXCLUDED.password_enc, from_address = EXCLUDED.from_address,
        from_name = EXCLUDED.from_name, reply_to = EXCLUDED.reply_to,
        secure = EXCLUDED.secure, is_active = true, updated_at = now()
      RETURNING id, host, port, username, from_address, from_name, reply_to, secure, is_active, created_at, updated_at
    `
    return reply.send({ settings: row })
  })

  // POST /smtp/test — send test email using provided or saved config
  app.post('/test', async (req, reply) => {
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })
    const body = z.object({
      to: z.string().email(),
      host: z.string().optional(),
      port: z.number().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      fromAddress: z.string().email().optional(),
      fromName: z.string().optional(),
      secure: z.enum(['starttls', 'ssl', 'none']).optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data

    let host = d.host, port = d.port, username = d.username, password = d.password
    let fromAddress = d.fromAddress, fromName = d.fromName
    let secure: 'starttls' | 'ssl' | 'none' = d.secure ?? 'starttls'

    // Validate inline host if provided directly
    if (d.host) {
      try {
        await assertPublicHost(d.host)
      } catch (err) {
        return reply.code(400).send({ error: err instanceof Error ? err.message : 'Invalid SMTP host' })
      }
    }

    // Fall back to saved config if inline fields missing
    if (!host || !username) {
      const rows = await db`SELECT * FROM org_smtp_settings WHERE organization_id = ${orgId} LIMIT 1`
      if (rows.length === 0) return reply.code(400).send({ error: 'No SMTP configuration saved' })
      const saved = rows[0]!
      host = host ?? (saved.host as string)
      port = port ?? (saved.port as number)
      username = username ?? (saved.username as string)
      fromAddress = fromAddress ?? (saved.fromAddress as string)
      fromName = fromName ?? (saved.fromName as string | undefined)
      secure = d.secure ?? (saved.secure as 'starttls' | 'ssl' | 'none')
      if (!password) {
        try { password = decryptToken(saved.passwordEnc as string) } catch { password = '' }
      }
    }

    const transporter = nodemailer.createTransport({
      host,
      port: port ?? 587,
      secure: secure === 'ssl',
      requireTLS: secure === 'starttls',
      auth: { user: username, pass: password },
    })

    try {
      await transporter.sendMail({
        from: fromName ? `"${fromName.replace(/["\\]/g, '')}" <${fromAddress}>` : fromAddress,
        to: d.to,
        subject: 'n0CRM — SMTP test',
        text: 'This is a test email from your n0CRM SMTP configuration.',
        html: '<p>This is a test email from your <strong>n0CRM</strong> SMTP configuration.</p>',
      })
      await db`
        UPDATE org_smtp_settings
        SET last_test_at = now(), last_test_ok = true, last_test_error = null
        WHERE organization_id = ${orgId}
      `
      return reply.send({ ok: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await db`
        UPDATE org_smtp_settings
        SET last_test_at = now(), last_test_ok = false, last_test_error = ${msg}
        WHERE organization_id = ${orgId}
      `
      return reply.code(502).send({ error: msg })
    }
  })

  // DELETE /smtp — remove SMTP config, revert to system default
  app.delete('/', async (req, reply) => {
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })
    await db`DELETE FROM org_smtp_settings WHERE organization_id = ${orgId}`
    return reply.send({ ok: true })
  })
}
