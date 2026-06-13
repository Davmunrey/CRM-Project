import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { sendSlackNotification } from './slack.js'
import { checkPlanLimit } from './billing.js'
import { requireCrudPermission } from '../middleware/rbac.js'

/**
 * Verify a foreign-key id belongs to the caller's org before linking it to a
 * deal. Prevents cross-tenant FK injection (linking a deal to another org's
 * contact/company/pipeline/user, which would leak the joined fields).
 * The table name is a hard-coded literal, never user input.
 */
async function ownedInOrg(
  table: 'contacts' | 'companies' | 'pipelines' | 'users',
  id: string,
  orgId: string,
): Promise<boolean> {
  const rows = await db.unsafe(
    `SELECT 1 FROM ${table} WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, orgId],
  )
  return rows.length > 0
}

export async function dealsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)
  app.addHook('preHandler', requireCrudPermission('deals'))

  app.get('/', async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const orgId = req.user.org
    const parsed = z.object({
      limit: z.coerce.number().default(100),
      offset: z.coerce.number().default(0),
      pipelineId: z.string().uuid().optional(),
    }).safeParse(req.query)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid query' })
    const q = parsed.data

    const rows = q.pipelineId
      ? await db`
          SELECT d.*, c.first_name, c.last_name, c.email
          FROM deals d
          LEFT JOIN contacts c ON c.id = d.contact_id
          WHERE d.organization_id = ${orgId} AND d.pipeline_id = ${q.pipelineId}
          ORDER BY d.created_at DESC
          LIMIT ${q.limit} OFFSET ${q.offset}
        `
      : await db`
          SELECT d.*, c.first_name, c.last_name, c.email
          FROM deals d
          LEFT JOIN contacts c ON c.id = d.contact_id
          WHERE d.organization_id = ${orgId}
          ORDER BY d.created_at DESC
          LIMIT ${q.limit} OFFSET ${q.offset}
        `
    return reply.send({ data: rows })
  })

  app.post('/', async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const body = z.object({
      title: z.string().min(1),
      value: z.number().min(0).default(0),
      currency: z.string().length(3).default('EUR'),
      stage: z.string().optional(),
      pipelineId: z.string().uuid().optional(),
      contactId: z.string().uuid().optional(),
      companyId: z.string().uuid().optional(),
      expectedCloseDate: z.string().optional(),
      description: z.string().optional().nullable(),
    }).safeParse(req.body)

    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const orgId = req.user.org

    // Reject FKs that don't belong to this org (cross-tenant link injection).
    if (body.data.contactId && !(await ownedInOrg('contacts', body.data.contactId, orgId)))
      return reply.code(400).send({ error: 'Invalid contactId' })
    if (body.data.companyId && !(await ownedInOrg('companies', body.data.companyId, orgId)))
      return reply.code(400).send({ error: 'Invalid companyId' })
    if (body.data.pipelineId && !(await ownedInOrg('pipelines', body.data.pipelineId, orgId)))
      return reply.code(400).send({ error: 'Invalid pipelineId' })

    const dealLimit = await checkPlanLimit(orgId, 'deals')
    if (!dealLimit.allowed) {
      return reply.code(402).send({ error: 'Deal limit reached', limit: dealLimit.limit, current: dealLimit.current })
    }

    // Resolve stage: use provided, or first stage of the pipeline, or 'Prospecting'
    let stage = body.data.stage
    if (!stage && body.data.pipelineId) {
      const pipelineStages = await db`
        SELECT stages FROM pipelines WHERE id = ${body.data.pipelineId} AND organization_id = ${orgId} LIMIT 1
      `
      const stages = pipelineStages[0]?.stages as { name: string }[] | undefined
      stage = stages?.[0]?.name ?? 'Prospecting'
    }
    stage ??= 'Prospecting'

    const [deal] = await db`
      INSERT INTO deals (
        title, value, currency, stage, pipeline_id, contact_id, company_id,
        expected_close_date, organization_id, owner_id
      ) VALUES (
        ${body.data.title}, ${body.data.value}, ${body.data.currency},
        ${stage}, ${body.data.pipelineId ?? null},
        ${body.data.contactId ?? null}, ${body.data.companyId ?? null},
        ${body.data.expectedCloseDate ?? null}, ${orgId}, ${req.user.sub}
      )
      RETURNING *
    `
    if (deal) {
      void sendSlackNotification(orgId, {
        text: `:handshake: *New Deal:* ${deal['title']} — ${deal['currency'] ?? 'EUR'} ${deal['value'] ?? 0}`,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `:handshake: *New Deal Created*\n*${deal['title']}*\nValue: ${deal['currency'] ?? 'EUR'} ${deal['value'] ?? 0} | Stage: ${deal['stage']}` },
          },
        ],
      })
    }
    return reply.code(201).send(deal)
  })

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const rows = await db`
      SELECT d.*, c.first_name, c.last_name, c.email
      FROM deals d
      LEFT JOIN contacts c ON c.id = d.contact_id
      WHERE d.id = ${id} AND d.organization_id = ${orgId} LIMIT 1
    `
    if (rows.length === 0) return reply.code(404).send({ error: 'Not found' })
    return reply.send(rows[0])
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org

    const existing = await db`SELECT id FROM deals WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (existing.length === 0) return reply.code(404).send({ error: 'Not found' })

    const body = z.object({
      title: z.string().min(1).optional(),
      value: z.number().min(0).optional(),
      currency: z.string().length(3).optional(),
      stage: z.string().optional(),
      pipelineId: z.string().uuid().nullable().optional(),
      contactId: z.string().uuid().nullable().optional(),
      companyId: z.string().uuid().nullable().optional(),
      assignedTo: z.string().max(200).nullable().optional(), // owner display name, not a user-id FK (migration 028)
      expectedCloseDate: z.string().nullable().optional(),
      status: z.enum(['open', 'won', 'lost']).optional(),
      notes: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      quoteItems: z.array(z.unknown()).optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })

    const d = body.data

    // Reject FKs that don't belong to this org (cross-tenant link injection).
    if (d.contactId && !(await ownedInOrg('contacts', d.contactId, orgId)))
      return reply.code(400).send({ error: 'Invalid contactId' })
    if (d.companyId && !(await ownedInOrg('companies', d.companyId, orgId)))
      return reply.code(400).send({ error: 'Invalid companyId' })
    if (d.pipelineId && !(await ownedInOrg('pipelines', d.pipelineId, orgId)))
      return reply.code(400).send({ error: 'Invalid pipelineId' })
    // assignedTo is a display-name string (not a user-id FK), so there is no
    // cross-org reference to validate here — see migration 028.

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (d.title !== undefined) updates.title = d.title
    if (d.value !== undefined) updates.value = d.value
    if (d.currency !== undefined) updates.currency = d.currency
    if (d.stage !== undefined) {
      updates.stage = d.stage
      // Keep status in sync with terminal stages
      if (d.stage === 'closed_won') updates.status = 'won'
      else if (d.stage === 'closed_lost') updates.status = 'lost'
      else if (d.status === undefined) updates.status = 'open'
    }
    if (d.pipelineId !== undefined) updates.pipeline_id = d.pipelineId
    if (d.contactId !== undefined) updates.contact_id = d.contactId
    if (d.companyId !== undefined) updates.company_id = d.companyId
    if (d.assignedTo !== undefined) updates.assigned_to = d.assignedTo
    if (d.expectedCloseDate !== undefined) updates.expected_close_date = d.expectedCloseDate
    if (d.status !== undefined) updates.status = d.status
    if (d.notes !== undefined) updates.notes = d.notes
    if (d.tags !== undefined) updates.tags = d.tags
    if (d.quoteItems !== undefined) updates.quote_items = db.json(d.quoteItems as Parameters<typeof db.json>[0])

    const [updated] = await db`UPDATE deals SET ${db(updates)} WHERE id = ${id} AND organization_id = ${orgId} RETURNING *`
    return reply.send(updated)
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const result = await db`DELETE FROM deals WHERE id = ${id} AND organization_id = ${req.user.org} RETURNING id`
    if (result.length === 0) return reply.code(404).send({ error: 'Not found' })
    return reply.code(204).send()
  })
}
