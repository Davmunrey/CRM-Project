import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { checkPlanLimit } from './billing.js'
import { sendSlackNotification } from './slack.js'
import { requireCrudPermission } from '../middleware/rbac.js'

const listQuery = z.object({
  limit: z.coerce.number().min(1).max(500).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
  type: z.enum(['lead', 'contact']).optional(),
})

const contactBody = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().default(''),
  phone: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  type: z.enum(['lead', 'contact']).default('lead'),
  source: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  lastContactedAt: z.string().optional().nullable(),
  status: z.enum(['prospect', 'active', 'inactive', 'customer', 'churned']).optional(),
  linkedinUrl: z.string().url().optional().nullable(),
})

export async function contactsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)
  app.addHook('preHandler', requireCrudPermission('contacts'))

  app.get('/', async (req, reply) => {
    const query = listQuery.safeParse(req.query)
    if (!query.success) return reply.code(400).send({ error: 'Invalid query' })

    const { limit, offset, search, type } = query.data
    const orgId = req.user.org

    const searchFragment = search ? db`AND (
      first_name ILIKE ${'%' + search + '%'}
      OR last_name ILIKE ${'%' + search + '%'}
      OR email ILIKE ${'%' + search + '%'}
    )` : db``

    // COUNT(*) OVER() is computed in the same query plan as the page fetch —
    // one round-trip instead of two. When the result set is empty the window
    // function returns no rows, so we default to 0.
    const rows = await db`
      SELECT id, email, first_name, last_name, phone, job_title,
             company_id, lead_score, status, type, source,
             tags, notes, assigned_to, last_contacted_at, linked_deals,
             linkedin_url, created_at, updated_at,
             COUNT(*) OVER() AS total_count
      FROM contacts
      WHERE organization_id = ${orgId}
        ${type ? db`AND type = ${type}` : db``}
        ${searchFragment}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const total = Number(rows[0]?.['total_count'] ?? 0)
    // Strip the internal pagination column before sending to the client
    const data = rows.map(({ total_count: _total_count, ...rest }) => rest)

    return reply.send({ data, total, limit, offset })
  })

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org

    const rows = await db`
      SELECT c.*, co.name AS company_name
      FROM contacts c
      LEFT JOIN companies co ON co.id = c.company_id
      WHERE c.id = ${id} AND c.organization_id = ${orgId}
      LIMIT 1
    `
    if (rows.length === 0) return reply.code(404).send({ error: 'Not found' })
    return reply.send(rows[0])
  })

  app.post('/', async (req, reply) => {
    const body = contactBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })

    const d = body.data
    const orgId = req.user.org
    const now = new Date().toISOString()

    const limit = await checkPlanLimit(orgId, 'contacts')
    if (!limit.allowed) {
      return reply.code(402).send({ error: 'Contact limit reached', limit: limit.limit, current: limit.current })
    }

    const [contact] = await db`
      INSERT INTO contacts (
        email, first_name, last_name, phone, job_title, company_id,
        type, status, source, tags, notes, assigned_to, last_contacted_at,
        linkedin_url, organization_id, created_at, updated_at
      ) VALUES (
        ${d.email}, ${d.firstName}, ${d.lastName},
        ${d.phone ?? null}, ${d.jobTitle ?? null}, ${d.companyId ?? null},
        ${d.type}, ${d.status ?? 'prospect'}, ${d.source ?? 'other'}, ${d.tags ?? []},
        ${d.notes ?? null}, ${d.assignedTo ?? null}, ${d.lastContactedAt ?? null},
        ${d.linkedinUrl ?? null}, ${orgId}, ${now}, ${now}
      )
      RETURNING *
    `

    if (contact) {
      void sendSlackNotification(orgId, {
        text: `:busts_in_silhouette: *New Contact:* ${contact['firstName'] ?? ''} ${contact['lastName'] ?? ''} (${contact['email']})`,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `:busts_in_silhouette: *New Contact Added*\n*${contact['firstName'] ?? ''} ${contact['lastName'] ?? ''}*\nEmail: ${contact['email']} | Type: ${contact['type']}` },
          },
        ],
      })
    }
    return reply.code(201).send(contact)
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org

    const existing = await db`SELECT id FROM contacts WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (existing.length === 0) return reply.code(404).send({ error: 'Not found' })

    const body = contactBody.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })
    const d = body.data

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (d.email !== undefined) updates.email = d.email
    if (d.firstName !== undefined) updates.first_name = d.firstName
    if (d.lastName !== undefined) updates.last_name = d.lastName
    if (d.phone !== undefined) updates.phone = d.phone
    if (d.jobTitle !== undefined) updates.job_title = d.jobTitle
    if (d.companyId !== undefined) updates.company_id = d.companyId
    if (d.type !== undefined) updates.type = d.type
    if (d.status !== undefined) updates.status = d.status
    if (d.source !== undefined) updates.source = d.source
    if (d.tags !== undefined) updates.tags = d.tags
    if (d.notes !== undefined) updates.notes = d.notes
    if (d.assignedTo !== undefined) updates.assigned_to = d.assignedTo
    if (d.lastContactedAt !== undefined) updates.last_contacted_at = d.lastContactedAt
    if (d.linkedinUrl !== undefined) updates.linkedin_url = d.linkedinUrl

    // Also allow snake_case keys from legacy callers
    const raw = req.body as Record<string, unknown>
    const legacyMap: Record<string, string> = {
      first_name: 'first_name', last_name: 'last_name', job_title: 'job_title',
      company_id: 'company_id', lead_score: 'lead_score', assigned_to: 'assigned_to',
      last_contacted_at: 'last_contacted_at', linked_deals: 'linked_deals',
    }
    for (const [k, col] of Object.entries(legacyMap)) {
      if (k in raw && !(col in updates)) updates[col] = raw[k]
    }

    const [updated] = await db`
      UPDATE contacts SET ${db(updates)} WHERE id = ${id} AND organization_id = ${orgId} RETURNING *
    `

    return reply.send(updated)
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org

    const result = await db`DELETE FROM contacts WHERE id = ${id} AND organization_id = ${orgId} RETURNING id`
    if (result.length === 0) return reply.code(404).send({ error: 'Not found' })

    return reply.code(204).send()
  })
}
