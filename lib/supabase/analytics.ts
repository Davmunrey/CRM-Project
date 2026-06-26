'use client'

/**
 * Analytics aggregations for Reports + Forecast, computed client-side from the
 * RLS-protected tenant tables. The legacy Propel REST API exposed these as
 * `/analytics/*` endpoints; under Supabase there is no server to compute them,
 * so we derive the same shapes from `deals` / `activities` / `contacts` /
 * `profiles`. Deriving from the same source of truth the rest of the app reads
 * keeps every number consistent with the boards and lists.
 *
 * The pure aggregation helpers are exported and unit-tested; `handleAnalytics`
 * is the thin IO wrapper that fetches the rows and delegates.
 */
import { createClient } from '@/lib/supabase/client'
import { getOrgId } from '@/lib/supabaseHelpers'

// Default stage win-probabilities (fractions) — mirrors utils/defaultAppSettings.
const STAGE_PROBABILITY: Record<string, number> = {
  lead: 0.1,
  qualified: 0.25,
  proposal: 0.5,
  negotiation: 0.75,
  closed_won: 1,
  closed_lost: 0,
}

export type DealRow = {
  value: number | null
  stage: string | null
  status: string | null
  owner_id: string | null
  assigned_to: string | null
  closed_at: string | null
  expected_close_date: string | null
  created_at: string | null
  updated_at: string | null
}

export type ActivityRow = { type: string | null; created_by: string | null; created_at: string | null }
export type ContactRow = { source: string | null }
export type ProfileRow = { id: string; name: string | null }

const isWon = (d: DealRow) => d.stage === 'closed_won' || d.status === 'won'
const isLost = (d: DealRow) => d.stage === 'closed_lost' || d.status === 'lost'
const isOpen = (d: DealRow) => !isWon(d) && !isLost(d)

/** Normalize the stage so won/lost deals always land in the closed buckets. */
function normalizedStage(d: DealRow): string {
  if (isWon(d)) return 'closed_won'
  if (isLost(d)) return 'closed_lost'
  return d.stage ?? 'lead'
}

function dealValue(d: DealRow): number {
  return typeof d.value === 'number' ? d.value : Number(d.value ?? 0)
}

function inWindow(iso: string | null, from?: string, to?: string): boolean {
  if (!from && !to) return true
  if (!iso) return false
  if (from && iso < from) return false
  if (to && iso > to) return false
  return true
}

function monthKey(iso: string): string {
  return iso.slice(0, 7) // YYYY-MM
}

function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** The trailing N month keys ending with the current month (chronological). */
export function lastMonths(n: number, base = new Date()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    out.push(ymKey(new Date(base.getFullYear(), base.getMonth() - i, 1)))
  }
  return out
}

/** The next N month keys starting with the current month (chronological). */
export function nextMonths(n: number, base = new Date()): string[] {
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    out.push(ymKey(new Date(base.getFullYear(), base.getMonth() + i, 1)))
  }
  return out
}

// ─── Pure aggregations ────────────────────────────────────────────────────────

export function summarizeDeals(deals: DealRow[], from?: string, to?: string) {
  const scoped = deals.filter((d) => inWindow(d.created_at, from, to))
  let pipeline = 0,
    won = 0,
    lostValue = 0,
    activeDeals = 0,
    wonDeals = 0,
    lostDeals = 0
  for (const d of scoped) {
    const v = dealValue(d)
    if (isWon(d)) {
      won += v
      wonDeals += 1
    } else if (isLost(d)) {
      lostValue += v
      lostDeals += 1
    } else {
      pipeline += v
      activeDeals += 1
    }
  }
  const closed = wonDeals + lostDeals
  return {
    pipeline,
    won,
    lostValue,
    activeDeals,
    wonDeals,
    lostDeals,
    totalDeals: scoped.length,
    conversionRate: closed > 0 ? (wonDeals / closed) * 100 : 0,
    avgDealSize: wonDeals > 0 ? won / wonDeals : 0,
  }
}

export function dealsByStage(deals: DealRow[], from?: string, to?: string) {
  const byStage = new Map<string, { stage: string; count: number; value: number; weighted: number }>()
  for (const d of deals.filter((x) => inWindow(x.created_at, from, to))) {
    const stage = normalizedStage(d)
    const v = dealValue(d)
    const row = byStage.get(stage) ?? { stage, count: 0, value: 0, weighted: 0 }
    row.count += 1
    row.value += v
    row.weighted += v * (STAGE_PROBABILITY[stage] ?? 0)
    byStage.set(stage, row)
  }
  return Array.from(byStage.values())
}

export function activitiesByType(activities: ActivityRow[], from?: string, to?: string) {
  const byType = new Map<string, number>()
  for (const a of activities.filter((x) => inWindow(x.created_at, from, to))) {
    const t = a.type ?? 'other'
    byType.set(t, (byType.get(t) ?? 0) + 1)
  }
  return Array.from(byType, ([type, count]) => ({ type, count }))
}

export function contactsBySource(contacts: ContactRow[]) {
  const bySource = new Map<string, number>()
  for (const c of contacts) {
    const s = c.source ?? 'other'
    bySource.set(s, (bySource.get(s) ?? 0) + 1)
  }
  return Array.from(bySource, ([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count)
}

export function salesReps(deals: DealRow[], profiles: ProfileRow[], activities: ActivityRow[], from?: string, to?: string) {
  const scoped = deals.filter((d) => inWindow(d.created_at, from, to))
  const acts = activities.filter((a) => inWindow(a.created_at, from, to))
  return profiles
    .map((p) => {
      const owned = scoped.filter((d) => (d.owner_id ?? d.assigned_to) === p.id)
      const won = owned.filter(isWon)
      const lost = owned.filter(isLost)
      const open = owned.filter(isOpen)
      const closed = won.length + lost.length
      return {
        userId: p.id,
        name: p.name ?? '—',
        wonDeals: won.length,
        wonValue: won.reduce((s, d) => s + dealValue(d), 0),
        pipelineValue: open.reduce((s, d) => s + dealValue(d), 0),
        activeDeals: open.length,
        winRate: closed > 0 ? (won.length / closed) * 100 : 0,
        activitiesCount: acts.filter((a) => a.created_by === p.id).length,
      }
    })
    .sort((a, b) => b.wonValue - a.wonValue)
}

export function revenueByMonth(deals: DealRow[], months: number, base = new Date()) {
  const buckets = lastMonths(months, base)
  const totals = new Map(buckets.map((m) => [m, { revenue: 0, dealCount: 0 }]))
  for (const d of deals) {
    if (!isWon(d)) continue
    const when = d.closed_at ?? d.updated_at
    if (!when) continue
    const bucket = totals.get(monthKey(when))
    if (!bucket) continue
    bucket.revenue += dealValue(d)
    bucket.dealCount += 1
  }
  return buckets.map((month) => ({ month, ...totals.get(month)! }))
}

export function forecastByMonth(deals: DealRow[], months: number, base = new Date()) {
  const buckets = nextMonths(months, base)
  const totals = new Map(buckets.map((m) => [m, { weighted: 0, dealCount: 0 }]))
  for (const d of deals) {
    if (!isOpen(d) || !d.expected_close_date) continue
    const bucket = totals.get(monthKey(d.expected_close_date))
    if (!bucket) continue
    bucket.weighted += dealValue(d) * (STAGE_PROBABILITY[normalizedStage(d)] ?? 0)
    bucket.dealCount += 1
  }
  return buckets.map((month) => ({ month, ...totals.get(month)! }))
}

// ─── IO wrapper ───────────────────────────────────────────────────────────────

export function isAnalyticsPath(path: string): boolean {
  return path.split('?')[0].startsWith('/analytics/')
}

export async function handleAnalytics<T>(path: string): Promise<T> {
  const supabase = createClient()
  const orgId = getOrgId()
  const base = path.split('?')[0]
  const i = path.indexOf('?')
  const q = new URLSearchParams(i >= 0 ? path.slice(i + 1) : '')
  const from = q.get('from') ?? undefined
  const to = q.get('to') ?? undefined

  const dealCols =
    'value, stage, status, owner_id, assigned_to, closed_at, expected_close_date, created_at, updated_at'
  const fetchDeals = async () => {
    const { data } = await supabase.from('deals').select(dealCols).eq('organization_id', orgId)
    return (data ?? []) as DealRow[]
  }

  switch (base) {
    case '/analytics/summary':
      return summarizeDeals(await fetchDeals(), from, to) as T
    case '/analytics/deals-by-stage':
      return { data: dealsByStage(await fetchDeals(), from, to) } as T
    case '/analytics/activities-by-type': {
      const { data } = await supabase
        .from('activities')
        .select('type, created_by, created_at')
        .eq('organization_id', orgId)
      return { data: activitiesByType((data ?? []) as ActivityRow[], from, to) } as T
    }
    case '/analytics/contacts-by-source': {
      const { data } = await supabase.from('contacts').select('source').eq('organization_id', orgId)
      return { data: contactsBySource((data ?? []) as ContactRow[]) } as T
    }
    case '/analytics/sales-reps': {
      const [deals, profilesRes, activitiesRes] = await Promise.all([
        fetchDeals(),
        supabase.from('profiles').select('id, name').eq('organization_id', orgId),
        supabase.from('activities').select('type, created_by, created_at').eq('organization_id', orgId),
      ])
      return {
        data: salesReps(deals, (profilesRes.data ?? []) as ProfileRow[], (activitiesRes.data ?? []) as ActivityRow[], from, to),
      } as T
    }
    case '/analytics/revenue-by-month':
      return { data: revenueByMonth(await fetchDeals(), Math.max(1, Math.min(36, Number(q.get('months') ?? 12)))) } as T
    case '/analytics/forecast':
      return { data: forecastByMonth(await fetchDeals(), Math.max(1, Math.min(12, Number(q.get('months') ?? 3)))) } as T
    default:
      return { data: [] } as T
  }
}
