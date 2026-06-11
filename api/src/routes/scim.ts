/**
 * SCIM 2.0 user provisioning (RFC 7643/7644) — /scim/v2.
 *
 * Lets an IdP (Entra / Okta / OneLogin…) provision & deprovision members. Auth is
 * a **Bearer API key scoped `scim`** (created via POST /integrations/api-keys with
 * scopes:["scim"]) — the key maps to the target organization, so no separate token
 * store is needed. Deprovision = deactivate (soft) + session invalidation; the last
 * active owner can never be deactivated/deleted.
 *
 * Pure helpers (parseUserNameFilter, toScimUser) are unit-tested.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'node:crypto'
import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { setUserTokensValidAfter } from '../db/redis.js'
import { hasScope } from './publicApi.js'

const USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User'
const SCIM_CONTENT = 'application/scim+json'

// NOTE: the DB client uses `transform: postgres.camel`, so SELECTed snake_case
// columns (is_active, created_at, updated_at) arrive here as camelCase.
export interface ScimUserRow {
  id: string
  email: string
  name?: string | null
  isActive?: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

/** Map a users row to a SCIM core User resource. */
export function toScimUser(u: ScimUserRow): Record<string, unknown> {
  return {
    schemas: [USER_SCHEMA],
    id: u.id,
    userName: u.email,
    name: { formatted: u.name ?? '' },
    displayName: u.name ?? u.email,
    emails: [{ value: u.email, primary: true }],
    active: u.isActive !== false,
    meta: {
      resourceType: 'User',
      created: u.createdAt ?? undefined,
      lastModified: u.updatedAt ?? undefined,
    },
  }
}

/** Parse a SCIM `userName eq "x@y.com"` filter → the email, or null if not that shape. */
export function parseUserNameFilter(filter: string | undefined): string | null {
  if (!filter) return null
  const m = /^\s*userName\s+eq\s+"([^"]+)"\s*$/i.exec(filter)
  return m ? m[1]!.toLowerCase() : null
}

function scimError(reply: FastifyReply, status: number, detail: string) {
  return reply
    .code(status)
    .header('Content-Type', SCIM_CONTENT)
    .send({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: String(status), detail })
}

type ScimReq = FastifyRequest & { scimOrg: string }

export async function scimRoutes(app: FastifyInstance) {
  // IdPs send `Content-Type: application/scim+json`; Fastify only parses
  // application/json by default. Register a scoped parser so bodies deserialize.
  app.addContentTypeParser('application/scim+json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      done(null, body && (body as string).length > 0 ? JSON.parse(body as string) : {})
    } catch (err) {
      done(err as Error, undefined)
    }
  })

  // Bearer auth: the token is an api_key with the 'scim' scope; it maps to an org.
  app.addHook('onRequest', async (req, reply) => {
    const hdr = req.headers['authorization']
    const token = typeof hdr === 'string' && hdr.startsWith('Bearer ') ? hdr.slice(7) : ''
    if (!token) return scimError(reply, 401, 'Bearer token required')
    const keyHash = createHash('sha256').update(token).digest('hex')
    const rows = await db`
      SELECT organization_id, scopes FROM api_keys
      WHERE key_hash = ${keyHash} AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `
    if (rows.length === 0 || !hasScope(rows[0]!['scopes'], 'scim')) {
      return scimError(reply, 401, 'Invalid SCIM token')
    }
    ;(req as ScimReq).scimOrg = rows[0]!['organizationId'] as string
  })

  // ── Discovery ──────────────────────────────────────────────────────────────
  app.get('/ServiceProviderConfig', async (_req, reply) =>
    reply.header('Content-Type', SCIM_CONTENT).send({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
      patch: { supported: true },
      filter: { supported: true, maxResults: 200 },
      bulk: { supported: false },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: false },
      authenticationSchemes: [{ type: 'oauthbearertoken', name: 'Bearer', description: 'API key scoped "scim"' }],
    }),
  )

  // ── List / search Users ─────────────────────────────────────────────────────
  app.get('/Users', async (req, reply) => {
    const orgId = (req as ScimReq).scimOrg
    const { filter } = req.query as { filter?: string }
    const email = parseUserNameFilter(filter)
    const rows = email
      ? await db`SELECT id, email, name, is_active, created_at, updated_at FROM users WHERE organization_id = ${orgId} AND lower(email) = ${email} LIMIT 1`
      : await db`SELECT id, email, name, is_active, created_at, updated_at FROM users WHERE organization_id = ${orgId} ORDER BY created_at LIMIT 200`
    return reply.header('Content-Type', SCIM_CONTENT).send({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: rows.length,
      startIndex: 1,
      itemsPerPage: rows.length,
      Resources: rows.map((r) => toScimUser(r as unknown as ScimUserRow)),
    })
  })

  app.get('/Users/:id', async (req, reply) => {
    const orgId = (req as ScimReq).scimOrg
    const { id } = req.params as { id: string }
    const [u] = await db`SELECT id, email, name, is_active, created_at, updated_at FROM users WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (!u) return scimError(reply, 404, 'User not found')
    return reply.header('Content-Type', SCIM_CONTENT).send(toScimUser(u as unknown as ScimUserRow))
  })

  // ── Provision a User ─────────────────────────────────────────────────────────
  app.post('/Users', async (req, reply) => {
    const orgId = (req as ScimReq).scimOrg
    const body = req.body as { userName?: string; emails?: Array<{ value?: string }>; name?: { formatted?: string; givenName?: string; familyName?: string }; displayName?: string; active?: boolean }
    const email = (body.userName ?? body.emails?.[0]?.value ?? '').toLowerCase().trim()
    if (!email || !email.includes('@')) return scimError(reply, 400, 'userName (email) is required')
    const name = body.name?.formatted ?? [body.name?.givenName, body.name?.familyName].filter(Boolean).join(' ') ?? body.displayName ?? email.split('@')[0]!

    const existing = await db`SELECT id, organization_id FROM users WHERE lower(email) = ${email} LIMIT 1`
    if (existing.length > 0) {
      // Already provisioned in THIS org → 409 (SCIM idempotency). In another org → conflict too (email is globally unique).
      return scimError(reply, 409, 'User already exists')
    }

    const placeholder = await bcrypt.hash(randomBytes(24).toString('hex'), 12)
    const [u] = await db`
      INSERT INTO users (email, password_hash, name, role, is_active, organization_id, created_at, updated_at)
      VALUES (${email}, ${placeholder}, ${name}, ${env.OIDC_DEFAULT_ROLE}, ${body.active !== false}, ${orgId}, now(), now())
      RETURNING id, email, name, is_active, created_at, updated_at
    `
    await db`
      INSERT INTO audit_log (action, entity_type, entity_id, entity_name, details, user_id, organization_id)
      VALUES ('scim_user_provisioned', 'user', ${u!['id'] as string}, ${name}, 'Provisioned via SCIM', 'scim', ${orgId})
    `
    return reply.code(201).header('Content-Type', SCIM_CONTENT).send(toScimUser(u as unknown as ScimUserRow))
  })

  // Guard: never deactivate the last active owner.
  async function setActive(orgId: string, id: string, active: boolean, reply: FastifyReply): Promise<boolean> {
    const [target] = await db`SELECT role, is_active FROM users WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (!target) { scimError(reply, 404, 'User not found'); return false }
    if (!active && target['role'] === 'owner') {
      const owners = await db`SELECT COUNT(*)::int AS n FROM users WHERE organization_id = ${orgId} AND role = 'owner' AND is_active = true`
      if (Number(owners[0]?.['n'] ?? 0) <= 1) { scimError(reply, 409, 'Cannot deactivate the last owner'); return false }
    }
    await db`UPDATE users SET is_active = ${active}, updated_at = now() WHERE id = ${id} AND organization_id = ${orgId}`
    if (!active) await setUserTokensValidAfter(id, 7 * 24 * 3600)
    return true
  }

  // ── PATCH (deprovision/reactivate via active op) ─────────────────────────────
  app.patch('/Users/:id', async (req, reply) => {
    const orgId = (req as ScimReq).scimOrg
    const { id } = req.params as { id: string }
    const body = req.body as { Operations?: Array<{ op?: string; path?: string; value?: unknown }> }
    let active: boolean | undefined
    for (const op of body.Operations ?? []) {
      const isActivePath = (op.path ?? '').toLowerCase() === 'active'
      if ((op.op ?? '').toLowerCase() === 'replace') {
        if (isActivePath) active = op.value === true || op.value === 'true'
        else if (op.value && typeof op.value === 'object' && 'active' in (op.value as object)) {
          active = (op.value as { active?: boolean }).active === true
        }
      }
    }
    if (active === undefined) return scimError(reply, 400, 'Only the `active` attribute is patchable')
    if (!(await setActive(orgId, id, active, reply))) return
    const [u] = await db`SELECT id, email, name, is_active, created_at, updated_at FROM users WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    return reply.header('Content-Type', SCIM_CONTENT).send(toScimUser(u as unknown as ScimUserRow))
  })

  // ── PUT (replace — we honor active + name) ───────────────────────────────────
  app.put('/Users/:id', async (req, reply) => {
    const orgId = (req as ScimReq).scimOrg
    const { id } = req.params as { id: string }
    const body = req.body as { active?: boolean; name?: { formatted?: string }; displayName?: string }
    const newName = body.name?.formatted ?? body.displayName
    if (newName) {
      await db`UPDATE users SET name = ${newName}, updated_at = now() WHERE id = ${id} AND organization_id = ${orgId}`
    }
    if (typeof body.active === 'boolean') {
      if (!(await setActive(orgId, id, body.active, reply))) return
    }
    const [u] = await db`SELECT id, email, name, is_active, created_at, updated_at FROM users WHERE id = ${id} AND organization_id = ${orgId} LIMIT 1`
    if (!u) return scimError(reply, 404, 'User not found')
    return reply.header('Content-Type', SCIM_CONTENT).send(toScimUser(u as unknown as ScimUserRow))
  })

  // ── DELETE (deprovision → deactivate, never hard-delete) ─────────────────────
  app.delete('/Users/:id', async (req, reply) => {
    const orgId = (req as ScimReq).scimOrg
    const { id } = req.params as { id: string }
    if (!(await setActive(orgId, id, false, reply))) return
    await db`
      INSERT INTO audit_log (action, entity_type, entity_id, entity_name, details, user_id, organization_id)
      VALUES ('scim_user_deprovisioned', 'user', ${id}, '', 'Deactivated via SCIM', 'scim', ${orgId})
    `
    return reply.code(204).send()
  })
}
