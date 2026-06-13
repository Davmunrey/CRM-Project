import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { sendEmail } from '../services/email.js'
import { setAuthCookie } from '../services/cookieAuth.js'
import { requirePermission } from '../middleware/rbac.js'
import { setUserTokensValidAfter } from '../db/redis.js'

const MANAGEABLE_ROLES = ['admin', 'manager', 'sales_rep', 'viewer'] as const

function jwtExpirySeconds(expiresIn: string): number {
  const m = /^(\d+)([smhd])$/.exec(expiresIn)
  if (!m) return 7 * 24 * 3600
  const n = parseInt(m[1]!, 10)
  const unit = m[2]!
  return unit === 's' ? n : unit === 'm' ? n * 60 : unit === 'h' ? n * 3600 : n * 86400
}

export async function orgsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // POST /orgs — create org after first login
  app.post('/', async (req, reply) => {
    const body = z.object({
      name: z.string().min(1),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
    }).safeParse(req.body)

    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const existing = await db`SELECT id FROM organizations WHERE slug = ${body.data.slug} LIMIT 1`
    if (existing.length > 0) return reply.code(409).send({ error: 'Slug already taken' })

    const now = new Date().toISOString()
    const [org] = await db`
      INSERT INTO organizations (name, slug, created_at, updated_at)
      VALUES (${body.data.name}, ${body.data.slug}, ${now}, ${now})
      RETURNING *
    `

    // Assign creator as admin
    await db`UPDATE users SET organization_id = ${org!.id}, role = 'admin' WHERE id = ${req.user.sub}`

    // Issue new JWT with org claim so client can access org-scoped routes immediately
    const ttl = jwtExpirySeconds(env.JWT_EXPIRES_IN)
    const token = app.jwt.sign(
      { sub: req.user.sub, org: org!.id, role: 'admin', jti: randomBytes(16).toString('hex') },
      { expiresIn: env.JWT_EXPIRES_IN },
    )
    setAuthCookie(reply, token, ttl)

    return reply.code(201).send({ ...org, expiresAt: Date.now() + ttl * 1000 })
  })

  // GET /orgs/me
  app.get('/me', async (req, reply) => {
    const rows = await db`SELECT * FROM organizations WHERE id = ${req.user.org} LIMIT 1`
    if (rows.length === 0) return reply.code(404).send({ error: 'Not found' })
    return reply.send(rows[0])
  })

  // GET /orgs/me/members
  app.get('/me/members', async (req, reply) => {
    const rows = await db`
      SELECT id, email, name, role, job_title, avatar_url, is_active, created_at
      FROM users
      WHERE organization_id = ${req.user.org}
      ORDER BY name ASC
    `
    return reply.send({ data: rows })
  })

  // PATCH /orgs/me/members/:userId/role — change a member's role (server-side RBAC)
  app.patch('/me/members/:userId/role', { preHandler: [requirePermission('members:manage')] }, async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const orgId = req.user.org
    const body = z.object({ role: z.enum(['owner', ...MANAGEABLE_ROLES]) }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid role' })
    const newRole = body.data.role

    // Only an owner may grant the owner role.
    if (newRole === 'owner' && req.user.role !== 'owner') {
      return reply.code(403).send({ error: 'Only an owner can assign the owner role' })
    }

    const [target] = await db`
      SELECT id, role, name, is_active FROM users WHERE id = ${userId} AND organization_id = ${orgId} LIMIT 1
    `
    if (!target) return reply.code(404).send({ error: 'Member not found' })

    // Never demote the last active owner.
    if (target['role'] === 'owner' && newRole !== 'owner') {
      const owners = await db`SELECT COUNT(*)::int AS n FROM users WHERE organization_id = ${orgId} AND role = 'owner' AND is_active = true`
      if (Number(owners[0]?.['n'] ?? 0) <= 1) return reply.code(409).send({ error: 'Cannot demote the last owner' })
    }

    await db`UPDATE users SET role = ${newRole}, updated_at = now() WHERE id = ${userId} AND organization_id = ${orgId}`
    // Force the member's existing sessions to re-mint so the new role takes effect now.
    await setUserTokensValidAfter(userId, jwtExpirySeconds(env.JWT_EXPIRES_IN))
    await db`
      INSERT INTO audit_log (action, entity_type, entity_id, entity_name, details, user_id, organization_id)
      VALUES ('member_role_changed', 'user', ${userId}, ${target['name'] as string}, ${`role → ${newRole}`}, ${req.user.sub}, ${orgId})
    `
    return reply.send({ ok: true, role: newRole })
  })

  // PATCH /orgs/me/members/:userId/status — activate / deactivate a member
  app.patch('/me/members/:userId/status', { preHandler: [requirePermission('members:manage')] }, async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const orgId = req.user.org
    const body = z.object({ isActive: z.boolean() }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'isActive (boolean) required' })

    if (userId === req.user.sub && !body.data.isActive) {
      return reply.code(400).send({ error: 'You cannot deactivate your own account' })
    }

    const [target] = await db`
      SELECT id, role, name, is_active FROM users WHERE id = ${userId} AND organization_id = ${orgId} LIMIT 1
    `
    if (!target) return reply.code(404).send({ error: 'Member not found' })

    // Never deactivate the last active owner.
    if (!body.data.isActive && target['role'] === 'owner') {
      const owners = await db`SELECT COUNT(*)::int AS n FROM users WHERE organization_id = ${orgId} AND role = 'owner' AND is_active = true`
      if (Number(owners[0]?.['n'] ?? 0) <= 1) return reply.code(409).send({ error: 'Cannot deactivate the last owner' })
    }

    await db`UPDATE users SET is_active = ${body.data.isActive}, updated_at = now() WHERE id = ${userId} AND organization_id = ${orgId}`
    if (!body.data.isActive) {
      // Invalidate the deactivated member's sessions immediately.
      await setUserTokensValidAfter(userId, jwtExpirySeconds(env.JWT_EXPIRES_IN))
    }
    await db`
      INSERT INTO audit_log (action, entity_type, entity_id, entity_name, details, user_id, organization_id)
      VALUES (${body.data.isActive ? 'member_activated' : 'member_deactivated'}, 'user', ${userId}, ${target['name'] as string}, '', ${req.user.sub}, ${orgId})
    `
    return reply.send({ ok: true, isActive: body.data.isActive })
  })

  // GET /orgs/me/subscription
  app.get('/me/subscription', async (req, reply) => {
    const orgId = req.user.org
    const [sub] = await db`
      SELECT s.*, p.name AS plan_name, p.slug AS plan_slug, p.price_monthly, p.price_yearly,
             p.max_users, p.max_contacts, p.max_deals, p.max_pipelines, p.features AS plan_features
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      WHERE s.organization_id = ${orgId}
      LIMIT 1
    `
    if (!sub) {
      // No subscription row — return the org's plan field
      const [org] = await db`SELECT plan FROM organizations WHERE id = ${orgId} LIMIT 1`
      return reply.send({ plan: org?.['plan'] ?? 'free', status: 'active' })
    }
    return reply.send(sub)
  })

  // GET /orgs/me/branding
  app.get('/me/branding', async (req, reply) => {
    const [org] = await db`
      SELECT name, logo_url, primary_color, favicon_url, custom_domain, privacy_url, terms_url, quote_footer
      FROM organizations WHERE id = ${req.user.org} LIMIT 1
    `
    if (!org) return reply.code(404).send({ error: 'Not found' })
    return reply.send(org)
  })

  // PATCH /orgs/me/branding
  app.patch('/me/branding', async (req, reply) => {
    if (!['admin', 'owner', 'manager'].includes(req.user.role)) {
      return reply.code(403).send({ error: 'Insufficient permissions' })
    }
    const body = z.object({
      name: z.string().min(1).optional(),
      logoUrl: z.string().url().optional().nullable(),
      primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      faviconUrl: z.string().url().optional().nullable(),
      customDomain: z.string().optional().nullable(),
      privacyUrl: z.string().url().optional().nullable(),
      termsUrl: z.string().url().optional().nullable(),
      quoteFooter: z.string().max(1000).optional().nullable(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })

    const d = body.data
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (d.name !== undefined) updates.name = d.name
    if (d.logoUrl !== undefined) updates.logo_url = d.logoUrl
    if (d.primaryColor !== undefined) updates.primary_color = d.primaryColor
    if (d.faviconUrl !== undefined) updates.favicon_url = d.faviconUrl
    if (d.customDomain !== undefined) updates.custom_domain = d.customDomain
    if (d.privacyUrl !== undefined) updates.privacy_url = d.privacyUrl
    if (d.termsUrl !== undefined) updates.terms_url = d.termsUrl
    if (d.quoteFooter !== undefined) updates.quote_footer = d.quoteFooter

    const [org] = await db`
      UPDATE organizations SET ${db(updates)} WHERE id = ${req.user.org} RETURNING *
    `
    return reply.send(org)
  })

  // GET /orgs/me/billing-info
  app.get('/me/billing-info', async (req, reply) => {
    const [org] = await db`
      SELECT billing_email, billing_name, billing_address, billing_city, billing_country, billing_vat,
             currency, timezone, date_format
      FROM organizations WHERE id = ${req.user.org} LIMIT 1
    `
    if (!org) return reply.code(404).send({ error: 'Not found' })
    return reply.send(org)
  })

  // PATCH /orgs/me/billing-info
  app.patch('/me/billing-info', async (req, reply) => {
    if (!['admin', 'owner', 'manager'].includes(req.user.role)) {
      return reply.code(403).send({ error: 'Insufficient permissions' })
    }
    const body = z.object({
      billingEmail: z.string().email().optional().nullable(),
      billingName: z.string().optional().nullable(),
      billingAddress: z.string().optional().nullable(),
      billingCity: z.string().optional().nullable(),
      billingCountry: z.string().length(2).optional().nullable(),
      billingVat: z.string().optional().nullable(),
      currency: z.enum(['EUR', 'USD', 'GBP', 'MXN', 'COP', 'ARS', 'BRL']).optional(),
      timezone: z.string().optional(),
      dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })

    const d = body.data
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (d.billingEmail !== undefined) updates.billing_email = d.billingEmail
    if (d.billingName !== undefined) updates.billing_name = d.billingName
    if (d.billingAddress !== undefined) updates.billing_address = d.billingAddress
    if (d.billingCity !== undefined) updates.billing_city = d.billingCity
    if (d.billingCountry !== undefined) updates.billing_country = d.billingCountry
    if (d.billingVat !== undefined) updates.billing_vat = d.billingVat
    if (d.currency !== undefined) updates.currency = d.currency
    if (d.timezone !== undefined) updates.timezone = d.timezone
    if (d.dateFormat !== undefined) updates.date_format = d.dateFormat

    const [org] = await db`
      UPDATE organizations SET ${db(updates)} WHERE id = ${req.user.org} RETURNING *
    `
    return reply.send(org)
  })

  // GET /orgs/resolve/:slug — public route to check if slug is taken
  // (already exists in auth routes)

  // POST /orgs/me/invite — send invitation
  app.post('/me/invite', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const { role: requesterRole } = req.user
    if (requesterRole !== 'admin' && requesterRole !== 'owner' && requesterRole !== 'manager') {
      return reply.code(403).send({ error: 'Insufficient permissions' })
    }

    const body = z.object({
      email: z.string().email(),
      role: z.enum(['admin', 'manager', 'sales_rep', 'viewer']).default('sales_rep'),
    }).safeParse(req.body)

    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const existing = await db`
      SELECT id FROM users WHERE email = ${body.data.email} AND organization_id = ${req.user.org} AND is_active = true LIMIT 1
    `
    if (existing.length > 0) return reply.code(409).send({ error: 'User is already a member of this organization' })

    const [invite] = await db`
      INSERT INTO invitations (email, role, organization_id, invited_by)
      VALUES (${body.data.email}, ${body.data.role}, ${req.user.org}, ${req.user.sub})
      ON CONFLICT (email, organization_id) DO UPDATE SET
        role = EXCLUDED.role,
        invited_by = EXCLUDED.invited_by,
        token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
        status = 'pending',
        expires_at = now() + INTERVAL '7 days'
      RETURNING id, token, email, role, status, expires_at, created_at
    `

    const acceptLink = `${env.APP_URL}/accept-invite?token=${invite!.token}`
    sendEmail({
      to: invite!.email as string,
      subject: 'You have been invited to join n0CRM',
      html: `<p>You've been invited to join as <strong>${invite!.role}</strong>. Accept your invitation:</p><p><a href="${acceptLink}">${acceptLink}</a></p><p>This link expires in 7 days.</p>`,
      text: `Accept your n0CRM invitation: ${acceptLink}`,
    }).catch((err) => console.error('[email] invite delivery failed:', err))

    return reply.code(201).send(invite)
  })

  // POST /orgs/me/members — admin-provision an ACTIVE member with a set password.
  // (The "Add user" form collects a password/name/role; previously the store only
  // sent an invite and dropped those, so no such user ever existed.) members:manage
  // (owner/admin) only. The member should change their password on first login.
  app.post('/me/members', { preHandler: [requirePermission('members:manage')] }, async (req, reply) => {
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })

    const body = z.object({
      email: z.string().email(),
      name: z.string().min(1).max(200),
      password: z.string().min(8).max(200),
      role: z.enum(['admin', 'manager', 'sales_rep', 'viewer']).default('sales_rep'),
      jobTitle: z.string().max(200).optional(),
      phone: z.string().max(50).optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })
    const { email, name, password, role, jobTitle, phone } = body.data

    // A user belongs to exactly one org — email is globally unique.
    const existing = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`
    if (existing.length > 0) return reply.code(409).send({ error: 'A user with this email already exists' })

    const passwordHash = await bcrypt.hash(password, 12)
    const now = new Date().toISOString()
    const [user] = await db`
      INSERT INTO users (email, password_hash, name, role, job_title, phone, organization_id, is_active, created_at, updated_at)
      VALUES (${email}, ${passwordHash}, ${name}, ${role}, ${jobTitle ?? null}, ${phone ?? null}, ${orgId}, true, ${now}, ${now})
      RETURNING id, email, name, role, job_title, phone, is_active, created_at, updated_at
    `
    await db`
      INSERT INTO audit_log (organization_id, action, entity_type, entity_id, entity_name, details, user_id)
      VALUES (${orgId}, 'member_created', 'user', ${user!['id'] as string}, ${name}, ${`role → ${role}`}, ${req.user.sub})
    `
    return reply.code(201).send(user)
  })
}
