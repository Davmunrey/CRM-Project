import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

const ALLOWED_ENTITY_TYPES = ['contact', 'company', 'deal', 'lead'] as const
const ALLOWED_FIELD_TYPES = ['text', 'number', 'date', 'boolean', 'select', 'multiselect', 'url', 'email'] as const

const defBody = z.object({
  entityType: z.enum(ALLOWED_ENTITY_TYPES),
  label: z.string().min(1).max(100),
  fieldType: z.enum(ALLOWED_FIELD_TYPES),
  placeholder: z.string().max(200).optional(),
  required: z.boolean().default(false),
  order: z.number().min(1).max(1000).default(1),
  isActive: z.boolean().default(true),
  options: z.array(z.string().max(100)).max(100).optional(),
})

const valueBody = z.object({
  entityId: z.string().uuid(),
  fieldId: z.string().uuid(),
  value: z.union([z.string().max(5000), z.number(), z.boolean(), z.null(), z.array(z.string().max(100)).max(100)]),
})

const i18nBody = z.object({
  fieldId: z.string().uuid(),
  languageCode: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).max(5),
  label: z.string().min(1).max(100),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string().max(100)).max(100).optional(),
})

export async function customFieldsRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] }

  // Definitions
  app.get('/', auth, async (req) => {
    const orgId = req.user.org
    return db`SELECT * FROM custom_field_definitions WHERE organization_id = ${orgId} ORDER BY "order" ASC`
  })

  app.post('/', auth, async (req, reply) => {
    const body = defBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const orgId = req.user.org
    const now = new Date().toISOString()
    const [row] = await db`
      INSERT INTO custom_field_definitions (entity_type, label, field_type, placeholder, required, "order", is_active, options, organization_id, created_at, updated_at)
      VALUES (${d.entityType}, ${d.label}, ${d.fieldType}, ${d.placeholder ?? null}, ${d.required}, ${d.order}, ${d.isActive}, ${d.options ? JSON.stringify(d.options) : null}, ${orgId}, ${now}, ${now})
      RETURNING *
    `
    return reply.code(201).send(row)
  })

  app.patch('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user.org
    const body = defBody.partial().safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const now = new Date().toISOString()
    const [row] = await db`
      UPDATE custom_field_definitions SET
        label = COALESCE(${d.label ?? null}, label),
        field_type = COALESCE(${d.fieldType ?? null}, field_type),
        placeholder = COALESCE(${d.placeholder ?? null}, placeholder),
        required = COALESCE(${d.required ?? null}, required),
        "order" = COALESCE(${d.order ?? null}, "order"),
        is_active = COALESCE(${d.isActive ?? null}, is_active),
        options = COALESCE(${d.options ? JSON.stringify(d.options) : null}, options),
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
    await db`DELETE FROM custom_field_definitions WHERE id = ${id} AND organization_id = ${orgId}`
    return reply.code(204).send()
  })

  // Values
  app.get('/values', auth, async (req) => {
    const orgId = req.user.org
    return db`SELECT * FROM custom_field_values WHERE organization_id = ${orgId}`
  })

  app.put('/values', auth, async (req, reply) => {
    const body = valueBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const { entityId, fieldId, value } = body.data
    const orgId = req.user.org
    // Verify the field definition belongs to this org
    const fieldOwn = await db`SELECT 1 FROM custom_field_definitions WHERE id = ${fieldId} AND organization_id = ${orgId} LIMIT 1`
    if (fieldOwn.length === 0) return reply.code(404).send({ error: 'Field not found' })
    const [row] = await db`
      INSERT INTO custom_field_values (organization_id, entity_id, field_id, value)
      VALUES (${orgId}, ${entityId}, ${fieldId}, ${JSON.stringify(value)})
      ON CONFLICT (entity_id, field_id) DO UPDATE SET value = EXCLUDED.value
      RETURNING *
    `
    return reply.send(row)
  })

  app.delete('/values/:entityId', auth, async (req, reply) => {
    const { entityId } = req.params as { entityId: string }
    const orgId = req.user.org
    await db`DELETE FROM custom_field_values WHERE entity_id = ${entityId} AND organization_id = ${orgId}`
    return reply.code(204).send()
  })

  // i18n
  app.get('/i18n', auth, async (req) => {
    const orgId = req.user.org
    return db`SELECT * FROM custom_field_definition_i18n WHERE organization_id = ${orgId}`
  })

  app.put('/i18n', auth, async (req, reply) => {
    const body = i18nBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const { fieldId, languageCode, label, placeholder, options } = body.data
    const orgId = req.user.org
    const [row] = await db`
      INSERT INTO custom_field_definition_i18n (organization_id, field_id, language_code, label, placeholder, options)
      VALUES (${orgId}, ${fieldId}, ${languageCode}, ${label}, ${placeholder ?? null}, ${options ? JSON.stringify(options) : null})
      ON CONFLICT (field_id, language_code) DO UPDATE SET
        label = EXCLUDED.label, placeholder = EXCLUDED.placeholder, options = EXCLUDED.options
      RETURNING *
    `
    return reply.send(row)
  })
}
