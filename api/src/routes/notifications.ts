import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

const notificationBody = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  triggeredBy: z.string().optional(),
  isRead: z.boolean().default(false),
})

export async function notificationsRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] }

  app.get('/', auth, async (req) => {
    const orgId = req.user.org
    const userId = req.user.sub
    return db`
      SELECT * FROM notifications
      WHERE organization_id = ${orgId} AND (user_id = ${userId} OR user_id = 'system')
      ORDER BY created_at DESC LIMIT 200
    `
  })

  app.post('/', auth, async (req, reply) => {
    const body = notificationBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const { type, title, message, entityType, entityId, userId, triggeredBy, isRead } = body.data
    const orgId = req.user.org
    const effectiveUserId = userId ?? req.user.sub
    const [row] = await db`
      INSERT INTO notifications (type, title, message, entity_type, entity_id, user_id, triggered_by, is_read, organization_id)
      VALUES (${type}, ${title}, ${message}, ${entityType ?? null}, ${entityId ?? null},
              ${effectiveUserId}, ${triggeredBy ?? null}, ${isRead}, ${orgId})
      RETURNING *
    `
    return reply.code(201).send(row)
  })

  app.patch('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const body = z.object({ isRead: z.boolean() }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const [row] = await db`
      UPDATE notifications SET is_read = ${body.data.isRead}
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING *
    `
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })

  app.post('/mark-all-read', auth, async (req) => {
    const orgId = req.user.org
    const userId = req.user.sub
    await db`
      UPDATE notifications SET is_read = true
      WHERE organization_id = ${orgId} AND user_id = ${userId} AND is_read = false
    `
    return { ok: true }
  })

  app.delete('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    await db`DELETE FROM notifications WHERE id = ${id} AND organization_id = ${orgId}`
    return reply.code(204).send()
  })

  app.delete('/', auth, async (req, reply) => {
    const orgId = req.user.org
    const userId = req.user.sub
    await db`DELETE FROM notifications WHERE organization_id = ${orgId} AND user_id = ${userId}`
    return reply.code(204).send()
  })
}
