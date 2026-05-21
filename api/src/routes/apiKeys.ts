import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomBytes, createHash } from 'node:crypto'
import { db } from '../db/client.js'

function sha256hex(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export async function apiKeysRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // ── API Keys ──────────────────────────────────────────────────────────────

  app.get('/api-keys', async (req, reply) => {
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })
    const rows = await db`
      SELECT id, name, key_prefix, scopes, revoked_at, last_used_at, expires_at, created_at
      FROM api_keys
      WHERE organization_id = ${orgId}
      ORDER BY created_at DESC
    `
    return reply.send({ keys: rows })
  })

  app.post('/api-keys', async (req, reply) => {
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })
    const body = z.object({
      name: z.string().min(1).max(100),
      expiresInDays: z.number().int().min(1).max(3650).optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Name required' })

    const rawKey = `n0crm_${randomBytes(24).toString('base64url')}`
    const keyPrefix = rawKey.slice(0, 12)
    const keyHash = sha256hex(rawKey)
    const now = new Date().toISOString()
    const expiresAt = body.data.expiresInDays
      ? new Date(Date.now() + body.data.expiresInDays * 86400000).toISOString()
      : null

    const [row] = await db`
      INSERT INTO api_keys (organization_id, name, key_prefix, key_hash, expires_at, created_at, updated_at)
      VALUES (${orgId}, ${body.data.name}, ${keyPrefix}, ${keyHash}, ${expiresAt}, ${now}, ${now})
      RETURNING id, name, key_prefix, expires_at, created_at
    `

    return reply.code(201).send({ key: row, apiKey: rawKey })
  })

  // POST /api-keys/:id/rotate — revoke old key, issue new one with same name
  app.post('/api-keys/:id/rotate', async (req, reply) => {
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })
    const { id } = req.params as { id: string }

    const existing = await db`
      SELECT id, name, expires_at FROM api_keys WHERE id = ${id} AND organization_id = ${orgId} AND revoked_at IS NULL LIMIT 1
    `
    if (existing.length === 0) return reply.code(404).send({ error: 'API key not found' })

    const old = existing[0]!
    await db`UPDATE api_keys SET revoked_at = now(), updated_at = now() WHERE id = ${id}`

    const rawKey = `n0crm_${randomBytes(24).toString('base64url')}`
    const keyPrefix = rawKey.slice(0, 12)
    const keyHash = sha256hex(rawKey)
    const now = new Date().toISOString()

    const [row] = await db`
      INSERT INTO api_keys (organization_id, name, key_prefix, key_hash, expires_at, created_at, updated_at)
      VALUES (${orgId}, ${old.name}, ${keyPrefix}, ${keyHash}, ${old.expiresAt ?? null}, ${now}, ${now})
      RETURNING id, name, key_prefix, expires_at, created_at
    `

    return reply.send({ key: row, apiKey: rawKey })
  })

  app.delete('/api-keys/:id', async (req, reply) => {
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })
    const { id } = req.params as { id: string }
    await db`
      UPDATE api_keys SET revoked_at = now(), updated_at = now()
      WHERE id = ${id} AND organization_id = ${orgId}
    `
    return reply.send({ ok: true })
  })

  // ── Lead Capture Tokens ───────────────────────────────────────────────────

  app.get('/lead-capture-tokens', async (req, reply) => {
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })
    const rows = await db`
      SELECT id, label, token_prefix, enabled, created_at
      FROM lead_capture_tokens
      WHERE organization_id = ${orgId}
      ORDER BY created_at DESC
    `
    return reply.send({ tokens: rows })
  })

  app.post('/lead-capture-tokens', async (req, reply) => {
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })
    const body = z.object({ label: z.string().max(100).optional() }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const rawToken = `lct_${randomBytes(24).toString('base64url')}`
    const tokenPrefix = rawToken.slice(0, 12)
    const tokenHash = sha256hex(rawToken)
    const label = body.data.label?.trim() ?? ''
    const now = new Date().toISOString()

    const [row] = await db`
      INSERT INTO lead_capture_tokens (organization_id, label, token_prefix, token_hash, created_at, updated_at)
      VALUES (${orgId}, ${label}, ${tokenPrefix}, ${tokenHash}, ${now}, ${now})
      RETURNING id, label, token_prefix, enabled, created_at
    `

    return reply.code(201).send({ token_row: row, token: rawToken })
  })

  app.delete('/lead-capture-tokens/:id', async (req, reply) => {
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })
    const { id } = req.params as { id: string }
    await db`DELETE FROM lead_capture_tokens WHERE id = ${id} AND organization_id = ${orgId}`
    return reply.send({ ok: true })
  })
}
