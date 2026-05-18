import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { db } from '../db/client.js'
import { env } from '../config/env.js'

async function isSuperAdmin(req: { user: { sub: string } }): Promise<boolean> {
  const rows = await db`SELECT is_super_admin FROM users WHERE id = ${req.user.sub} LIMIT 1`
  return rows[0]?.['isSuperAdmin'] === true
}

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // ── Super-admin guard hook ──────────────────────────────────────────────────
  app.addHook('preHandler', async (req, reply) => {
    const ok = await isSuperAdmin(req as unknown as { user: { sub: string } })
    if (!ok) return reply.code(403).send({ error: 'Super admin access required' })
  })

  // ── GET /admin/stats ────────────────────────────────────────────────────────
  app.get('/stats', async (_req, reply) => {
    const [orgs, users, contacts, deals, activities] = await Promise.all([
      db`SELECT COUNT(*) AS count FROM organizations`,
      db`SELECT COUNT(*) AS count FROM users WHERE is_active = true`,
      db`SELECT COUNT(*) AS count FROM contacts`,
      db`SELECT COUNT(*) AS count FROM deals`,
      db`SELECT COUNT(*) AS count FROM activities`,
    ])

    return reply.send({
      orgs: Number(orgs[0]?.['count'] ?? 0),
      users: Number(users[0]?.['count'] ?? 0),
      contacts: Number(contacts[0]?.['count'] ?? 0),
      deals: Number(deals[0]?.['count'] ?? 0),
      activities: Number(activities[0]?.['count'] ?? 0),
    })
  })

  // ── GET /admin/orgs ─────────────────────────────────────────────────────────
  app.get('/orgs', async (req, reply) => {
    const query = z.object({
      limit: z.coerce.number().min(1).max(200).default(50),
      offset: z.coerce.number().min(0).default(0),
      search: z.string().optional(),
      plan: z.string().optional(),
    }).safeParse(req.query)
    if (!query.success) return reply.code(400).send({ error: 'Invalid query' })

    const { limit, offset, search, plan } = query.data

    const searchFrag = search
      ? db`AND (o.name ILIKE ${'%' + search + '%'} OR o.slug ILIKE ${'%' + search + '%'} OR o.domain ILIKE ${'%' + search + '%'})`
      : db``
    const planFrag = plan ? db`AND o.plan = ${plan}` : db``

    const rows = await db`
      SELECT
        o.id, o.name, o.slug, o.domain, o.plan, o.logo_url, o.primary_color,
        o.billing_email, o.billing_country, o.currency, o.timezone,
        o.custom_domain, o.created_at, o.updated_at,
        COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true) AS user_count,
        COUNT(DISTINCT c.id) AS contact_count,
        COUNT(DISTINCT d.id) AS deal_count,
        s.status AS subscription_status,
        s.current_period_end,
        p.name AS plan_name
      FROM organizations o
      LEFT JOIN users u ON u.organization_id = o.id
      LEFT JOIN contacts c ON c.organization_id = o.id
      LEFT JOIN deals d ON d.organization_id = o.id
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE 1=1 ${searchFrag} ${planFrag}
      GROUP BY o.id, s.status, s.current_period_end, p.name
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countRows = await db`
      SELECT COUNT(*) AS count FROM organizations o WHERE 1=1 ${searchFrag} ${planFrag}
    `

    return reply.send({ data: rows, total: Number(countRows[0]?.['count'] ?? 0), limit, offset })
  })

  // ── GET /admin/orgs/:id ─────────────────────────────────────────────────────
  app.get('/orgs/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    const [org] = await db`
      SELECT
        o.*,
        COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true) AS user_count,
        COUNT(DISTINCT c.id) AS contact_count,
        COUNT(DISTINCT d.id) AS deal_count,
        COUNT(DISTINCT a.id) AS activity_count,
        s.status AS subscription_status, s.trial_ends_at, s.current_period_start,
        s.current_period_end, s.stripe_customer_id, s.stripe_subscription_id, s.notes AS subscription_notes,
        p.name AS plan_name, p.slug AS plan_slug, p.max_users, p.max_contacts, p.max_deals, p.features AS plan_features
      FROM organizations o
      LEFT JOIN users u ON u.organization_id = o.id
      LEFT JOIN contacts c ON c.organization_id = o.id
      LEFT JOIN deals d ON d.organization_id = o.id
      LEFT JOIN activities a ON a.organization_id = o.id
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE o.id = ${id}
      GROUP BY o.id, s.status, s.trial_ends_at, s.current_period_start, s.current_period_end,
               s.stripe_customer_id, s.stripe_subscription_id, s.notes,
               p.name, p.slug, p.max_users, p.max_contacts, p.max_deals, p.features
      LIMIT 1
    `
    if (!org) return reply.code(404).send({ error: 'Org not found' })

    const members = await db`
      SELECT id, email, name, role, job_title, avatar_url, is_active, is_super_admin, created_at
      FROM users WHERE organization_id = ${id} ORDER BY name ASC
    `

    return reply.send({ ...org, members })
  })

  // ── PATCH /admin/orgs/:id ───────────────────────────────────────────────────
  app.patch('/orgs/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = z.object({
      name: z.string().min(1).optional(),
      plan: z.string().optional(),
      domain: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      status: z.enum(['active', 'suspended', 'trial']).optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.data.name !== undefined) updates.name = body.data.name
    if (body.data.plan !== undefined) updates.plan = body.data.plan
    if (body.data.domain !== undefined) updates.domain = body.data.domain
    if (body.data.status !== undefined) updates.status = body.data.status

    const [org] = await db`
      UPDATE organizations SET ${db(updates)} WHERE id = ${id} RETURNING id, name, plan, domain, status, updated_at
    `
    if (!org) return reply.code(404).send({ error: 'Not found' })
    return reply.send(org)
  })

  // ── POST /admin/orgs/:id/suspend ────────────────────────────────────────────
  app.post('/orgs/:id/suspend', async (req, reply) => {
    const { id } = req.params as { id: string }
    const [org] = await db`
      UPDATE organizations SET status = 'suspended', updated_at = NOW()
      WHERE id = ${id} RETURNING id, name, status
    `
    if (!org) return reply.code(404).send({ error: 'Not found' })
    return reply.send(org)
  })

  // ── POST /admin/orgs/:id/unsuspend ──────────────────────────────────────────
  app.post('/orgs/:id/unsuspend', async (req, reply) => {
    const { id } = req.params as { id: string }
    const [org] = await db`
      UPDATE organizations SET status = 'active', updated_at = NOW()
      WHERE id = ${id} RETURNING id, name, status
    `
    if (!org) return reply.code(404).send({ error: 'Not found' })
    return reply.send(org)
  })

  // ── POST /admin/orgs/:id/subscription ──────────────────────────────────────
  app.post('/orgs/:id/subscription', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = z.object({
      planSlug: z.string(),
      status: z.enum(['trialing', 'active', 'past_due', 'canceled', 'expired']).default('active'),
      trialEndsAt: z.string().optional().nullable(),
      currentPeriodEnd: z.string().optional().nullable(),
      stripeSubscriptionId: z.string().optional().nullable(),
      stripeCustomerId: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const [plan] = await db`SELECT id FROM plans WHERE slug = ${body.data.planSlug} LIMIT 1`
    if (!plan) return reply.code(404).send({ error: 'Plan not found' })

    const now = new Date().toISOString()
    const d = body.data
    const [sub] = await db`
      INSERT INTO subscriptions (organization_id, plan_id, status, trial_ends_at, current_period_end,
        stripe_subscription_id, stripe_customer_id, notes, updated_at)
      VALUES (${id}, ${plan.id}, ${d.status}, ${d.trialEndsAt ?? null}, ${d.currentPeriodEnd ?? null},
        ${d.stripeSubscriptionId ?? null}, ${d.stripeCustomerId ?? null}, ${d.notes ?? null}, ${now})
      ON CONFLICT (organization_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = EXCLUDED.status,
        trial_ends_at = EXCLUDED.trial_ends_at,
        current_period_end = EXCLUDED.current_period_end,
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `
    return reply.send(sub)
  })

  // ── POST /admin/orgs/:id/impersonate ────────────────────────────────────────
  // Returns a short-lived JWT scoped to the target org for support purposes
  app.post('/orgs/:id/impersonate', async (req, reply) => {
    const { id } = req.params as { id: string }
    const [org] = await db`SELECT id FROM organizations WHERE id = ${id} LIMIT 1`
    if (!org) return reply.code(404).send({ error: 'Org not found' })

    // Find the org owner to impersonate
    const [owner] = await db`
      SELECT id, role FROM users
      WHERE organization_id = ${id} AND role = 'admin' AND is_active = true
      ORDER BY created_at ASC LIMIT 1
    `
    if (!owner) return reply.code(404).send({ error: 'No active admin found in org' })

    const token = app.jwt.sign(
      {
        sub: owner.id,
        org: id,
        role: owner.role,
        jti: randomBytes(16).toString('hex'),
        impersonated_by: req.user.sub,
      },
      { expiresIn: '1h' },
    )

    // Log the impersonation for audit purposes
    await db`
      INSERT INTO impersonation_logs (super_admin_id, target_org_id, target_user_id)
      VALUES (${req.user.sub}, ${id}, ${owner.id})
    `.catch(() => undefined)

    return reply.send({ token, expiresIn: '1h' })
  })

  // ── GET /admin/users ────────────────────────────────────────────────────────
  app.get('/users', async (req, reply) => {
    const query = z.object({
      limit: z.coerce.number().min(1).max(200).default(50),
      offset: z.coerce.number().min(0).default(0),
      search: z.string().optional(),
    }).safeParse(req.query)
    if (!query.success) return reply.code(400).send({ error: 'Invalid query' })
    const { limit, offset, search } = query.data

    const searchFrag = search
      ? db`AND (u.email ILIKE ${'%' + search + '%'} OR u.name ILIKE ${'%' + search + '%'})`
      : db``

    const rows = await db`
      SELECT u.id, u.email, u.name, u.role, u.is_active, u.is_super_admin, u.created_at,
             o.name AS org_name, o.id AS org_id
      FROM users u
      LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE 1=1 ${searchFrag}
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    const countRows = await db`SELECT COUNT(*) AS count FROM users u WHERE 1=1 ${searchFrag}`
    return reply.send({ data: rows, total: Number(countRows[0]?.['count'] ?? 0), limit, offset })
  })

  // ── PATCH /admin/users/:id ──────────────────────────────────────────────────
  app.patch('/users/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = z.object({
      isSuperAdmin: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.data.isSuperAdmin !== undefined) updates.is_super_admin = body.data.isSuperAdmin
    if (body.data.isActive !== undefined) updates.is_active = body.data.isActive

    const [user] = await db`UPDATE users SET ${db(updates)} WHERE id = ${id} RETURNING id, email, name, is_super_admin, is_active`
    if (!user) return reply.code(404).send({ error: 'Not found' })
    return reply.send(user)
  })

  // ── GET /admin/plans ────────────────────────────────────────────────────────
  app.get('/plans', async (_req, reply) => {
    const rows = await db`SELECT * FROM plans ORDER BY sort_order ASC`
    return reply.send({ data: rows })
  })

  // ── POST /admin/plans ───────────────────────────────────────────────────────
  app.post('/plans', async (req, reply) => {
    const body = z.object({
      name: z.string().min(1),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
      description: z.string().optional(),
      priceMonthly: z.number().min(0).default(0),
      priceYearly: z.number().min(0).default(0),
      currency: z.string().length(3).default('EUR'),
      maxUsers: z.number().int().min(1).default(5),
      maxContacts: z.number().int().min(1).default(1000),
      maxDeals: z.number().int().min(1).default(500),
      maxPipelines: z.number().int().min(1).default(1),
      features: z.record(z.boolean()).default({}),
      isActive: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })

    const d = body.data
    const now = new Date().toISOString()
    const [plan] = await db`
      INSERT INTO plans (name, slug, description, price_monthly, price_yearly, currency,
        max_users, max_contacts, max_deals, max_pipelines, features, is_active, sort_order, created_at, updated_at)
      VALUES (${d.name}, ${d.slug}, ${d.description ?? null}, ${d.priceMonthly}, ${d.priceYearly}, ${d.currency},
        ${d.maxUsers}, ${d.maxContacts}, ${d.maxDeals}, ${d.maxPipelines}, ${db.json(d.features)},
        ${d.isActive}, ${d.sortOrder}, ${now}, ${now})
      RETURNING *
    `
    return reply.code(201).send(plan)
  })

  // ── PATCH /admin/plans/:id ──────────────────────────────────────────────────
  app.patch('/plans/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      priceMonthly: z.number().min(0).optional(),
      priceYearly: z.number().min(0).optional(),
      maxUsers: z.number().int().min(1).optional(),
      maxContacts: z.number().int().min(1).optional(),
      maxDeals: z.number().int().min(1).optional(),
      maxPipelines: z.number().int().min(1).optional(),
      features: z.record(z.boolean()).optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const d = body.data
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (d.name !== undefined) updates.name = d.name
    if (d.description !== undefined) updates.description = d.description
    if (d.priceMonthly !== undefined) updates.price_monthly = d.priceMonthly
    if (d.priceYearly !== undefined) updates.price_yearly = d.priceYearly
    if (d.maxUsers !== undefined) updates.max_users = d.maxUsers
    if (d.maxContacts !== undefined) updates.max_contacts = d.maxContacts
    if (d.maxDeals !== undefined) updates.max_deals = d.maxDeals
    if (d.maxPipelines !== undefined) updates.max_pipelines = d.maxPipelines
    if (d.features !== undefined) updates.features = d.features
    if (d.isActive !== undefined) updates.is_active = d.isActive
    if (d.sortOrder !== undefined) updates.sort_order = d.sortOrder

    const [plan] = await db`UPDATE plans SET ${db(updates)} WHERE id = ${id} RETURNING *`
    if (!plan) return reply.code(404).send({ error: 'Not found' })
    return reply.send(plan)
  })

  // ── GET /admin/impersonation-logs ───────────────────────────────────────────
  app.get('/impersonation-logs', async (req, reply) => {
    const query = z.object({
      limit: z.coerce.number().min(1).max(200).default(50),
      offset: z.coerce.number().min(0).default(0),
    }).safeParse(req.query)
    if (!query.success) return reply.code(400).send({ error: 'Invalid query' })
    const { limit, offset } = query.data

    const rows = await db`
      SELECT
        il.id, il.impersonated_at, il.ended_at,
        u.email AS super_admin_email, u.name AS super_admin_name,
        o.name AS org_name, o.id AS org_id,
        tu.email AS target_user_email, tu.name AS target_user_name
      FROM impersonation_logs il
      JOIN users u ON u.id = il.super_admin_id
      JOIN organizations o ON o.id = il.target_org_id
      JOIN users tu ON tu.id = il.target_user_id
      ORDER BY il.impersonated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    const [cnt] = await db`SELECT COUNT(*) AS count FROM impersonation_logs`
    return reply.send({ data: rows, total: Number(cnt?.count ?? 0), limit, offset })
  })

  // ── GET /admin/orgs/export ─────────────────────────────────────────────────
  app.get('/orgs/export', async (_req, reply) => {
    const rows = await db`
      SELECT o.id, o.name, o.slug, o.domain, o.plan, o.status, o.billing_email, o.created_at,
             p.name AS plan_name, s.status AS subscription_status,
             COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true) AS user_count,
             COUNT(DISTINCT c.id) AS contact_count,
             COUNT(DISTINCT d.id) AS deal_count
      FROM organizations o
      LEFT JOIN users u ON u.organization_id = o.id
      LEFT JOIN contacts c ON c.organization_id = o.id
      LEFT JOIN deals d ON d.organization_id = o.id
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      LEFT JOIN plans p ON p.id = s.plan_id
      GROUP BY o.id, p.name, s.status
      ORDER BY o.created_at DESC
    `

    const header = ['id', 'name', 'slug', 'domain', 'plan', 'status', 'billingEmail', 'createdAt', 'planName', 'subscriptionStatus', 'userCount', 'contactCount', 'dealCount']
    const csv = [
      header.join(','),
      ...rows.map((r) => header.map((k) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    void reply.header('Content-Type', 'text/csv')
    void reply.header('Content-Disposition', 'attachment; filename="orgs.csv"')
    return reply.send(csv)
  })

  // ── GET /admin/users/export ────────────────────────────────────────────────
  app.get('/users/export', async (_req, reply) => {
    const rows = await db`
      SELECT u.id, u.email, u.name, u.role, u.is_active, u.is_super_admin, u.created_at,
             o.name AS org_name
      FROM users u
      LEFT JOIN organizations o ON o.id = u.organization_id
      ORDER BY u.created_at DESC
    `

    const header = ['id', 'email', 'name', 'role', 'isActive', 'isSuperAdmin', 'createdAt', 'orgName']
    const csv = [
      header.join(','),
      ...rows.map((r) => header.map((k) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    void reply.header('Content-Type', 'text/csv')
    void reply.header('Content-Disposition', 'attachment; filename="users.csv"')
    return reply.send(csv)
  })
}
