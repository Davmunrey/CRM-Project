import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { db } from '../db/client.js'

/**
 * API-key scope check. Back-compat: a key with NO scopes set (the historical
 * default — scopes were stored but never enforced) is treated as full access,
 * so existing integrations keep working. A '*'/'all' wildcard also grants all.
 * Once a key declares explicit scopes, it is restricted to them.
 */
export function hasScope(keyScopes: unknown, required: string): boolean {
  if (!Array.isArray(keyScopes) || keyScopes.length === 0) return true // legacy all-access
  const scopes = keyScopes.filter((s): s is string => typeof s === 'string')
  return scopes.includes('*') || scopes.includes('all') || scopes.includes(required)
}

type ApiKeyReq = import('fastify').FastifyRequest & { apiKeyOrg: string; apiKeyScopes: string[] }

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

    const r = req as ApiKeyReq
    r.apiKeyOrg = rows[0]!.organizationId as string
    r.apiKeyScopes = Array.isArray(rows[0]!.scopes) ? (rows[0]!.scopes as string[]) : []
  }
}

export async function publicApiRoutes(app: FastifyInstance) {
  const apiKeyAuth = await verifyApiKey(app)

  app.addHook('onRequest', apiKeyAuth)

  // Lead capture endpoint — used by embeddable forms
  app.post('/leads', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
    const r = req as ApiKeyReq
    if (!hasScope(r.apiKeyScopes, 'leads:write')) {
      return reply.code(403).send({ error: 'Insufficient API key scope', required: 'leads:write' })
    }
    const orgId = r.apiKeyOrg
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
