import { createHmac } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { encryptToken, decryptToken } from '../services/tokenCipher.js'

interface ZoomSettings {
  zoomWebhookSecret?: string
  zoomWebhookSecretCipher?: string
}

export async function zoomRoutes(app: FastifyInstance) {
  // GET /zoom — return config status (authenticated)
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const rows = await db`SELECT settings FROM organizations WHERE id = ${req.user.org} LIMIT 1`
    const settings = (rows[0]?.settings ?? {}) as ZoomSettings
    return reply.send({ configured: Boolean(settings.zoomWebhookSecretCipher || settings.zoomWebhookSecret) })
  })

  // POST /zoom — save Zoom webhook secret (authenticated)
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const body = z.object({
      webhookSecret: z.string().min(8).max(200),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const cipher = encryptToken(body.data.webhookSecret)
    await db`
      UPDATE organizations
      SET settings = settings || ${JSON.stringify({ zoomWebhookSecretCipher: cipher })}::jsonb,
          updated_at = now()
      WHERE id = ${req.user.org}
    `
    return reply.send({ ok: true })
  })

  // DELETE /zoom — remove Zoom config (authenticated)
  app.delete('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    await db`
      UPDATE organizations
      SET settings = settings - 'zoomWebhookSecret' - 'zoomWebhookSecretCipher',
          updated_at = now()
      WHERE id = ${req.user.org}
    `
    return reply.send({ ok: true })
  })

  // POST /zoom/webhook/:orgId — receive Zoom events (public, HMAC-validated)
  app.post('/webhook/:orgId', async (req, reply) => {
    const { orgId } = req.params as { orgId: string }
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_RE.test(orgId)) return reply.code(400).send({ error: 'Invalid orgId' })

    const rows = await db`SELECT settings FROM organizations WHERE id = ${orgId} LIMIT 1`
    if (rows.length === 0) return reply.code(404).send({ error: 'Unknown organization' })

    const settings = (rows[0]?.settings ?? {}) as ZoomSettings
    let secret: string | null = null
    if (settings.zoomWebhookSecretCipher) {
      try { secret = decryptToken(settings.zoomWebhookSecretCipher) } catch { secret = null }
    } else if (settings.zoomWebhookSecret) {
      secret = settings.zoomWebhookSecret
    }

    if (!secret) return reply.code(503).send({ error: 'Zoom not configured for this org' })

    // Validate Zoom HMAC signature
    const timestamp = req.headers['x-zm-request-timestamp'] as string | undefined
    const signature = req.headers['x-zm-signature'] as string | undefined
    const rawBody = JSON.stringify(req.body)

    if (timestamp && signature && secret) {
      const message = `v0:${timestamp}:${rawBody}`
      const expected = 'v0=' + createHmac('sha256', secret).update(message).digest('hex')
      if (expected !== signature) {
        return reply.code(401).send({ error: 'Invalid signature' })
      }
    }

    const payload = req.body as Record<string, unknown>

    // Handle Zoom endpoint URL validation challenge
    if (payload.event === 'endpoint.url_validation') {
      const token = (payload.payload as Record<string, unknown>)?.plainToken as string | undefined
      if (token && secret) {
        const hash = createHmac('sha256', secret).update(token).digest('hex')
        return reply.send({ plainToken: token, encryptedToken: hash })
      }
      return reply.code(400).send({ error: 'Missing plainToken' })
    }

    // Process meeting/webinar end events → create CRM activity
    const eventType = payload.event as string | undefined
    if (eventType === 'meeting.ended' || eventType === 'webinar.ended') {
      const meetingPayload = (payload.payload as Record<string, unknown>)?.object as Record<string, unknown> | undefined
      if (meetingPayload) {
        const hostEmail = meetingPayload.host_email as string | undefined
        const topic = (meetingPayload.topic as string | undefined) ?? 'Zoom meeting'
        const duration = meetingPayload.duration as number | undefined
        const endTime = (meetingPayload.end_time as string | undefined) ?? new Date().toISOString()

        // Find contact by host email
        let contactId: string | null = null
        if (hostEmail) {
          const contacts = await db`
            SELECT id FROM contacts WHERE email = ${hostEmail} AND organization_id = ${orgId} LIMIT 1
          `
          contactId = contacts[0]?.id as string ?? null
        }

        const now = new Date().toISOString()
        await db`
          INSERT INTO activities (
            type, subject, description, status, completed_at,
            contact_id, organization_id, created_at, updated_at
          ) VALUES (
            'meeting',
            ${`Zoom: ${topic}`},
            ${duration ? `Duration: ${duration} min` : 'Zoom meeting ended'},
            'completed',
            ${endTime},
            ${contactId},
            ${orgId},
            ${now},
            ${now}
          )
        `
      }
    }

    return reply.send({ ok: true })
  })
}
