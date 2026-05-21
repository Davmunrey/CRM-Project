import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

const ADMIN_ROLES = new Set(['owner', 'admin', 'manager'])

const stageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().default('#6366f1'),
  order: z.number().int().min(0),
  probability: z.number().min(0).max(100).default(0),
})

const defaultStages = [
  { id: 'lead', name: 'Lead', color: '#6366f1', order: 0, probability: 10 },
  { id: 'qualified', name: 'Qualified', color: '#8b5cf6', order: 1, probability: 25 },
  { id: 'proposal', name: 'Proposal', color: '#f59e0b', order: 2, probability: 50 },
  { id: 'negotiation', name: 'Negotiation', color: '#f97316', order: 3, probability: 75 },
  { id: 'won', name: 'Won', color: '#10b981', order: 4, probability: 100 },
  { id: 'lost', name: 'Lost', color: '#ef4444', order: 5, probability: 0 },
]

/** Returns true when the user can access a pipeline (ignores archive for member check). */
async function canAccess(pipelineId: string, userId: string, userRole: string, orgId: string): Promise<boolean> {
  const rows = await db`
    SELECT view_access, organization_id FROM pipelines WHERE id = ${pipelineId} LIMIT 1
  `
  if (rows.length === 0) return false
  const p = rows[0]!
  if (p.organization_id !== orgId) return false
  if (p.view_access === 'all' || ADMIN_ROLES.has(userRole)) return true
  const membership = await db`
    SELECT 1 FROM pipeline_members WHERE pipeline_id = ${pipelineId} AND user_id = ${userId} LIMIT 1
  `
  return membership.length > 0
}

export async function pipelinesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // GET /pipelines — list accessible pipelines for org
  app.get('/', async (req, reply) => {
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })

    // Auto-create default pipeline if org has none
    const existing = await db`SELECT id FROM pipelines WHERE organization_id = ${orgId} AND is_archived = false LIMIT 1`
    if (existing.length === 0) {
      const now = new Date().toISOString()
      await db`
        INSERT INTO pipelines (organization_id, name, is_default, stages, created_by, created_at, updated_at)
        VALUES (${orgId}, 'Sales', true, ${db.json(defaultStages)}, ${req.user.sub}, ${now}, ${now})
      `
    }

    const isAdmin = ADMIN_ROLES.has(req.user.role)

    let rows
    if (isAdmin) {
      rows = await db`
        SELECT p.*, COUNT(pm.user_id)::int AS member_count
        FROM pipelines p
        LEFT JOIN pipeline_members pm ON pm.pipeline_id = p.id
        WHERE p.organization_id = ${orgId} AND p.is_archived = false
        GROUP BY p.id
        ORDER BY p.is_default DESC, p.created_at ASC
      `
    } else {
      rows = await db`
        SELECT p.*, COUNT(pm2.user_id)::int AS member_count
        FROM pipelines p
        LEFT JOIN pipeline_members pm ON pm.pipeline_id = p.id AND pm.user_id = ${req.user.sub}
        LEFT JOIN pipeline_members pm2 ON pm2.pipeline_id = p.id
        WHERE p.organization_id = ${orgId}
          AND p.is_archived = false
          AND (p.view_access = 'all' OR pm.user_id IS NOT NULL)
        GROUP BY p.id
        ORDER BY p.is_default DESC, p.created_at ASC
      `
    }

    return reply.send({ data: rows })
  })

  // POST /pipelines — admin/manager only
  app.post('/', async (req, reply) => {
    if (!ADMIN_ROLES.has(req.user.role)) return reply.code(403).send({ error: 'Forbidden' })
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })

    const body = z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      stages: z.array(stageSchema).min(1).optional(),
      view_access: z.enum(['all', 'members_only']).default('all'),
      is_default: z.boolean().optional(),
    }).safeParse(req.body)

    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })

    const { name, description, stages, view_access, is_default } = body.data
    const now = new Date().toISOString()

    // If marking as default, unset existing default first
    if (is_default) {
      await db`
        UPDATE pipelines SET is_default = false, updated_at = ${now}
        WHERE organization_id = ${orgId} AND is_default = true
      `
    }

    const [pipeline] = await db`
      INSERT INTO pipelines (organization_id, name, description, is_default, stages, view_access, created_by, created_at, updated_at)
      VALUES (
        ${orgId}, ${name}, ${description ?? null},
        ${is_default ?? false}, ${db.json(stages ?? defaultStages)},
        ${view_access}, ${req.user.sub}, ${now}, ${now}
      )
      RETURNING *
    `

    return reply.code(201).send(pipeline)
  })

  // GET /pipelines/:id
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    if (!(await canAccess(id, req.user.sub, req.user.role, req.user.org))) {
      return reply.code(404).send({ error: 'Not found' })
    }
    const rows = await db`SELECT * FROM pipelines WHERE id = ${id} LIMIT 1`
    return reply.send(rows[0])
  })

  // PATCH /pipelines/:id — admin/manager only
  app.patch('/:id', async (req, reply) => {
    if (!ADMIN_ROLES.has(req.user.role)) return reply.code(403).send({ error: 'Forbidden' })
    const { id } = req.params as { id: string }
    const orgId = req.user.org

    const existing = await db`SELECT id FROM pipelines WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (existing.length === 0) return reply.code(404).send({ error: 'Not found' })

    const body = z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      stages: z.array(stageSchema).min(1).optional(),
      view_access: z.enum(['all', 'members_only']).optional(),
      is_default: z.boolean().optional(),
    }).safeParse(req.body)

    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })

    const now = new Date().toISOString()

    if (body.data.is_default) {
      await db`
        UPDATE pipelines SET is_default = false, updated_at = ${now}
        WHERE organization_id = ${orgId} AND is_default = true AND id != ${id}
      `
    }

    const updates: Record<string, unknown> = { updated_at: now }
    if (body.data.name !== undefined) updates.name = body.data.name
    if (body.data.description !== undefined) updates.description = body.data.description
    if (body.data.stages !== undefined) updates.stages = db.json(body.data.stages)
    if (body.data.view_access !== undefined) updates.view_access = body.data.view_access
    if (body.data.is_default !== undefined) updates.is_default = body.data.is_default

    const [updated] = await db`UPDATE pipelines SET ${db(updates)} WHERE id = ${id} RETURNING *`
    return reply.send(updated)
  })

  // DELETE /pipelines/:id — archive (soft delete), admin/manager only
  app.delete('/:id', async (req, reply) => {
    if (!ADMIN_ROLES.has(req.user.role)) return reply.code(403).send({ error: 'Forbidden' })
    const { id } = req.params as { id: string }
    const orgId = req.user.org

    const rows = await db`SELECT id, is_default FROM pipelines WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (rows.length === 0) return reply.code(404).send({ error: 'Not found' })
    if (rows[0]!.is_default) return reply.code(400).send({ error: 'Cannot archive the default pipeline' })

    await db`UPDATE pipelines SET is_archived = true, updated_at = ${new Date().toISOString()} WHERE id = ${id}`
    return reply.code(204).send()
  })

  // POST /pipelines/:id/members — add member
  app.post('/:id/members', async (req, reply) => {
    if (!ADMIN_ROLES.has(req.user.role)) return reply.code(403).send({ error: 'Forbidden' })
    const { id } = req.params as { id: string }
    const orgId = req.user.org

    const pipelineRows = await db`SELECT id FROM pipelines WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (pipelineRows.length === 0) return reply.code(404).send({ error: 'Not found' })

    const body = z.object({
      userId: z.string().uuid(),
      role: z.enum(['owner', 'member']).default('member'),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    // Verify user belongs to org
    const userRows = await db`SELECT id FROM users WHERE id = ${body.data.userId} AND organization_id = ${orgId} LIMIT 1`
    if (userRows.length === 0) return reply.code(400).send({ error: 'User not in organization' })

    await db`
      INSERT INTO pipeline_members (pipeline_id, user_id, role)
      VALUES (${id}, ${body.data.userId}, ${body.data.role})
      ON CONFLICT (pipeline_id, user_id) DO UPDATE SET role = EXCLUDED.role
    `
    return reply.code(201).send({ pipelineId: id, userId: body.data.userId, role: body.data.role })
  })

  // DELETE /pipelines/:id/members/:userId — remove member
  app.delete('/:id/members/:userId', async (req, reply) => {
    if (!ADMIN_ROLES.has(req.user.role)) return reply.code(403).send({ error: 'Forbidden' })
    const { id, userId } = req.params as { id: string; userId: string }
    const orgId = req.user.org

    const pipelineRows = await db`SELECT id FROM pipelines WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (pipelineRows.length === 0) return reply.code(404).send({ error: 'Not found' })

    await db`DELETE FROM pipeline_members WHERE pipeline_id = ${id} AND user_id = ${userId}`
    return reply.code(204).send()
  })
}
