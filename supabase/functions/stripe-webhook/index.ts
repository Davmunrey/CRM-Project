// Propel — Stripe webhook receiver.
// Verifies the Stripe signature, then syncs subscription state into Postgres
// (public.subscriptions + organizations.plan). Configured with verify_jwt=false
// (see config.toml) because Stripe calls it unauthenticated; the shared webhook
// secret is the trust anchor instead.
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno&no-check'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Lazily constructed: `new Stripe('')` throws, so we must not build it at module
// load time when STRIPE_SECRET_KEY is absent (it would crash the function boot).
let _stripe: Stripe | null = null
function getStripe(): Stripe | null {
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  if (!key) return null
  if (!_stripe) {
    _stripe = new Stripe(key, { apiVersion: '2025-03-31.basil', httpClient: Stripe.createFetchHttpClient() })
  }
  return _stripe
}

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

async function planIdForPrice(priceId: string | null | undefined): Promise<string | null> {
  if (!priceId) return null
  const { data } = await admin
    .from('plans')
    .select('id')
    .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
    .maybeSingle()
  return (data?.id as string) ?? null
}

async function planSlug(planId: string | null): Promise<string> {
  if (!planId) return 'free'
  const { data } = await admin.from('plans').select('slug').eq('id', planId).maybeSingle()
  return (data?.slug as string) ?? 'free'
}

/** Upsert the org subscription row + denormalized organizations.plan. */
async function syncSubscription(sub: Stripe.Subscription, orgIdHint?: string | null) {
  const priceId = sub.items.data[0]?.price?.id
  const planId = await planIdForPrice(priceId)
  let orgId = orgIdHint ?? (sub.metadata?.organization_id as string | undefined) ?? null
  if (!orgId) {
    const { data } = await admin
      .from('subscriptions')
      .select('organization_id')
      .eq('stripe_subscription_id', sub.id)
      .maybeSingle()
    orgId = (data?.organization_id as string) ?? null
  }
  if (!orgId) return

  await admin.from('subscriptions').upsert(
    {
      organization_id: orgId,
      plan_id: planId,
      status: sub.status,
      stripe_subscription_id: sub.id,
      stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' },
  )

  const slug = sub.status === 'active' || sub.status === 'trialing' ? await planSlug(planId) : 'free'
  await admin.from('organizations').update({ plan: slug }).eq('id', orgId)
}

Deno.serve(async (req) => {
  const stripe = getStripe()
  if (!stripe) return new Response('Billing not configured (missing STRIPE_SECRET_KEY)', { status: 503 })

  const sig = req.headers.get('stripe-signature')
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!sig || !secret) return new Response('Missing signature/secret', { status: 400 })

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret, undefined, Stripe.createSubtleCryptoProvider())
  } catch (err) {
    return new Response(`Webhook signature error: ${err instanceof Error ? err.message : err}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          await syncSubscription(sub, session.metadata?.organization_id ?? null)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscription(event.data.object as Stripe.Subscription)
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('webhook handler error', err)
    return new Response('Handler error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
