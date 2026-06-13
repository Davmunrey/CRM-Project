import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { sendEmail } from '../services/email.js'
import { decryptToken } from '../services/tokenCipher.js'

const attachmentSchema = z.object({
  name: z.string(),
  dataBase64: z.string().optional(),
  mimeType: z.string().optional(),
})

const sendSchema = z.object({
  provider: z.string().optional(),
  to: z.union([z.string(), z.array(z.string())]),
  cc: z.union([z.string(), z.array(z.string())]).optional(),
  bcc: z.union([z.string(), z.array(z.string())]).optional(),
  replyTo: z.union([z.string(), z.array(z.string())]).optional(),
  subject: z.string().min(1),
  html: z.string().optional(),
  htmlBody: z.string().optional(),
  text: z.string().optional(),
  body: z.string().optional(),
  from: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
})

function toAddresses(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined
  return Array.isArray(v) ? v.join(', ') : v
}

/** Resolve the org's active SMTP config (decrypting the stored password), or undefined to fall back to global. */
async function resolveOrgSmtp(orgId: string): Promise<Parameters<typeof sendEmail>[1] | undefined> {
  const rows = await db`
    SELECT host, port, username, password_enc, from_address, from_name, reply_to, secure
    FROM org_smtp_settings
    WHERE organization_id = ${orgId} AND is_active = true
    LIMIT 1
  `
  if (rows.length === 0) return undefined
  const r = rows[0]!
  let password = ''
  try {
    password = r.passwordEnc ? decryptToken(r.passwordEnc as string) : ''
  } catch {
    return undefined // decryption failed — fall through to global
  }
  if (!password) return undefined
  return {
    host: r.host as string,
    port: r.port as number,
    secure: r.secure as 'starttls' | 'ssl' | 'none',
    username: r.username as string,
    password,
    fromAddress: r.fromAddress as string,
    fromName: r.fromName as string | null,
    replyTo: r.replyTo as string | null,
  }
}

export async function emailRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // POST /email/send — sends via per-org SMTP (if configured) → global SMTP/Resend fallback.
  // Per-org send cap (org-keyed via the global keyGenerator) limits blast radius
  // of a compromised account / abuse of the org's outbound mail credentials.
  app.post('/send', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    // Viewers are read-only and must not be able to send mail through org credentials.
    if (req.user.role === 'viewer') return reply.code(403).send({ error: 'Insufficient permissions' })

    const body = sendSchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })

    const { data } = body
    const orgId = req.user.org ?? null

    const smtpConfig = orgId ? await resolveOrgSmtp(orgId) : undefined

    try {
      await sendEmail({
        to: toAddresses(data.to) ?? '',
        cc: toAddresses(data.cc),
        bcc: toAddresses(data.bcc),
        subject: data.subject,
        html: data.htmlBody ?? data.html ?? `<p>${(data.body ?? data.text ?? '').replace(/\n/g, '<br/>')}</p>`,
        text: data.body ?? data.text,
        // Force From to the org's verified SMTP address (or the global EMAIL_FROM
        // default inside sendEmail when unset). The caller-supplied `data.from` is
        // intentionally ignored to prevent sender spoofing through org credentials.
        from: smtpConfig?.fromAddress,
        replyTo: toAddresses(data.replyTo),
        attachments: data.attachments as Parameters<typeof sendEmail>[0]['attachments'],
      }, smtpConfig)
      return reply.send({ ok: true })
    } catch (err) {
      app.log.error(err, 'email send failed')
      return reply.code(502).send({ error: 'Email send failed', message: err instanceof Error ? err.message : String(err) })
    }
  })

  // POST /email/bulk-send — staggered fan-out, processed SERVER-side so the batch
  // survives the sender navigating away / closing the tab (the old client loop
  // awaited setTimeout in the browser and aborted on navigation). Responds
  // immediately with the accepted count; sends continue in the background.
  const bulkSchema = z.object({
    recipients: z.array(z.string().email()).min(1).max(500),
    subject: z.string().min(1),
    body: z.string().optional(),
    htmlBody: z.string().optional(),
    staggerSeconds: z.number().min(0).max(300).default(0),
  })
  app.post('/bulk-send', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (req.user.role === 'viewer') return reply.code(403).send({ error: 'Insufficient permissions' })
    const parsed = bulkSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid request', details: parsed.error.flatten() })
    const { recipients, subject, body: text, htmlBody, staggerSeconds } = parsed.data
    const orgId = req.user.org ?? null
    const smtpConfig = orgId ? await resolveOrgSmtp(orgId) : undefined
    const html = htmlBody ?? `<p>${(text ?? '').replace(/\n/g, '<br/>')}</p>`

    reply.send({ accepted: recipients.length })

    // Detached background loop (not awaited) — keeps running after the response.
    void (async () => {
      for (let i = 0; i < recipients.length; i++) {
        if (i > 0 && staggerSeconds > 0) await new Promise((r) => setTimeout(r, staggerSeconds * 1000))
        try {
          await sendEmail({ to: recipients[i]!, subject, html, text, from: smtpConfig?.fromAddress }, smtpConfig)
        } catch (err) {
          app.log.error(err, `bulk email send failed for ${recipients[i]}`)
        }
      }
    })()
  })
}
