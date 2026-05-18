import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import crypto from 'node:crypto'
import { db } from '../db/client.js'
import { encryptToken, decryptToken } from '../services/tokenCipher.js'

// Block headers that could be used for SSRF or bypass downstream auth
const BLOCKED_HEADERS = new Set([
  'host', 'authorization', 'cookie', 'set-cookie', 'x-forwarded-for',
  'x-forwarded-host', 'x-forwarded-proto', 'x-real-ip', 'content-length',
  'transfer-encoding', 'connection', 'upgrade',
])

function sanitizeCustomHeaders(raw: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(raw).filter(([k]) => !BLOCKED_HEADERS.has(k.toLowerCase())),
  )
}

export async function webhookSubscriptionsRoutes(app: FastifyInstance) {
  // GET /webhook-subscriptions — list org subscriptions
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.send([])
    const rows = await db`
      SELECT ws.id, ws.name, ws.target_url, ws.enabled, ws.event_filters,
             ws.custom_headers, ws.last_delivery_at, ws.last_http_status,
             ws.last_delivery_error, ws.created_at, ws.updated_at
      FROM webhook_subscriptions ws
      WHERE ws.organization_id = ${req.user.org}
      ORDER BY ws.created_at DESC
    `
    return reply.send(rows)
  })

  // POST /webhook-subscriptions — create subscription
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const body = z.object({
      name: z.string().min(1).max(255),
      target_url: z.string().url().startsWith('https://'),
      event_filters: z.array(z.string()).min(1).default(['*']),
      custom_headers: z.record(z.string()).default({}),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })

    const rawSecret = crypto.randomBytes(32).toString('hex')
    const encSecret = encryptToken(rawSecret) ?? rawSecret
    const safeHeaders = sanitizeCustomHeaders(body.data.custom_headers)

    const rows = await db`
      WITH ins AS (
        INSERT INTO webhook_subscriptions (
          organization_id, created_by, name, target_url, event_filters, custom_headers
        ) VALUES (
          ${req.user.org}, ${req.user.sub},
          ${body.data.name}, ${body.data.target_url},
          ${body.data.event_filters}, ${JSON.stringify(safeHeaders)}
        )
        RETURNING id, name, target_url, enabled, event_filters, custom_headers, created_at
      ),
      sec AS (
        INSERT INTO webhook_subscription_secrets (subscription_id, signing_secret)
        SELECT id, ${encSecret} FROM ins
      )
      SELECT *, ${rawSecret} AS signing_secret FROM ins
    `
    return reply.code(201).send(rows[0])
  })

  // PATCH /webhook-subscriptions/:id — update subscription
  app.patch('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const { id } = req.params as { id: string }
    const body = z.object({
      name: z.string().min(1).max(255).optional(),
      enabled: z.boolean().optional(),
      event_filters: z.array(z.string()).min(1).optional(),
      custom_headers: z.record(z.string()).optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const rows = await db`
      UPDATE webhook_subscriptions
      SET
        name            = COALESCE(${body.data.name ?? null}, name),
        enabled         = COALESCE(${body.data.enabled ?? null}, enabled),
        event_filters   = COALESCE(${body.data.event_filters ? body.data.event_filters : null}, event_filters),
        custom_headers  = COALESCE(${body.data.custom_headers ? JSON.stringify(sanitizeCustomHeaders(body.data.custom_headers)) : null}::jsonb, custom_headers),
        updated_at      = now()
      WHERE id = ${id} AND organization_id = ${req.user.org}
      RETURNING id, name, target_url, enabled, event_filters, custom_headers, updated_at
    `
    if (rows.length === 0) return reply.code(404).send({ error: 'Not found' })
    return reply.send(rows[0])
  })

  // DELETE /webhook-subscriptions/:id
  app.delete('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const { id } = req.params as { id: string }
    await db`
      DELETE FROM webhook_subscriptions
      WHERE id = ${id} AND organization_id = ${req.user.org}
    `
    return reply.code(204).send()
  })

  // POST /webhook-subscriptions/:id/test — send test payload to target URL
  app.post('/:id/test', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const { id } = req.params as { id: string }

    const rows = await db`
      SELECT ws.target_url, ws.custom_headers, wss.signing_secret
      FROM webhook_subscriptions ws
      LEFT JOIN webhook_subscription_secrets wss ON wss.subscription_id = ws.id
      WHERE ws.id = ${id} AND ws.organization_id = ${req.user.org}
      LIMIT 1
    `
    if (rows.length === 0) return reply.code(404).send({ error: 'Not found' })

    const sub = rows[0]!
    const testPayload = JSON.stringify({
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      subscription_id: id,
      data: { message: 'This is a test delivery from Velo CRM.' },
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Velo-Event': 'webhook.test',
      'X-Velo-Delivery': crypto.randomUUID(),
    }
    if (sub.signingSecret) {
      let secret: string
      try { secret = decryptToken(sub.signingSecret as string) } catch { secret = sub.signingSecret as string }
      const sig = crypto.createHmac('sha256', secret).update(testPayload).digest('hex')
      headers['X-Velo-Signature'] = `sha256=${sig}`
    }
    const customHeaders = sub.customHeaders as Record<string, string> | null
    if (customHeaders) Object.assign(headers, customHeaders)

    try {
      const res = await fetch(sub.targetUrl as string, {
        method: 'POST',
        headers,
        body: testPayload,
        signal: AbortSignal.timeout(10_000),
      })
      await db`
        UPDATE webhook_subscriptions
        SET last_delivery_at = now(), last_http_status = ${res.status},
            last_delivery_error = ${res.ok ? null : `HTTP ${res.status}`}
        WHERE id = ${id}
      `
      return reply.send({ ok: res.ok, status: res.status })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await db`
        UPDATE webhook_subscriptions
        SET last_delivery_at = now(), last_delivery_error = ${msg} WHERE id = ${id}
      `
      return reply.code(502).send({ error: msg })
    }
  })

  // POST /webhook-subscriptions/:id/rotate-secret — rotate signing secret
  app.post('/:id/rotate-secret', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const { id } = req.params as { id: string }

    const exists = await db`
      SELECT id FROM webhook_subscriptions WHERE id = ${id} AND organization_id = ${req.user.org}
    `
    if (exists.length === 0) return reply.code(404).send({ error: 'Not found' })

    const rawSecret = crypto.randomBytes(32).toString('hex')
    const encSecret = encryptToken(rawSecret) ?? rawSecret
    await db`
      INSERT INTO webhook_subscription_secrets (subscription_id, signing_secret)
      VALUES (${id}, ${encSecret})
      ON CONFLICT (subscription_id) DO UPDATE SET signing_secret = EXCLUDED.signing_secret
    `
    return reply.send({ signing_secret: rawSecret })
  })
}
