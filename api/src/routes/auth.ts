import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'node:crypto'
import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { sendEmail } from '../services/email.js'
import { denyToken, setUserTokensValidAfter, recordFailedLogin, clearFailedLogins, isLoginLocked } from '../db/redis.js'
import { setAuthCookie, clearAuthCookie } from '../services/cookieAuth.js'
import { encryptToken, decryptToken } from '../services/tokenCipher.js'
import { generateSecret, verifyTotp, otpauthUrl } from '../services/totp.js'
import { recordSecurityEvent } from '../services/securityEvents.js'

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
  // Required only when the account has MFA enabled (see login flow).
  totp: z.string().optional(),
})

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

export async function authRoutes(app: FastifyInstance) {
  app.addHook('onSend', async (_req, reply) => {
    reply.header('Cache-Control', 'no-store')
    reply.header('Pragma', 'no-cache')
  })

  // POST /auth/login
  app.post('/login', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (req, reply) => {
    const body = loginBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const { email, password } = body.data
    const accountKey = email.toLowerCase()

    // Account lockout: after repeated failures within the window, refuse further
    // attempts regardless of correctness (credential-stuffing / brute-force guard,
    // layered on top of the per-IP rate limit).
    if (await isLoginLocked(accountKey)) {
      return reply.code(429).send({ error: 'Account temporarily locked after too many failed attempts. Try again later.' })
    }

    const users = await db`
      SELECT u.id, u.email, u.password_hash, u.name, u.role, u.is_active,
             u.organization_id, o.slug as org_slug,
             u.mfa_enabled, u.mfa_secret_cipher
      FROM users u
      LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE u.email = ${email}
      LIMIT 1
    `
    const user = users[0]
    // Always run bcrypt to prevent timing-based user enumeration
    const hashToCheck = (user?.passwordHash as string | undefined) ?? '$2a$12$invalidhashpadding000000000000000000000000000000000000000'
    const valid = await bcrypt.compare(password, hashToCheck)
    if (!user || !user.isActive || !valid) {
      await recordFailedLogin(accountKey)
      recordSecurityEvent(req, 'login_failed', {
        actorUserId: (user?.id as string | undefined) ?? null,
        actorEmail: email,
        organizationId: (user?.organizationId as string | undefined) ?? null,
        detail: !user ? 'unknown account' : !user.isActive ? 'inactive account' : 'bad password',
      })
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    // Second factor (TOTP) when the account has MFA enabled.
    if (user.mfaEnabled === true) {
      const code = body.data.totp
      if (!code) {
        // Password was correct but a code is required — signal the client to prompt.
        recordSecurityEvent(req, 'login_mfa_required', { actorUserId: user.id as string, actorEmail: email, organizationId: (user.organizationId as string | null) ?? null })
        return reply.code(401).send({ error: 'MFA code required', mfaRequired: true })
      }
      let secret: string
      try {
        secret = decryptToken(user.mfaSecretCipher as string)
      } catch {
        return reply.code(500).send({ error: 'MFA is misconfigured for this account' })
      }
      if (!verifyTotp(secret, code)) {
        await recordFailedLogin(accountKey)
        recordSecurityEvent(req, 'login_mfa_failed', { actorUserId: user.id as string, actorEmail: email, organizationId: (user.organizationId as string | null) ?? null })
        return reply.code(401).send({ error: 'Invalid MFA code', mfaRequired: true })
      }
    }

    // Successful auth — reset the failure counter.
    await clearFailedLogins(accountKey)
    recordSecurityEvent(req, 'login_success', { actorUserId: user.id as string, actorEmail: email, organizationId: (user.organizationId as string | null) ?? null })

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

    // Registration policy. The very first user can always register so a fresh
    // install can be bootstrapped; after that, honor ALLOW_OPEN_REGISTRATION and
    // the optional domain allow-list (invite-only / enterprise lockdown).
    const [counts] = await db`SELECT COUNT(*)::int AS n FROM users`
    const isBootstrap = Number(counts?.['n'] ?? 0) === 0
    if (!isBootstrap) {
      if (!env.ALLOW_OPEN_REGISTRATION) {
        return reply.code(403).send({ error: 'Self-registration is disabled. Contact your administrator for an invite.' })
      }
      if (env.REGISTRATION_ALLOWED_DOMAINS) {
        const allowed = env.REGISTRATION_ALLOWED_DOMAINS.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
        const domain = email.toLowerCase().split('@')[1] ?? ''
        if (!allowed.includes(domain)) {
          return reply.code(403).send({ error: 'Email domain not permitted for registration.' })
        }
      }
    }

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

    recordSecurityEvent(req, 'register', { actorUserId: user!.id as string, actorEmail: email })
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
      SELECT u.id, u.email, u.name, u.role, u.is_active, u.is_super_admin, u.mfa_enabled,
             u.organization_id, o.name as org_name, o.slug as org_slug
      FROM users u
      LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE u.id = ${userId}
      LIMIT 1
    `
    const user = rows[0]
    if (!user || !user.isActive) return reply.code(401).send({ error: 'User not found or inactive' })
    const impersonatedBy = (req.user as Record<string, unknown>)['impersonated_by']
    // For org-less users, flag a pending invitation so the client routes them to
    // "ask an admin / use your invite link" instead of the create-a-new-org flow.
    let hasPendingInvitation = false
    if (!user.organizationId) {
      const inv = await db`
        SELECT 1 FROM invitations
        WHERE email = ${user.email as string} AND status = 'pending' AND expires_at > now()
        LIMIT 1
      `
      hasPendingInvitation = inv.length > 0
    }
    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin === true,
        mfaEnabled: user.mfaEnabled === true,
        organizationId: user.organizationId ?? null,
        orgName: user.orgName ?? null,
        orgSlug: user.orgSlug ?? null,
        hasPendingInvitation,
        impersonatedBy: typeof impersonatedBy === 'string' ? impersonatedBy : undefined,
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
      recordSecurityEvent(req, 'password_reset_requested', { actorUserId: users[0]!.id as string, actorEmail: body.data.email })
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
    recordSecurityEvent(req, 'password_reset_completed', { actorUserId: row.userId as string })

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
    recordSecurityEvent(req, 'password_changed', { actorUserId: userId })
    return reply.send({ ok: true })
  })

  // ── MFA (TOTP) ───────────────────────────────────────────────────────────
  // POST /auth/mfa/setup — generate a secret + otpauth URL (not yet enabled).
  app.post('/mfa/setup', { onRequest: [app.authenticate], config: { rateLimit: AUTH_RATE_LIMIT } }, async (req, reply) => {
    const { sub: userId } = req.user
    const rows = await db`SELECT email, mfa_enabled FROM users WHERE id = ${userId} LIMIT 1`
    if (rows.length === 0) return reply.code(404).send({ error: 'User not found' })
    if (rows[0]!.mfaEnabled === true) return reply.code(409).send({ error: 'MFA is already enabled' })

    const secret = generateSecret()
    const cipher = encryptToken(secret)
    if (!cipher) return reply.code(503).send({ error: 'MFA requires TOKEN_ENCRYPTION_KEY to be configured' })

    // Store the (encrypted) pending secret; enabled stays false until verified.
    await db`UPDATE users SET mfa_secret_cipher = ${cipher}, updated_at = now() WHERE id = ${userId}`
    return reply.send({ secret, otpauthUrl: otpauthUrl(secret, rows[0]!.email as string) })
  })

  // POST /auth/mfa/enable — confirm possession with a code, then turn MFA on.
  app.post('/mfa/enable', { onRequest: [app.authenticate], config: { rateLimit: AUTH_RATE_LIMIT } }, async (req, reply) => {
    const { sub: userId } = req.user
    const body = z.object({ token: z.string().min(6) }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'A 6-digit code is required' })

    const rows = await db`SELECT mfa_secret_cipher FROM users WHERE id = ${userId} LIMIT 1`
    const cipher = rows[0]?.mfaSecretCipher as string | null | undefined
    if (!cipher) return reply.code(400).send({ error: 'Run MFA setup first' })

    let secret: string
    try { secret = decryptToken(cipher) } catch { return reply.code(500).send({ error: 'MFA secret could not be read' }) }
    if (!verifyTotp(secret, body.data.token)) return reply.code(401).send({ error: 'Invalid code' })

    await db`UPDATE users SET mfa_enabled = true, updated_at = now() WHERE id = ${userId}`
    await db`
      INSERT INTO audit_log (action, entity_type, entity_id, entity_name, details, user_id, organization_id)
      SELECT 'mfa_enabled', 'user', ${userId}, email, 'TOTP MFA enabled', ${userId}, organization_id
      FROM users WHERE id = ${userId} AND organization_id IS NOT NULL
    `
    recordSecurityEvent(req, 'mfa_enabled', { actorUserId: userId })
    return reply.send({ enabled: true })
  })

  // POST /auth/mfa/disable — re-auth with the current password, then turn MFA off.
  app.post('/mfa/disable', { onRequest: [app.authenticate], config: { rateLimit: AUTH_RATE_LIMIT } }, async (req, reply) => {
    const { sub: userId } = req.user
    const body = z.object({ password: z.string().min(1) }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Password is required' })

    const rows = await db`SELECT password_hash FROM users WHERE id = ${userId} LIMIT 1`
    if (rows.length === 0) return reply.code(404).send({ error: 'User not found' })
    const valid = await bcrypt.compare(body.data.password, rows[0]!.passwordHash as string)
    if (!valid) return reply.code(401).send({ error: 'Password is incorrect' })

    await db`UPDATE users SET mfa_enabled = false, mfa_secret_cipher = NULL, updated_at = now() WHERE id = ${userId}`
    await db`
      INSERT INTO audit_log (action, entity_type, entity_id, entity_name, details, user_id, organization_id)
      SELECT 'mfa_disabled', 'user', ${userId}, email, 'TOTP MFA disabled', ${userId}, organization_id
      FROM users WHERE id = ${userId} AND organization_id IS NOT NULL
    `
    recordSecurityEvent(req, 'mfa_disabled', { actorUserId: userId })
    return reply.send({ enabled: false })
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
    recordSecurityEvent(req, 'logout', { actorUserId: req.user.sub, organizationId: req.user.org ?? null })
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
