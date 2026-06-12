/**
 * Public web-to-lead forms (/public/forms) — no JWT, no API key.
 *
 * A form is backed by a lead-capture token (lct_). The token is embedded in the
 * public form/snippet; submissions hit POST /public/forms/:token and create a lead
 * in the token's org. Anti-spam: a honeypot field + a tight per-IP rate limit.
 *
 * Registered as its OWN plugin (NOT under publicApiRoutes) because that plugin
 * requires an x-api-key header on every route; these endpoints are token-in-path.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { db } from '../db/client.js'

export interface FormConfig {
  title: string
  description: string
  fields: string[]
  successMessage: string
}

export const ALLOWED_FIELDS = ['firstName', 'lastName', 'email', 'company', 'phone', 'message'] as const

export const DEFAULT_FORM_CONFIG: FormConfig = {
  title: 'Get in touch',
  description: '',
  fields: ['firstName', 'lastName', 'email', 'company', 'message'],
  successMessage: "Thanks! We'll be in touch shortly.",
}

/** Merge a stored (possibly empty/partial) config with safe defaults; email is always present. */
export function resolveFormConfig(raw: unknown): FormConfig {
  const c = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const rawFields = Array.isArray(c['fields']) ? (c['fields'] as unknown[]).filter((f): f is string => typeof f === 'string') : []
  const fields = rawFields.filter((f) => (ALLOWED_FIELDS as readonly string[]).includes(f))
  return {
    title: typeof c['title'] === 'string' && c['title'] ? (c['title'] as string) : DEFAULT_FORM_CONFIG.title,
    description: typeof c['description'] === 'string' ? (c['description'] as string) : '',
    fields: fields.length > 0 ? (fields.includes('email') ? fields : [...fields, 'email']) : DEFAULT_FORM_CONFIG.fields,
    successMessage:
      typeof c['successMessage'] === 'string' && c['successMessage'] ? (c['successMessage'] as string) : DEFAULT_FORM_CONFIG.successMessage,
  }
}

/** True when the honeypot field was filled — almost certainly a bot; drop silently. */
export function isHoneypotTripped(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false
  const hp = (body as Record<string, unknown>)['_hp']
  return typeof hp === 'string' && hp.trim().length > 0
}

const submitBody = z.object({
  email: z.string().email().max(254),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  company: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  message: z.string().max(2000).optional(),
  _hp: z.string().max(200).optional(),
})

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export async function leadFormsRoutes(app: FastifyInstance) {
  // Public form config (for a hosted render page). No secrets — title/fields only.
  app.get('/:token', async (req, reply) => {
    const { token } = req.params as { token: string }
    const [row] = await db`
      SELECT config FROM lead_capture_tokens WHERE token_hash = ${sha256(token)} AND enabled = true LIMIT 1
    `
    if (!row) return reply.code(404).send({ error: 'Form not found' })
    return reply.header('Cache-Control', 'no-store').send(resolveFormConfig(row['config']))
  })

  // Public submission — honeypot + tight rate limit; creates/updates a lead in the org.
  app.post('/:token', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { token } = req.params as { token: string }

    // Bot? Pretend success so the bot doesn't retry, but create nothing.
    if (isHoneypotTripped(req.body)) return reply.code(200).send({ ok: true })

    const parsed = submitBody.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid submission' })

    const [tok] = await db`
      SELECT id, organization_id, config FROM lead_capture_tokens WHERE token_hash = ${sha256(token)} AND enabled = true LIMIT 1
    `
    if (!tok) return reply.code(404).send({ error: 'Form not found' })
    const orgId = tok['organizationId'] as string
    const d = parsed.data
    const now = new Date().toISOString()
    const notes = [d.company ? `Company: ${d.company}` : '', d.message ?? ''].filter(Boolean).join('\n')

    await db`
      INSERT INTO contacts (first_name, last_name, email, phone, type, source, notes, organization_id, created_at, updated_at)
      VALUES (${d.firstName ?? ''}, ${d.lastName ?? ''}, ${d.email}, ${d.phone ?? null}, 'lead', 'web_form', ${notes}, ${orgId}, ${now}, ${now})
      ON CONFLICT (email, organization_id) DO UPDATE SET
        phone = COALESCE(EXCLUDED.phone, contacts.phone),
        notes = CASE WHEN ${notes} <> '' THEN ${notes} ELSE contacts.notes END,
        updated_at = ${now}
    `
    await db`UPDATE lead_capture_tokens SET submission_count = submission_count + 1, updated_at = ${now} WHERE id = ${tok['id'] as string}`

    return reply.code(201).send({ ok: true, message: resolveFormConfig(tok['config']).successMessage })
  })
}
