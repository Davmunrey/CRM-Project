import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

const goalBody = z.object({
  userId: z.string().uuid().optional(),
  type: z.enum(['revenue', 'deals_closed', 'activities', 'contacts_added', 'calls_made', 'meetings_held', 'emails_sent', 'demos_scheduled']),
  target: z.number().positive(),
  current: z.number().min(0).default(0),
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  startDate: z.string(),
  endDate: z.string(),
})

export async function goalsRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] }

  app.get('/', auth, async (req) => {
    const orgId = req.user.org
    return db`SELECT * FROM sales_goals WHERE organization_id = ${orgId} ORDER BY created_at DESC`
  })

  app.post('/', auth, async (req, reply) => {
    const body = goalBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const { userId, type, target, current, period, startDate, endDate } = body.data
    const orgId = req.user.org
    const effectiveUserId = userId ?? req.user.sub
    const [row] = await db`
      INSERT INTO sales_goals (user_id, type, target, current, period, start_date, end_date, organization_id)
      VALUES (${effectiveUserId}, ${type}, ${target}, ${current}, ${period}, ${startDate}, ${endDate}, ${orgId})
      RETURNING *
    `
    return reply.code(201).send(row)
  })

  app.patch('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const body = goalBody.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const [row] = await db`
      UPDATE sales_goals SET
        type = COALESCE(${d.type ?? null}, type),
        target = COALESCE(${d.target ?? null}, target),
        current = COALESCE(${d.current ?? null}, current),
        period = COALESCE(${d.period ?? null}, period),
        start_date = COALESCE(${d.startDate ?? null}, start_date),
        end_date = COALESCE(${d.endDate ?? null}, end_date)
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING *
    `
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })

  app.delete('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    await db`DELETE FROM sales_goals WHERE id = ${id} AND organization_id = ${orgId}`
    return reply.code(204).send()
  })
}
