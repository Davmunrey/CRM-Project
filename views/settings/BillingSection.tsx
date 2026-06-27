'use client'

import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'
import { createClient, isSupabaseConfigured } from '../../lib/supabase/client'
import { toast } from '../../store/toastStore'

type Plan = {
  id: string
  name: string
  slug: string
  description: string | null
  price_monthly: number
  price_yearly: number
  currency: string | null
  features: string[] | null
  sort_order: number | null
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
}

type BillingStatus = {
  plan: string
  status: string
  hasBilling: boolean
  subscription: { status: string; current_period_end: string | null } | null
}

export function BillingSection() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [busy, setBusy] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [statusRes, plansRes] = await Promise.all([
          api.get<BillingStatus>('/billing/status').catch(() => null),
          isSupabaseConfigured()
            ? createClient()
                .from('plans')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true })
            : Promise.resolve({ data: [] as Plan[] }),
        ])
        if (!active) return
        setStatus(statusRes)
        setPlans(((plansRes as { data: Plan[] | null }).data ?? []) as Plan[])
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  // Reflect Stripe Checkout return (?billing=success|cancelled).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const b = params.get('billing')
    if (b === 'success') toast.success('Subscription updated ✓')
    if (b === 'cancelled') toast.info('Checkout cancelled')
  }, [])

  const startCheckout = async (plan: Plan) => {
    setBusy(plan.id)
    try {
      const { url } = await api.post<{ url: string }>('/billing/checkout', { planId: plan.id, interval })
      if (url) window.location.href = url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start checkout')
    } finally {
      setBusy(null)
    }
  }

  const openPortal = async () => {
    setBusy('portal')
    try {
      const { url } = await api.post<{ url: string }>('/billing/portal', {})
      if (url) window.location.href = url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open billing portal')
    } finally {
      setBusy(null)
    }
  }

  const fmt = (n: number, currency: string | null) =>
    new Intl.NumberFormat('en', { style: 'currency', currency: currency || 'EUR', maximumFractionDigits: 0 }).format(n)

  const currentSlug = status?.plan ?? 'free'

  return (
    <section className="crm-surface-section p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-base font-semibold text-fg">Billing &amp; plan</h2>
          <p className="text-sm text-fg-muted mt-1">
            Current plan: <span className="font-medium text-fg capitalize">{currentSlug}</span>
            {status?.subscription?.status ? ` · ${status.subscription.status}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
            {(['monthly', 'yearly'] as const).map((iv) => (
              <button
                key={iv}
                onClick={() => setInterval(iv)}
                className={`px-3 py-1.5 rounded-md capitalize transition-colors ${interval === iv ? 'bg-fg text-bg' : 'text-fg-muted hover:text-fg'}`}
              >
                {iv}
                {iv === 'yearly' ? ' · 2 free' : ''}
              </button>
            ))}
          </div>
          {status?.subscription && (
            <Button size="sm" variant="ghost" disabled={busy === 'portal'} onClick={openPortal}>
              {busy === 'portal' ? '…' : 'Manage subscription'}
            </Button>
          )}
        </div>
      </div>

      {status && status.hasBilling === false && (
        <div className="mb-5 rounded-lg border border-amber-300/40 bg-amber-50/50 px-4 py-3 text-sm text-amber-800">
          Stripe is not configured yet. Set <code>STRIPE_SECRET_KEY</code> (and the plans&rsquo; Stripe price IDs) to enable
          checkout. The UI below is fully wired and will work as soon as the key is set.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-fg-muted">Loading plans…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const price = interval === 'yearly' ? plan.price_yearly : plan.price_monthly
            const isCurrent = plan.slug === currentSlug
            const priceConfigured = interval === 'yearly' ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly
            const isFree = Number(price) === 0
            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-5 flex flex-col ${isCurrent ? 'border-fg' : 'border-border'}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-fg">{plan.name}</h3>
                  {isCurrent && <span className="text-2xs rounded bg-fg px-2 py-0.5 text-bg">Current</span>}
                </div>
                <div className="mt-2 mb-1">
                  <span className="text-2xl font-bold text-fg">{fmt(Number(price), plan.currency)}</span>
                  <span className="text-sm text-fg-muted">/{interval === 'yearly' ? 'yr' : 'mo'}</span>
                </div>
                {plan.description && <p className="text-sm text-fg-muted mb-3">{plan.description}</p>}
                {Array.isArray(plan.features) && (
                  <ul className="text-sm text-fg-muted space-y-1 mb-4 flex-1">
                    {plan.features.slice(0, 5).map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="text-emerald-600">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  size="sm"
                  variant={isCurrent ? 'ghost' : 'primary'}
                  disabled={isCurrent || isFree || !priceConfigured || busy === plan.id}
                  onClick={() => startCheckout(plan)}
                >
                  {isCurrent ? 'Current plan' : isFree ? 'Free' : busy === plan.id ? '…' : !priceConfigured ? 'Not configured' : 'Upgrade'}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
