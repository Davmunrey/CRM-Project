import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'node:crypto'
import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { sendEmail } from '../services/email.js'
import { denyToken, setUserTokensValidAfter } from '../db/redis.js'
import { setAuthCookie, clearAuthCookie } from '../services/cookieAuth.js'

const AUTH_RATE_LIMIT = { max: 10, timeWindow: '15 minutes' }
const BCRYPT_ROUNDS = 12

function jwtExpirySeconds(expiresIn: string): number {
  const m = /^(\d+)([smhd])$/.exec(expiresIn)
  if (!m) return 7 * 24 * 3600
  const n = parseInt(m[1]!, 10)
  const unit = m[2]!
  return unit === 's' ? n : unit === 'm' ? n * 60 : unit === 'h' ? n * 3600 : n * 86400
}

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login
  app.post('/login', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (req, reply) => {
    const body = loginBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const { email, password } = body.data

    const users = await db`
      SELECT u.id, u.email, u.password_hash, u.name, u.role, u.is_active,
             u.organization_id, o.slug as org_slug
      FROM users u
      LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE u.email = ${email}
      LIMIT 1
    `
    const user = users[0]
    // Always run bcrypt to prevent timing-based user enumeration
    const hashToCheck = (user?.passwordHash as string | undefined) ?? '$2a$12$invalidhashpadding000000000000000000000000000000000000000'
    const valid = await bcrypt.compare(password, hashToCheck)
    if (!user || !user.isActive || !valid) return reply.code(401).send({ error: 'Invalid credentials' })

    const ttl = jwtExpirySeconds(env.JWT_EXPIRES_IN)
    const token = app.jwt.sign(
      { sub: user.id, org: user.organizationId, role: user.role, jti: randomBytes(16).toString('hex') },
      { expiresIn: env.JWT_EXPIRES_IN },
    )

    // Invalidate all tokens issued before this login
    await setUserTokensValidAfter(user.id as string, ttl)

    // Set HttpOnly cookie — token is NOT returned in the body (XSS protection)
    setAuthCookie(reply, token, ttl)

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId ?? null,
        orgSlug: user.orgSlug ?? null,
      },
      expiresAt: Date.now() + ttl * 1000,
    })
  })

  // POST /auth/register
  app.post('/register', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (req, reply) => {
    const body = registerBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const { email, password, name } = body.data

    const existing = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`
    if (existing.length > 0) return reply.code(409).send({ error: 'Registration failed' })

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const now = new Date().toISOString()

    const [user] = await db`
      INSERT INTO users (email, password_hash, name, role, is_active, created_at, updated_at)
      VALUES (${email}, ${passwordHash}, ${name}, 'admin', true, ${now}, ${now})
      RETURNING id, email, name, role
    `

    const ttl = jwtExpirySeconds(env.JWT_EXPIRES_IN)
    const token = app.jwt.sign({ sub: user!.id, org: null, role: user!.role, jti: randomBytes(16).toString('hex') }, { expiresIn: env.JWT_EXPIRES_IN })

    setAuthCookie(reply, token, ttl)

    return reply.code(201).send({
      user: {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        organizationId: null,
        orgSlug: null,
      },
      expiresAt: Date.now() + ttl * 1000,
    })
  })

  // POST /auth/refresh — revoke old token, issue new one with fresh jti
  app.post('/refresh', { onRequest: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as { sub: string; org: string | null; role: string; jti?: string; exp?: number }
    const oldJti = payload.jti
    if (oldJti) {
      const remaining = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : jwtExpirySeconds(env.JWT_EXPIRES_IN)
      if (remaining > 0) await denyToken(oldJti, remaining)
    }
    const ttl = jwtExpirySeconds(env.JWT_EXPIRES_IN)
    const token = app.jwt.sign(
      { sub: payload.sub, org: payload.org, role: payload.role, jti: randomBytes(16).toString('hex') },
      { expiresIn: env.JWT_EXPIRES_IN },
    )
    setAuthCookie(reply, token, ttl)
    return reply.send({ expiresAt: Date.now() + ttl * 1000 })
  })

  // GET /auth/me — restore session from JWT
  app.get('/me', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { sub: userId } = req.user
    const rows = await db`
      SELECT u.id, u.email, u.name, u.role, u.is_active, u.is_super_admin,
             u.organization_id, o.name as org_name, o.slug as org_slug
      FROM users u
      LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE u.id = ${userId}
      LIMIT 1
    `
    const user = rows[0]
    if (!user || !user.isActive) return reply.code(401).send({ error: 'User not found or inactive' })
    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin === true,
        organizationId: user.organizationId ?? null,
        orgName: user.orgName ?? null,
        orgSlug: user.orgSlug ?? null,
      },
    })
  })

  // POST /auth/forgot-password — always returns 200 to prevent email enumeration
  app.post('/forgot-password', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (req, reply) => {
    const body = z.object({ email: z.string().email() }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const users = await db`SELECT id FROM users WHERE email = ${body.data.email} AND is_active = true LIMIT 1`
    if (users.length > 0) {
      const rawToken = randomBytes(32).toString('hex')
      const tokenHash = createHash('sha256').update(rawToken).digest('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
      await db`
        INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
        VALUES (${users[0]!.id}, ${tokenHash}, ${expiresAt}, now())
        ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, created_at = now()
      `
      const resetLink = `${env.APP_URL}/reset-password?token=${rawToken}`
      await sendEmail({
        to: body.data.email,
        subject: 'Reset your n0CRM password',
        html: `<p>Click the link below to reset your password. It expires in 1 hour.</p><p><a href="${resetLink}">${resetLink}</a></p>`,
        text: `Reset your password: ${resetLink}`,
      })
    }

    return reply.send({ ok: true })
  })

  // POST /auth/reset-password
  app.post('/reset-password', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (req, reply) => {
    const body = z.object({
      token: z.string().min(1),
      password: z.string().min(8),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const tokenHash = createHash('sha256').update(body.data.token).digest('hex')
    const rows = await db`
      SELECT user_id, expires_at FROM password_reset_tokens
      WHERE token = ${tokenHash}
      LIMIT 1
    `
    if (rows.length === 0) return reply.code(400).send({ error: 'Invalid or expired token' })

    const row = rows[0]!
    if (new Date(row.expiresAt as string) < new Date()) {
      return reply.code(400).send({ error: 'Invalid or expired token' })
    }

    const passwordHash = await bcrypt.hash(body.data.password, BCRYPT_ROUNDS)
    await db`UPDATE users SET password_hash = ${passwordHash}, updated_at = now() WHERE id = ${row.userId}`
    await db`DELETE FROM password_reset_tokens WHERE user_id = ${row.userId}`

    return reply.send({ ok: true })
  })

  // PATCH /auth/me — update current user profile
  app.patch('/me', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { sub: userId } = req.user
    const body = z.object({
      name: z.string().min(1).max(100).optional(),
      jobTitle: z.string().max(100).optional(),
      phone: z.string().max(50).optional(),
      avatarUrl: z.string().url().optional().nullable(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const [user] = await db`
      UPDATE users SET
        name       = COALESCE(${d.name ?? null}, name),
        job_title  = COALESCE(${d.jobTitle ?? null}, job_title),
        phone      = COALESCE(${d.phone ?? null}, phone),
        avatar_url = COALESCE(${d.avatarUrl !== undefined ? d.avatarUrl : null}, avatar_url),
        updated_at = now()
      WHERE id = ${userId}
      RETURNING id, email, name, role, job_title, phone, avatar_url, organization_id, updated_at
    `
    if (!user) return reply.code(404).send({ error: 'User not found' })
    return reply.send({ user })
  })

  // PATCH /auth/password — change password (requires current password)
  app.patch('/password', { onRequest: [app.authenticate], config: { rateLimit: AUTH_RATE_LIMIT } }, async (req, reply) => {
    const { sub: userId } = req.user
    const body = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const rows = await db`SELECT password_hash FROM users WHERE id = ${userId} LIMIT 1`
    if (rows.length === 0) return reply.code(404).send({ error: 'User not found' })

    const valid = await bcrypt.compare(body.data.currentPassword, rows[0]!.passwordHash as string)
    if (!valid) return reply.code(401).send({ error: 'Current password is incorrect' })

    const passwordHash = await bcrypt.hash(body.data.newPassword, BCRYPT_ROUNDS)
    await db`UPDATE users SET password_hash = ${passwordHash}, updated_at = now() WHERE id = ${userId}`
    return reply.send({ ok: true })
  })

  // POST /auth/admin/reset-password — admin sets another user's password directly
  app.post('/admin/reset-password', { onRequest: [app.authenticate], config: { rateLimit: AUTH_RATE_LIMIT } }, async (req, reply) => {
    const { role, org } = req.user
    if (role !== 'owner' && role !== 'admin') return reply.code(403).send({ error: 'Admin required' })
    const body = z.object({
      userId: z.string().uuid(),
      newPassword: z.string().min(8),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const rows = await db`
      SELECT id FROM users WHERE id = ${body.data.userId} AND organization_id = ${org} LIMIT 1
    `
    if (rows.length === 0) return reply.code(404).send({ error: 'User not found in organization' })

    const passwordHash = await bcrypt.hash(body.data.newPassword, BCRYPT_ROUNDS)
    await db`UPDATE users SET password_hash = ${passwordHash}, updated_at = now() WHERE id = ${body.data.userId}`
    return reply.send({ ok: true })
  })

  // POST /auth/logout — revoke token in Redis denylist + clear cookie
  app.post('/logout', { onRequest: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as { jti?: string; exp?: number }
    const jti = payload.jti
    if (jti) {
      const ttl = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : jwtExpirySeconds(env.JWT_EXPIRES_IN)
      if (ttl > 0) await denyToken(jti, ttl)
    }
    clearAuthCookie(reply)
    return reply.send({ ok: true })
  })

  // GET /auth/resolve-org/:slug — public, resolves org slug to org metadata
  app.get('/resolve-org/:slug', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { slug } = req.params as { slug: string }
    if (!/^[a-z0-9-]{2,60}$/.test(slug)) return reply.send({ organization: null })
    const rows = await db`SELECT id, name, slug FROM organizations WHERE slug = ${slug} LIMIT 1`
    if (rows.length === 0) return reply.send({ organization: null })
    return reply.send({ organization: rows[0] })
  })
}
