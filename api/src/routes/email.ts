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

export async function emailRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // POST /email/send — sends via per-org SMTP (if configured) → global SMTP/Resend fallback
  app.post('/send', async (req, reply) => {
    const body = sendSchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })

    const { data } = body
    const orgId = req.user.org ?? null

    // Try per-org SMTP first
    let smtpConfig: Parameters<typeof sendEmail>[1] | undefined
    if (orgId) {
      const rows = await db`
        SELECT host, port, username, password_enc, from_address, from_name, reply_to, secure
        FROM org_smtp_settings
        WHERE organization_id = ${orgId} AND is_active = true
        LIMIT 1
      `
      if (rows.length > 0) {
        const r = rows[0]!
        let password = ''
        try {
          password = r.passwordEnc ? decryptToken(r.passwordEnc as string) : ''
        } catch {
          // decryption failed — skip per-org SMTP, fall through to global
        }
        if (password) {
          smtpConfig = {
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
      }
    }

    try {
      await sendEmail({
        to: toAddresses(data.to) ?? '',
        cc: toAddresses(data.cc),
        bcc: toAddresses(data.bcc),
        subject: data.subject,
        html: data.htmlBody ?? data.html ?? `<p>${(data.body ?? data.text ?? '').replace(/\n/g, '<br/>')}</p>`,
        text: data.body ?? data.text,
        from: data.from,
        replyTo: toAddresses(data.replyTo),
        attachments: data.attachments as Parameters<typeof sendEmail>[0]['attachments'],
      }, smtpConfig)
      return reply.send({ ok: true })
    } catch (err) {
      app.log.error(err, 'email send failed')
      return reply.code(502).send({ error: 'Email send failed', message: err instanceof Error ? err.message : String(err) })
    }
  })
}
