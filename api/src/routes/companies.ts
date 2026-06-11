import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { requireCrudPermission } from '../middleware/rbac.js'

export async function companiesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)
  app.addHook('preHandler', requireCrudPermission('companies'))

  app.get('/', async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const orgId = req.user.org
    const parsed = z.object({
      limit: z.coerce.number().default(100),
      offset: z.coerce.number().default(0),
      search: z.string().optional(),
      industry: z.string().optional(),
      status: z.string().optional(),
    }).safeParse(req.query)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid query' })
    const q = parsed.data

    const rows = await db`
      SELECT id, name, domain, industry, size, website, city, country,
             phone, status, tags, notes, revenue, created_at, updated_at
      FROM companies
      WHERE organization_id = ${orgId}
        ${q.search ? db`AND name ILIKE ${'%' + q.search + '%'}` : db``}
        ${q.industry ? db`AND industry = ${q.industry}` : db``}
        ${q.status ? db`AND status = ${q.status}` : db``}
      ORDER BY name ASC
      LIMIT ${q.limit} OFFSET ${q.offset}
    `
    return reply.send({ data: rows })
  })

  app.post('/', async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const body = z.object({
      name: z.string().min(1),
      domain: z.string().optional().nullable(),
      industry: z.string().optional().nullable(),
      website: z.string().url().optional().nullable(),
      size: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      country: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      tags: z.array(z.string()).optional(),
      status: z.enum(['prospect', 'customer', 'churned', 'partner']).optional(),
    }).safeParse(req.body)

    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const orgId = req.user.org

    const [company] = await db`
      INSERT INTO companies (
        name, domain, industry, website, size, phone, city, country,
        notes, tags, status, organization_id
      ) VALUES (
        ${d.name}, ${d.domain ?? null}, ${d.industry ?? null}, ${d.website ?? null},
        ${d.size ?? null}, ${d.phone ?? null}, ${d.city ?? null}, ${d.country ?? null},
        ${d.notes ?? null}, ${d.tags ?? []}, ${d.status ?? 'prospect'}, ${orgId}
      )
      RETURNING *
    `
    return reply.code(201).send(company)
  })

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const rows = await db`
      SELECT id, name, domain, industry, size, website, phone, city, country,
             revenue, status, notes, tags, created_at, updated_at
      FROM companies WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1
    `
    if (rows.length === 0) return reply.code(404).send({ error: 'Not found' })
    return reply.send(rows[0])
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const body = z.object({
      name: z.string().min(1).optional(),
      domain: z.string().optional().nullable(),
      industry: z.string().optional().nullable(),
      website: z.string().url().optional().nullable(),
      size: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      country: z.string().optional().nullable(),
      revenue: z.number().optional().nullable(),
      status: z.enum(['prospect', 'customer', 'churned', 'partner']).optional(),
      notes: z.string().optional().nullable(),
      tags: z.array(z.string()).optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data

    // Build dynamic SET using postgres.js object helper (handles arrays natively)
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (d.name !== undefined) updates.name = d.name
    if (d.domain !== undefined) updates.domain = d.domain
    if (d.industry !== undefined) updates.industry = d.industry
    if (d.website !== undefined) updates.website = d.website
    if (d.size !== undefined) updates.size = d.size
    if (d.phone !== undefined) updates.phone = d.phone
    if (d.city !== undefined) updates.city = d.city
    if (d.country !== undefined) updates.country = d.country
    if (d.revenue !== undefined) updates.revenue = d.revenue
    if (d.status !== undefined) updates.status = d.status
    if (d.notes !== undefined) updates.notes = d.notes
    if (d.tags !== undefined) updates.tags = d.tags

    const [row] = await db`
      UPDATE companies SET ${db(updates)}
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING *
    `
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const result = await db`DELETE FROM companies WHERE id = ${id} AND organization_id = ${req.user.org} RETURNING id`
    if (result.length === 0) return reply.code(404).send({ error: 'Not found' })
    return reply.code(204).send()
  })
}
