import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

const leadBody = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  source: z.string().default('website'),
  status: z.enum(['open', 'contacted', 'qualified', 'disqualified', 'converted']).default('open'),
  lifecycleStage: z.enum(['lead', 'mql', 'sql', 'opportunity', 'customer', 'evangelist']).default('lead'),
  score: z.number().min(0).max(100).default(0),
  assignedTo: z.string().optional(),
  ownerUserId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  lastEngagedAt: z.string().optional(),
  convertedContactId: z.string().optional(),
  convertedCompanyId: z.string().optional(),
  convertedDealId: z.string().optional(),
})

const leadEventBody = z.object({
  eventType: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
})

const scoringRulePatch = z.object({
  points: z.number().optional(),
  isEnabled: z.boolean().optional(),
})

export async function leadsRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] }

  // Leads CRUD
  app.get('/', auth, async (req) => {
    const orgId = req.user.org
    return db`SELECT * FROM leads WHERE organization_id = ${orgId} ORDER BY score DESC, created_at DESC`
  })

  app.post('/', auth, async (req, reply) => {
    const body = leadBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const orgId = req.user.org
    const now = new Date().toISOString()
    const [row] = await db`
      INSERT INTO leads (
        first_name, last_name, email, phone, company_name, job_title,
        source, status, lifecycle_stage, score, assigned_to, owner_user_id,
        tags, notes, last_engaged_at, converted_contact_id, converted_company_id,
        converted_deal_id, organization_id, created_at, updated_at
      ) VALUES (
        ${d.firstName}, ${d.lastName}, ${d.email}, ${d.phone ?? null}, ${d.companyName ?? null},
        ${d.jobTitle ?? null}, ${d.source}, ${d.status}, ${d.lifecycleStage}, ${d.score},
        ${d.assignedTo ?? null}, ${d.ownerUserId ?? null}, ${JSON.stringify(d.tags)}, ${d.notes ?? null},
        ${d.lastEngagedAt ?? null}, ${d.convertedContactId ?? null}, ${d.convertedCompanyId ?? null},
        ${d.convertedDealId ?? null}, ${orgId}, ${now}, ${now}
      ) RETURNING *
    `
    return reply.code(201).send(row)
  })

  app.patch('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const body = leadBody.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const now = new Date().toISOString()
    const [row] = await db`
      UPDATE leads SET
        first_name = COALESCE(${d.firstName ?? null}, first_name),
        last_name = COALESCE(${d.lastName ?? null}, last_name),
        email = COALESCE(${d.email ?? null}, email),
        phone = COALESCE(${d.phone ?? null}, phone),
        company_name = COALESCE(${d.companyName ?? null}, company_name),
        job_title = COALESCE(${d.jobTitle ?? null}, job_title),
        source = COALESCE(${d.source ?? null}, source),
        status = COALESCE(${d.status ?? null}, status),
        lifecycle_stage = COALESCE(${d.lifecycleStage ?? null}, lifecycle_stage),
        score = COALESCE(${d.score ?? null}, score),
        assigned_to = COALESCE(${d.assignedTo ?? null}, assigned_to),
        owner_user_id = COALESCE(${d.ownerUserId ?? null}, owner_user_id),
        tags = COALESCE(${d.tags ? JSON.stringify(d.tags) : null}, tags),
        notes = COALESCE(${d.notes ?? null}, notes),
        last_engaged_at = COALESCE(${d.lastEngagedAt ?? null}, last_engaged_at),
        converted_contact_id = COALESCE(${d.convertedContactId ?? null}, converted_contact_id),
        converted_company_id = COALESCE(${d.convertedCompanyId ?? null}, converted_company_id),
        converted_deal_id = COALESCE(${d.convertedDealId ?? null}, converted_deal_id),
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
    await db`DELETE FROM leads WHERE id = ${id} AND organization_id = ${orgId}`
    return reply.code(204).send()
  })

  // Lead events
  app.get('/:id/events', auth, async (req) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    return db`
      SELECT id, event_type, metadata, created_at FROM lead_events
      WHERE lead_id = ${id} AND organization_id = ${orgId}
      ORDER BY created_at DESC
    `
  })

  app.post('/:id/events', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const body = leadEventBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const owns = await db`SELECT 1 FROM leads WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (owns.length === 0) return reply.code(404).send({ error: 'Not found' })
    const { eventType, metadata } = body.data
    const [row] = await db`
      INSERT INTO lead_events (organization_id, lead_id, event_type, metadata)
      VALUES (${orgId}, ${id}, ${eventType}, ${JSON.stringify(metadata)})
      RETURNING id, event_type, metadata, created_at
    `
    return reply.code(201).send(row)
  })

  // Score snapshots
  app.get('/:id/score-snapshots', auth, async (req) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    return db`
      SELECT score, reason, created_at FROM lead_score_snapshots
      WHERE lead_id = ${id} AND organization_id = ${orgId}
      ORDER BY created_at ASC LIMIT 30
    `
  })

  app.post('/:id/score-snapshots', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const body = z.object({ score: z.number(), reason: z.string() }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const owns = await db`SELECT 1 FROM leads WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (owns.length === 0) return reply.code(404).send({ error: 'Not found' })
    const [row] = await db`
      INSERT INTO lead_score_snapshots (organization_id, lead_id, score, reason)
      VALUES (${orgId}, ${id}, ${body.data.score}, ${body.data.reason})
      RETURNING *
    `
    return reply.code(201).send(row)
  })

  // Scoring rules
  app.get('/scoring-rules', auth, async (req) => {
    const orgId = req.user.org
    return db`SELECT id, key, points, is_enabled FROM lead_scoring_rules WHERE organization_id = ${orgId} ORDER BY key`
  })

  app.patch('/scoring-rules/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const body = scoringRulePatch.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const [row] = await db`
      UPDATE lead_scoring_rules SET
        points = COALESCE(${d.points ?? null}, points),
        is_enabled = COALESCE(${d.isEnabled ?? null}, is_enabled)
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING *
    `
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })
}
