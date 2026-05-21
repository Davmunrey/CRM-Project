import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Stripe from 'stripe'
import { db } from '../db/client.js'
import { env } from '../config/env.js'

function getStripe(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null
  return new Stripe(env.STRIPE_SECRET_KEY)
}

// ── Plan limits enforcement ───────────────────────────────────────────────────

export async function checkPlanLimit(
  orgId: string,
  resource: 'contacts' | 'deals' | 'users',
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const [sub] = await db`
    SELECT p.max_contacts, p.max_deals, p.max_users, s.status
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
    WHERE s.organization_id = ${orgId}
    LIMIT 1
  `

  if (!sub || sub.status === 'canceled' || sub.status === 'expired') {
    return { allowed: true, limit: 0, current: 0 }
  }

  const limitKey = resource === 'contacts' ? 'maxContacts'
    : resource === 'deals' ? 'maxDeals'
    : 'maxUsers'

  const limit = Number(sub[limitKey] ?? 0)
  if (limit === 0) return { allowed: true, limit: 0, current: 0 }

  const table = resource === 'contacts' ? 'contacts'
    : resource === 'deals' ? 'deals'
    : 'users'

  const [count] = await db`SELECT COUNT(*) AS n FROM ${db(table)} WHERE organization_id = ${orgId}`
  const current = Number(count?.n ?? 0)

  return { allowed: current < limit, limit, current }
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function billingRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // ── GET /billing/subscription ──────────────────────────────────────────────
  app.get('/subscription', async (req, reply) => {
    const orgId = req.user.org
    const [row] = await db`
      SELECT s.*, p.name AS plan_name, p.slug AS plan_slug,
             p.max_users, p.max_contacts, p.max_deals, p.features
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      WHERE s.organization_id = ${orgId}
      LIMIT 1
    `
    if (!row) return reply.send({ subscription: null })
    return reply.send({ subscription: row })
  })

  // ── POST /billing/checkout ─────────────────────────────────────────────────
  // Creates a Stripe Checkout Session for the given plan
  app.post('/checkout', async (req, reply) => {
    const stripe = getStripe()
    if (!stripe) return reply.code(503).send({ error: 'Stripe not configured' })

    const orgId = req.user.org
    const body = z.object({
      planSlug: z.string(),
      billingPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const [plan] = await db`SELECT * FROM plans WHERE slug = ${body.data.planSlug} AND is_active = true LIMIT 1`
    if (!plan) return reply.code(404).send({ error: 'Plan not found' })

    const [org] = await db`SELECT billing_email, name FROM organizations WHERE id = ${orgId} LIMIT 1`
    const [sub] = await db`SELECT stripe_customer_id FROM subscriptions WHERE organization_id = ${orgId} LIMIT 1`

    const priceAmount = body.data.billingPeriod === 'yearly'
      ? Number(plan.priceYearly ?? 0)
      : Number(plan.priceMonthly ?? 0)

    // Create an inline price (no pre-configured Stripe price IDs needed)
    const price = await stripe.prices.create({
      currency: (plan.currency as string ?? 'eur').toLowerCase(),
      unit_amount: Math.round(priceAmount * 100),
      recurring: { interval: body.data.billingPeriod === 'yearly' ? 'year' : 'month' },
      product_data: { name: plan.name as string },
    })

    const successUrl = env.STRIPE_SUCCESS_URL ?? `${env.APP_URL}/settings?billing=success`
    const cancelUrl = env.STRIPE_CANCEL_URL ?? `${env.APP_URL}/settings?billing=cancel`

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { orgId, planSlug: body.data.planSlug },
      success_url: successUrl,
      cancel_url: cancelUrl,
    }
    if (sub?.stripeCustomerId) {
      sessionParams.customer = sub.stripeCustomerId as string
    } else if (org?.billingEmail) {
      sessionParams.customer_email = org.billingEmail as string
    }
    const session = await stripe.checkout.sessions.create(sessionParams)

    return reply.send({ url: session.url })
  })

  // ── POST /billing/portal ───────────────────────────────────────────────────
  // Returns a Stripe Customer Portal URL for self-service billing management
  app.post('/portal', async (req, reply) => {
    const stripe = getStripe()
    if (!stripe) return reply.code(503).send({ error: 'Stripe not configured' })

    const orgId = req.user.org
    const [sub] = await db`SELECT stripe_customer_id FROM subscriptions WHERE organization_id = ${orgId} LIMIT 1`
    if (!sub?.stripeCustomerId) return reply.code(404).send({ error: 'No Stripe customer found' })

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId as string,
      return_url: `${env.APP_URL}/settings`,
    })
    return reply.send({ url: session.url })
  })
}

// ── Stripe Webhook (public route, no JWT) ─────────────────────────────────────

export async function stripeWebhookRoute(app: FastifyInstance) {
  app.post('/webhooks/stripe', {
    config: { rawBody: true },
  }, async (req, reply) => {
    const stripe = getStripe()
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
      return reply.code(503).send({ error: 'Stripe not configured' })
    }

    const sig = req.headers['stripe-signature']
    if (!sig || typeof sig !== 'string') return reply.code(400).send({ error: 'Missing signature' })

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        (req as unknown as { rawBody: Buffer }).rawBody,
        sig,
        env.STRIPE_WEBHOOK_SECRET,
      )
    } catch {
      return reply.code(400).send({ error: 'Webhook signature verification failed' })
    }

    const now = new Date().toISOString()

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const orgId = session.metadata?.orgId
      const planSlug = session.metadata?.planSlug
      if (orgId && planSlug) {
        const [plan] = await db`SELECT id FROM plans WHERE slug = ${planSlug} LIMIT 1`
        if (plan) {
          await db`
            INSERT INTO subscriptions (organization_id, plan_id, status, stripe_customer_id, stripe_subscription_id, updated_at)
            VALUES (${orgId}, ${plan.id}, 'active', ${session.customer as string ?? null}, ${session.subscription as string ?? null}, ${now})
            ON CONFLICT (organization_id) DO UPDATE SET
              plan_id = EXCLUDED.plan_id,
              status = 'active',
              stripe_customer_id = EXCLUDED.stripe_customer_id,
              stripe_subscription_id = EXCLUDED.stripe_subscription_id,
              updated_at = EXCLUDED.updated_at
          `
        }
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription & { current_period_end?: number }
      const status = sub.status === 'active' ? 'active'
        : sub.status === 'trialing' ? 'trialing'
        : sub.status === 'past_due' ? 'past_due'
        : sub.status === 'canceled' ? 'canceled'
        : 'expired'
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null
      await db`
        UPDATE subscriptions SET
          status = ${status},
          current_period_end = ${periodEnd},
          updated_at = ${now}
        WHERE stripe_subscription_id = ${sub.id}
      `
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      await db`
        UPDATE subscriptions SET status = 'canceled', updated_at = ${now}
        WHERE stripe_subscription_id = ${sub.id}
      `
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null }
      const subId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id ?? ''
      if (subId) {
        await db`UPDATE subscriptions SET status = 'past_due', updated_at = ${now} WHERE stripe_subscription_id = ${subId}`
      }
    }

    return reply.send({ received: true })
  })
}
