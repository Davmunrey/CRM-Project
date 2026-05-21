import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

const eventSchema = z.object({
  action: z.string().max(100),
  timestamp: z.string(),
  meta: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
})

export async function uxMetricsRoutes(app: FastifyInstance) {
  // POST /ux-metrics-ingest — batch ingest UX telemetry events
  app.post('/ingest', { onRequest: [app.authenticate] }, async (req, reply) => {
    const body = z.object({
      events: z.array(eventSchema).min(1).max(500),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const orgId = req.user.org ?? null
    const userId = req.user.sub

    // Fire-and-forget insert; non-critical telemetry never blocks the response
    db`
      INSERT INTO ux_metric_events (organization_id, user_id, action, occurred_at, meta)
      SELECT ${orgId}, ${userId}, e->>'action',
             (e->>'timestamp')::timestamptz,
             (e->>'meta')::jsonb
      FROM jsonb_array_elements(${JSON.stringify(body.data.events)}::jsonb) AS e
    `.catch(() => null)

    return reply.send({ ok: true, accepted: body.data.events.length })
  })
}
