import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

const viewBody = z.object({
  entityType: z.enum(['contact', 'company', 'deal']),
  name: z.string().min(1),
  nameKey: z.string().optional().nullable(),
  filters: z.array(z.record(z.unknown())).default([]),
  sortField: z.string().optional().nullable(),
  sortDirection: z.enum(['asc', 'desc']).optional().nullable(),
  isPinned: z.boolean().default(false),
})

const inboxViewBody = z.object({
  name: z.string().min(1),
  query: z.string().default(''),
  filters: z.record(z.unknown()).default({}),
})

// postgres.js db.json() needs a specific type — cast through unknown to satisfy TS
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toJson = (v: unknown) => db.json(v as any)

export async function viewsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // ── GET /views ─────────────────────────────────────────────────────────────
  app.get('/', async (req, reply) => {
    const orgId = req.user.org
    const rows = await db`SELECT * FROM smart_views WHERE organization_id = ${orgId} ORDER BY created_at ASC`
    return reply.send({ data: rows })
  })

  // ── POST /views ────────────────────────────────────────────────────────────
  app.post('/', async (req, reply) => {
    const orgId = req.user.org
    const body = viewBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const d = body.data
    const now = new Date().toISOString()
    const [row] = await db`
      INSERT INTO smart_views (
        organization_id, entity_type, name, name_key, filters, sort_field, sort_direction, is_pinned, created_at, updated_at
      ) VALUES (
        ${orgId}, ${d.entityType}, ${d.name}, ${d.nameKey ?? null},
        ${toJson(d.filters)}, ${d.sortField ?? null}, ${d.sortDirection ?? null},
        ${d.isPinned}, ${now}, ${now}
      )
      RETURNING *
    `
    return reply.code(201).send(row)
  })

  // ── PATCH /views/:id ───────────────────────────────────────────────────────
  app.patch('/:id', async (req, reply) => {
    const orgId = req.user.org
    const { id } = req.params as { id: string }
    const body = viewBody.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const d = body.data
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (d.name !== undefined) updates.name = d.name
    if (d.nameKey !== undefined) updates.name_key = d.nameKey
    if (d.filters !== undefined) updates.filters = d.filters
    if (d.sortField !== undefined) updates.sort_field = d.sortField
    if (d.sortDirection !== undefined) updates.sort_direction = d.sortDirection
    if (d.isPinned !== undefined) updates.is_pinned = d.isPinned

    const [row] = await db`
      UPDATE smart_views SET ${db(updates)} WHERE id = ${id} AND organization_id = ${orgId} RETURNING *
    `
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })

  // ── DELETE /views/:id ──────────────────────────────────────────────────────
  app.delete('/:id', async (req, reply) => {
    const orgId = req.user.org
    const { id } = req.params as { id: string }
    const result = await db`DELETE FROM smart_views WHERE id = ${id} AND organization_id = ${orgId} RETURNING id`
    if (!result.length) return reply.code(404).send({ error: 'Not found' })
    return reply.code(204).send()
  })

  // ── Inbox views ────────────────────────────────────────────────────────────

  app.get('/inbox', async (req, reply) => {
    const orgId = req.user.org
    const rows = await db`SELECT * FROM inbox_views WHERE organization_id = ${orgId} ORDER BY created_at ASC`
    return reply.send({ data: rows })
  })

  app.post('/inbox', async (req, reply) => {
    const orgId = req.user.org
    const body = inboxViewBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const d = body.data
    const now = new Date().toISOString()
    const [row] = await db`
      INSERT INTO inbox_views (organization_id, name, query, filters, created_at, updated_at)
      VALUES (${orgId}, ${d.name}, ${d.query}, ${toJson(d.filters)}, ${now}, ${now})
      RETURNING *
    `
    return reply.code(201).send(row)
  })

  app.patch('/inbox/:id', async (req, reply) => {
    const orgId = req.user.org
    const { id } = req.params as { id: string }
    const body = inboxViewBody.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const d = body.data
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (d.name !== undefined) updates.name = d.name
    if (d.query !== undefined) updates.query = d.query
    if (d.filters !== undefined) updates.filters = d.filters

    const [row] = await db`
      UPDATE inbox_views SET ${db(updates)} WHERE id = ${id} AND organization_id = ${orgId} RETURNING *
    `
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })

  app.delete('/inbox/:id', async (req, reply) => {
    const orgId = req.user.org
    const { id } = req.params as { id: string }
    const result = await db`DELETE FROM inbox_views WHERE id = ${id} AND organization_id = ${orgId} RETURNING id`
    if (!result.length) return reply.code(404).send({ error: 'Not found' })
    return reply.code(204).send()
  })
}
