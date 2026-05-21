import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

const sequenceBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  steps: z.array(z.record(z.unknown())).max(100).default([]),
  flowDefinition: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(true),
  enrolledCount: z.number().default(0),
  stopOnContactReply: z.boolean().default(true),
  enrollmentStartDelayDays: z.number().min(0).max(365).default(0),
})

const enrollmentBody = z.object({
  sequenceId: z.string(),
  contactId: z.string(),
  contactName: z.string(),
  currentStep: z.number().default(0),
  currentNodeId: z.string().nullable().optional(),
  abVariant: z.enum(['a', 'b']).nullable().optional(),
  status: z.enum(['active', 'paused', 'completed', 'unenrolled', 'replied']).default('active'),
  enrolledAt: z.string().optional(),
  nextStepAt: z.string().optional(),
})

export async function sequencesRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] }

  // Sequences
  app.get('/', auth, async (req) => {
    const orgId = req.user.org
    return db`SELECT * FROM email_sequences WHERE organization_id = ${orgId} ORDER BY created_at DESC`
  })

  app.post('/', auth, async (req, reply) => {
    const body = sequenceBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const orgId = req.user.org
    const now = new Date().toISOString()
    const [row] = await db`
      INSERT INTO email_sequences (
        name, description, steps, flow_definition, created_by, is_active,
        enrolled_count, stop_on_contact_reply, enrollment_start_delay_days,
        organization_id, created_at
      ) VALUES (
        ${d.name}, ${d.description}, ${JSON.stringify(d.steps)},
        ${d.flowDefinition ? JSON.stringify(d.flowDefinition) : null},
        ${req.user.sub}, ${d.isActive}, ${d.enrolledCount},
        ${d.stopOnContactReply}, ${d.enrollmentStartDelayDays}, ${orgId}, ${now}
      ) RETURNING *
    `
    return reply.code(201).send(row)
  })

  app.patch('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const body = sequenceBody.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const [row] = await db`
      UPDATE email_sequences SET
        name = COALESCE(${d.name ?? null}, name),
        description = COALESCE(${d.description ?? null}, description),
        steps = COALESCE(${d.steps ? JSON.stringify(d.steps) : null}, steps),
        flow_definition = COALESCE(${d.flowDefinition ? JSON.stringify(d.flowDefinition) : null}, flow_definition),
        is_active = COALESCE(${d.isActive ?? null}, is_active),
        enrolled_count = COALESCE(${d.enrolledCount ?? null}, enrolled_count),
        stop_on_contact_reply = COALESCE(${d.stopOnContactReply ?? null}, stop_on_contact_reply),
        enrollment_start_delay_days = COALESCE(${d.enrollmentStartDelayDays ?? null}, enrollment_start_delay_days)
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING *
    `
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })

  app.delete('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    await db`DELETE FROM email_sequences WHERE id = ${id} AND organization_id = ${orgId}`
    return reply.code(204).send()
  })

  // Enrollments
  app.get('/enrollments', auth, async (req) => {
    const orgId = req.user.org
    return db`SELECT * FROM sequence_enrollments WHERE organization_id = ${orgId} ORDER BY enrolled_at DESC`
  })

  app.post('/enrollments', auth, async (req, reply) => {
    const body = enrollmentBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const orgId = req.user.org
    // Verify both the sequence and contact belong to this org
    const [seqOwn, contactOwn] = await Promise.all([
      db`SELECT 1 FROM email_sequences WHERE id = ${d.sequenceId} AND organization_id = ${orgId} LIMIT 1`,
      db`SELECT 1 FROM contacts WHERE id = ${d.contactId} AND organization_id = ${orgId} LIMIT 1`,
    ])
    if (seqOwn.length === 0) return reply.code(404).send({ error: 'Sequence not found' })
    if (contactOwn.length === 0) return reply.code(404).send({ error: 'Contact not found' })
    const now = new Date().toISOString()
    const [row] = await db`
      INSERT INTO sequence_enrollments (
        sequence_id, contact_id, contact_name, current_step, current_node_id,
        ab_variant, status, enrolled_at, next_step_at, organization_id
      ) VALUES (
        ${d.sequenceId}, ${d.contactId}, ${d.contactName}, ${d.currentStep},
        ${d.currentNodeId ?? null}, ${d.abVariant ?? null}, ${d.status},
        ${d.enrolledAt ?? now}, ${d.nextStepAt ?? null}, ${orgId}
      ) RETURNING *
    `
    return reply.code(201).send(row)
  })

  app.patch('/enrollments/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const body = z.object({
      status: z.enum(['active', 'paused', 'completed', 'unenrolled', 'replied']).optional(),
      currentStep: z.number().optional(),
      currentNodeId: z.string().nullable().optional(),
      nextStepAt: z.string().nullable().optional(),
      completedAt: z.string().nullable().optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const [row] = await db`
      UPDATE sequence_enrollments SET
        status = COALESCE(${d.status ?? null}, status),
        current_step = COALESCE(${d.currentStep ?? null}, current_step),
        current_node_id = COALESCE(${d.currentNodeId ?? null}, current_node_id),
        next_step_at = COALESCE(${d.nextStepAt ?? null}, next_step_at),
        completed_at = COALESCE(${d.completedAt ?? null}, completed_at)
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING *
    `
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })

  app.delete('/enrollments/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    await db`DELETE FROM sequence_enrollments WHERE id = ${id} AND organization_id = ${orgId}`
    return reply.code(204).send()
  })
}
