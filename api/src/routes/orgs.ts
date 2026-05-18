import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { sendEmail } from '../services/email.js'

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
    const token = app.jwt.sign(
      { sub: req.user.sub, org: org!.id, role: 'admin', jti: randomBytes(16).toString('hex') },
      { expiresIn: env.JWT_EXPIRES_IN },
    )

    return reply.code(201).send({ ...org, token })
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
    await sendEmail({
      to: invite!.email as string,
      subject: 'You have been invited to join Velo',
      html: `<p>You've been invited to join as <strong>${invite!.role}</strong>. Accept your invitation:</p><p><a href="${acceptLink}">${acceptLink}</a></p><p>This link expires in 7 days.</p>`,
      text: `Accept your Velo invitation: ${acceptLink}`,
    })

    return reply.code(201).send(invite)
  })
}
