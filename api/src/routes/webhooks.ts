import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { db } from '../db/client.js'
import { encryptToken, decryptToken } from '../services/tokenCipher.js'

const webhookBody = z.record(z.unknown())

function verifyHmac(rawBody: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
    const sigBuf = Buffer.from(signature.replace(/^sha256=/, ''), 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    return timingSafeEqual(sigBuf, expBuf)
  } catch {
    return false
  }
}

export async function webhookRoutes(app: FastifyInstance) {
  // Inbound webhook receiver — verified by HMAC-SHA256 signature
  app.post('/inbound/:orgSlug', {
    config: { rawBody: true },
  }, async (req, reply) => {
    const { orgSlug } = req.params as { orgSlug: string }

    const orgs = await db`
      SELECT o.id, w.secret
      FROM organizations o
      LEFT JOIN webhooks w ON w.organization_id = o.id AND w.active = true
      WHERE o.slug = ${orgSlug}
      LIMIT 1
    `
    if (orgs.length === 0) return reply.code(404).send({ error: 'Not found' })

    const org = orgs[0]!
    const signature = req.headers['x-hub-signature-256'] as string | undefined

    if (org.secret) {
      if (!signature) return reply.code(401).send({ error: 'Missing signature' })
      let secret: string
      try {
        secret = decryptToken(org.secret as string)
      } catch {
        secret = org.secret as string
      }
      const rawBody = (req as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(req.body)
      if (!verifyHmac(rawBody, signature, secret)) {
        return reply.code(401).send({ error: 'Invalid signature' })
      }
    }

    const body = webhookBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid payload' })

    // Store for async processing
    await db`
      INSERT INTO webhook_events (organization_id, payload, received_at)
      VALUES (${org.id}, ${JSON.stringify(body.data)}, ${new Date().toISOString()})
    `

    return reply.send({ ok: true })
  })

  // GET /webhooks — list org webhooks (requires auth)
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const rows = await db`
      SELECT id, url, events, active, created_at
      FROM webhooks
      WHERE organization_id = ${req.user.org}
      ORDER BY created_at DESC
    `
    return reply.send({ data: rows })
  })

  // POST /webhooks — register webhook endpoint
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const body = z.object({
      url: z.string().url(),
      events: z.array(z.string()).min(1),
      secret: z.string().min(16),
    }).safeParse(req.body)

    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const now = new Date().toISOString()
    const encSecret = encryptToken(body.data.secret) ?? body.data.secret
    const [webhook] = await db`
      INSERT INTO webhooks (url, events, secret, organization_id, active, created_at)
      VALUES (${body.data.url}, ${body.data.events}, ${encSecret}, ${req.user.org}, true, ${now})
      RETURNING id, url, events, active, created_at
    `
    return reply.code(201).send(webhook)
  })
}
