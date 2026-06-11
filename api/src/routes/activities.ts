import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { requireCrudPermission } from '../middleware/rbac.js'

const activityBody = z.object({
  type: z.enum(['call', 'email', 'meeting', 'task', 'note', 'demo', 'follow_up', 'linkedin']),
  subject: z.string().min(1),
  description: z.string().default(''),
  outcome: z.string().optional(),
  dueDate: z.string().optional(),
  completedAt: z.string().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).default('pending'),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  createdBy: z.string().optional(),
})

export async function activitiesRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] }
  app.addHook('preHandler', requireCrudPermission('activities'))

  app.get('/', auth, async (req) => {
    const orgId = req.user.org
    return db`SELECT * FROM activities WHERE organization_id = ${orgId} ORDER BY created_at DESC LIMIT 500`
  })

  app.post('/', auth, async (req, reply) => {
    const body = activityBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const { type, subject, description, outcome, dueDate, completedAt, status, contactId, companyId, dealId, createdBy } = body.data
    const orgId = req.user.org
    const now = new Date().toISOString()
    const [row] = await db`
      INSERT INTO activities (type, subject, description, outcome, due_date, completed_at, status,
        contact_id, company_id, deal_id, created_by, organization_id, created_at, updated_at)
      VALUES (${type}, ${subject}, ${description}, ${outcome ?? null}, ${dueDate ?? null},
        ${completedAt ?? null}, ${status}, ${contactId ?? null}, ${companyId ?? null},
        ${dealId ?? null}, ${createdBy ?? null}, ${orgId}, ${now}, ${now})
      RETURNING *
    `
    return reply.code(201).send(row)
  })

  app.get('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const rows = await db`SELECT * FROM activities WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (rows.length === 0) return reply.code(404).send({ error: 'Not found' })
    return reply.send(rows[0])
  })

  app.patch('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const body = activityBody.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const now = new Date().toISOString()
    const [row] = await db`
      UPDATE activities SET
        type = COALESCE(${d.type ?? null}, type),
        subject = COALESCE(${d.subject ?? null}, subject),
        description = COALESCE(${d.description ?? null}, description),
        outcome = COALESCE(${d.outcome ?? null}, outcome),
        due_date = COALESCE(${d.dueDate ?? null}, due_date),
        completed_at = COALESCE(${d.completedAt ?? null}, completed_at),
        status = COALESCE(${d.status ?? null}, status),
        contact_id = COALESCE(${d.contactId ?? null}, contact_id),
        company_id = COALESCE(${d.companyId ?? null}, company_id),
        deal_id = COALESCE(${d.dealId ?? null}, deal_id),
        updated_at = ${now}
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING *
    `
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })

  app.delete('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    await db`DELETE FROM activities WHERE id = ${id} AND organization_id = ${orgId}`
    return reply.code(204).send()
  })
}
