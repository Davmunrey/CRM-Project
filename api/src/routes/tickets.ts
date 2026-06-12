/**
 * Help desk / support tickets (/tickets). RBAC-gated like other CRM resources
 * (requireCrudPermission('tickets') — GET=read, POST/PATCH=write, DELETE=delete).
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { requireCrudPermission } from '../middleware/rbac.js'

const STATUSES = ['open', 'pending', 'resolved', 'closed'] as const
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

/** Count tickets by status — used for the list-header summary. Pure + unit-tested. */
export function ticketCounts(tickets: Array<{ status?: string }>): Record<(typeof STATUSES)[number] | 'total', number> {
  const out = { open: 0, pending: 0, resolved: 0, closed: 0, total: 0 }
  for (const t of tickets) {
    out.total++
    if (t.status && t.status in out) out[t.status as (typeof STATUSES)[number]]++
  }
  return out
}

const createBody = z.object({
  subject: z.string().min(1).max(300),
  description: z.string().max(20000).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
})

const updateBody = z.object({
  subject: z.string().min(1).max(300).optional(),
  description: z.string().max(20000).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  contactId: z.string().uuid().nullable().optional(),
  companyId: z.string().uuid().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
})

export async function ticketsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireCrudPermission('tickets'))

  app.get('/', async (req, reply) => {
    const orgId = req.user.org
    const { status } = req.query as { status?: string }
    const rows =
      status && (STATUSES as readonly string[]).includes(status)
        ? await db`SELECT * FROM tickets WHERE organization_id = ${orgId} AND status = ${status} ORDER BY created_at DESC LIMIT 500`
        : await db`SELECT * FROM tickets WHERE organization_id = ${orgId} ORDER BY created_at DESC LIMIT 500`
    return reply.send({ data: rows, counts: ticketCounts(rows as Array<{ status?: string }>) })
  })

  app.get('/:id', async (req, reply) => {
    const orgId = req.user.org
    const { id } = req.params as { id: string }
    const [row] = await db`SELECT * FROM tickets WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })

  app.post('/', async (req, reply) => {
    const parsed = createBody.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid request' })
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })
    const d = parsed.data
    const [row] = await db`
      INSERT INTO tickets (organization_id, subject, description, status, priority, contact_id, company_id, assigned_to, created_by)
      VALUES (${orgId}, ${d.subject}, ${d.description ?? ''}, ${d.status ?? 'open'}, ${d.priority ?? 'medium'},
              ${d.contactId ?? null}, ${d.companyId ?? null}, ${d.assignedTo ?? null}, ${req.user.sub})
      RETURNING *
    `
    return reply.code(201).send(row)
  })

  app.patch('/:id', async (req, reply) => {
    const parsed = updateBody.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid request' })
    const orgId = req.user.org
    const { id } = req.params as { id: string }
    const d = parsed.data
    // Stamp/clear resolved_at when the status crosses the resolved/closed boundary.
    const resolving = d.status === 'resolved' || d.status === 'closed'
    const [row] = await db`
      UPDATE tickets SET
        subject = COALESCE(${d.subject ?? null}, subject),
        description = COALESCE(${d.description ?? null}, description),
        status = COALESCE(${d.status ?? null}, status),
        priority = COALESCE(${d.priority ?? null}, priority),
        contact_id = ${d.contactId !== undefined ? d.contactId : db`contact_id`},
        company_id = ${d.companyId !== undefined ? d.companyId : db`company_id`},
        assigned_to = ${d.assignedTo !== undefined ? d.assignedTo : db`assigned_to`},
        resolved_at = ${d.status ? (resolving ? db`now()` : null) : db`resolved_at`},
        updated_at = now()
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING *
    `
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })

  app.delete('/:id', async (req, reply) => {
    const orgId = req.user.org
    const { id } = req.params as { id: string }
    await db`DELETE FROM tickets WHERE id = ${id} AND organization_id = ${orgId}`
    return reply.code(204).send()
  })
}
