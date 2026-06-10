import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { db } from '../db/client.js'

const leadBody = z.object({
  email: z.string().email().max(254),
  firstName: z.string().max(100).optional(),
  first_name: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
})

async function verifyApiKey(_app: FastifyInstance) {
  return async function (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) {
    const apiKey = req.headers['x-api-key'] as string | undefined
    if (!apiKey) return reply.code(401).send({ error: 'API key required' })

    const keyHash = createHash('sha256').update(apiKey).digest('hex')
    const rows = await db`
      SELECT k.organization_id, k.scopes
      FROM api_keys k
      WHERE k.key_hash = ${keyHash}
        AND k.revoked_at IS NULL
        AND (k.expires_at IS NULL OR k.expires_at > NOW())
      LIMIT 1
    `

    if (rows.length === 0) return reply.code(401).send({ error: 'Invalid API key' })

    ;(req as import('fastify').FastifyRequest & { apiKeyOrg: string }).apiKeyOrg = rows[0]!.organizationId as string
  }
}

export async function publicApiRoutes(app: FastifyInstance) {
  const apiKeyAuth = await verifyApiKey(app)

  app.addHook('onRequest', apiKeyAuth)

  // Lead capture endpoint — used by embeddable forms
  app.post('/leads', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
    const orgId = (req as import('fastify').FastifyRequest & { apiKeyOrg: string }).apiKeyOrg
    const body = leadBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })
    const d = body.data
    const now = new Date().toISOString()

    const [contact] = await db`
      INSERT INTO contacts (
        email, first_name, last_name, type, organization_id, created_at, updated_at
      ) VALUES (
        ${d.email}, ${d.firstName ?? d.first_name ?? ''},
        ${d.lastName ?? d.last_name ?? ''},
        'lead', ${orgId}, ${now}, ${now}
      )
      ON CONFLICT (email, organization_id) DO UPDATE SET updated_at = ${now}
      RETURNING id, email, first_name, last_name, type, created_at
    `

    return reply.code(201).send(contact)
  })
}
