import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

const listBody = z.object({
  name: z.string().min(1),
  entityType: z.enum(['contact', 'company']),
  memberIds: z.array(z.string().uuid()).default([]),
})

export async function distributionListsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // ── GET /distribution-lists ────────────────────────────────────────────────
  app.get('/', async (req, reply) => {
    const orgId = req.user.org
    const rows = await db`SELECT * FROM distribution_lists WHERE organization_id = ${orgId} ORDER BY created_at ASC`
    return reply.send({ data: rows })
  })

  // ── POST /distribution-lists ───────────────────────────────────────────────
  app.post('/', async (req, reply) => {
    const orgId = req.user.org
    const body = listBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const d = body.data
    const now = new Date().toISOString()
    const [row] = await db`
      INSERT INTO distribution_lists (organization_id, name, entity_type, member_ids, created_at, updated_at)
      VALUES (${orgId}, ${d.name}, ${d.entityType}, ${d.memberIds}, ${now}, ${now})
      RETURNING *
    `
    return reply.code(201).send(row)
  })

  // ── PATCH /distribution-lists/:id ─────────────────────────────────────────
  app.patch('/:id', async (req, reply) => {
    const orgId = req.user.org
    const { id } = req.params as { id: string }
    const body = z.object({
      name: z.string().min(1).optional(),
      memberIds: z.array(z.string().uuid()).optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const d = body.data
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (d.name !== undefined) updates.name = d.name
    if (d.memberIds !== undefined) updates.member_ids = d.memberIds

    const [row] = await db`
      UPDATE distribution_lists SET ${db(updates)} WHERE id = ${id} AND organization_id = ${orgId} RETURNING *
    `
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })

  // ── DELETE /distribution-lists/:id ────────────────────────────────────────
  app.delete('/:id', async (req, reply) => {
    const orgId = req.user.org
    const { id } = req.params as { id: string }
    const result = await db`DELETE FROM distribution_lists WHERE id = ${id} AND organization_id = ${orgId} RETURNING id`
    if (!result.length) return reply.code(404).send({ error: 'Not found' })
    return reply.code(204).send()
  })
}
