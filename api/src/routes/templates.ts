import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

const templateBody = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string(),
  // Union of the legacy backend categories and the frontend's category set so
  // templates created from the UI ('intro'/'closing'/'nurture'/'custom') persist
  // while existing rows ('outreach'/'onboarding'/'general') stay valid (migration 027).
  category: z
    .enum(['outreach', 'follow_up', 'proposal', 'onboarding', 'general', 'intro', 'closing', 'nurture', 'custom'])
    .default('general'),
  variables: z.array(z.string()).default([]),
})

const quickReplyBody = z.object({
  title: z.string().min(1),
  body: z.string(),
})

export async function templatesRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] }

  // Email templates
  app.get('/', auth, async (req) => {
    const orgId = req.user.org
    return db`SELECT * FROM email_templates WHERE organization_id = ${orgId} ORDER BY created_at DESC`
  })

  app.post('/', auth, async (req, reply) => {
    const body = templateBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const { name, subject, body: tmplBody, category, variables } = body.data
    const orgId = req.user.org
    const now = new Date().toISOString()
    const [row] = await db`
      INSERT INTO email_templates (name, subject, body, category, variables, usage_count, organization_id, created_at, updated_at)
      VALUES (${name}, ${subject}, ${tmplBody}, ${category}, ${variables}, 0, ${orgId}, ${now}, ${now})
      RETURNING *
    `
    return reply.code(201).send(row)
  })

  app.get('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const rows = await db`SELECT * FROM email_templates WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (rows.length === 0) return reply.code(404).send({ error: 'Not found' })
    return reply.send(rows[0])
  })

  app.patch('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const body = templateBody.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const now = new Date().toISOString()
    const [row] = await db`
      UPDATE email_templates SET
        name = COALESCE(${d.name ?? null}, name),
        subject = COALESCE(${d.subject ?? null}, subject),
        body = COALESCE(${d.body ?? null}, body),
        category = COALESCE(${d.category ?? null}, category),
        variables = COALESCE(${d.variables ?? null}, variables),
        updated_at = ${now}
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING *
    `
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })

  app.post('/:id/increment-usage', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const rows = await db`
      UPDATE email_templates SET usage_count = usage_count + 1 WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING id
    `
    if (rows.length === 0) return reply.code(404).send({ error: 'Not found' })
    return reply.send({ ok: true })
  })

  app.delete('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    await db`DELETE FROM email_templates WHERE id = ${id} AND organization_id = ${orgId}`
    return reply.code(204).send()
  })

  // Quick replies
  app.get('/quick-replies', auth, async (req) => {
    const orgId = req.user.org
    return db`SELECT * FROM quick_replies WHERE organization_id = ${orgId} ORDER BY updated_at DESC`
  })

  app.post('/quick-replies', auth, async (req, reply) => {
    const body = quickReplyBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const { title, body: replyBody } = body.data
    const orgId = req.user.org
    const userId = req.user.sub
    const now = new Date().toISOString()
    const [row] = await db`
      INSERT INTO quick_replies (title, body, user_id, organization_id, created_at, updated_at)
      VALUES (${title}, ${replyBody}, ${userId}, ${orgId}, ${now}, ${now})
      RETURNING *
    `
    return reply.code(201).send(row)
  })

  app.get('/quick-replies/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const rows = await db`SELECT * FROM quick_replies WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (rows.length === 0) return reply.code(404).send({ error: 'Not found' })
    return reply.send(rows[0])
  })

  app.patch('/quick-replies/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const body = quickReplyBody.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const now = new Date().toISOString()
    const [row] = await db`
      UPDATE quick_replies SET
        title = COALESCE(${d.title ?? null}, title),
        body = COALESCE(${d.body ?? null}, body),
        updated_at = ${now}
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING *
    `
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })

  app.delete('/quick-replies/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    await db`DELETE FROM quick_replies WHERE id = ${id} AND organization_id = ${orgId}`
    return reply.code(204).send()
  })
}
