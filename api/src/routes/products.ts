import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

const productBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().min(0),
  currency: z.string().default('EUR'),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
})

export async function productsRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] }

  app.get('/', auth, async (req) => {
    const orgId = req.user.org
    return db`SELECT * FROM products WHERE organization_id = ${orgId} ORDER BY created_at DESC`
  })

  app.post('/', auth, async (req, reply) => {
    const body = productBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const { name, description, sku, price, currency, category, isActive } = body.data
    const orgId = req.user.org
    const now = new Date().toISOString()
    const [row] = await db`
      INSERT INTO products (name, description, sku, price, currency, category, is_active, organization_id, created_at, updated_at)
      VALUES (${name}, ${description ?? null}, ${sku ?? null}, ${price}, ${currency},
              ${category ?? null}, ${isActive}, ${orgId}, ${now}, ${now})
      RETURNING *
    `
    return reply.code(201).send(row)
  })

  app.get('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const rows = await db`SELECT * FROM products WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (rows.length === 0) return reply.code(404).send({ error: 'Not found' })
    return reply.send(rows[0])
  })

  app.patch('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const body = productBody.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const now = new Date().toISOString()
    const [row] = await db`
      UPDATE products SET
        name = COALESCE(${d.name ?? null}, name),
        description = COALESCE(${d.description ?? null}, description),
        sku = COALESCE(${d.sku ?? null}, sku),
        price = COALESCE(${d.price ?? null}, price),
        currency = COALESCE(${d.currency ?? null}, currency),
        category = COALESCE(${d.category ?? null}, category),
        is_active = COALESCE(${d.isActive ?? null}, is_active),
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
    await db`DELETE FROM products WHERE id = ${id} AND organization_id = ${orgId}`
    return reply.code(204).send()
  })
}
