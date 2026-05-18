import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

const auditBody = z.object({
  action: z.string().min(1).max(100),
  entityType: z.string().min(1).max(100),
  entityId: z.string().min(1).max(100),
  entityName: z.string().max(200).default(''),
  details: z.string().max(2000).default(''),
})

export async function auditRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] }

  // Require admin or manager role to read audit logs
  app.get('/', auth, async (req, reply) => {
    const { role, org } = req.user
    if (role !== 'admin' && role !== 'owner' && role !== 'manager') {
      return reply.code(403).send({ error: 'Insufficient permissions' })
    }
    return db`SELECT * FROM audit_log WHERE organization_id = ${org} ORDER BY created_at DESC LIMIT 500`
  })

  app.post('/', auth, async (req, reply) => {
    const body = auditBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const { action, entityType, entityId, entityName, details } = body.data
    const orgId = req.user.org
    const [row] = await db`
      INSERT INTO audit_log (action, entity_type, entity_id, entity_name, details, user_id, organization_id)
      VALUES (${action}, ${entityType}, ${entityId}, ${entityName}, ${details}, ${req.user.sub}, ${orgId})
      RETURNING *
    `
    return reply.code(201).send(row)
  })
}
