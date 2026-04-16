import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Activity, Deal, Lead } from '../types'

/** Bucket label for deals with no `assignedTo` (translate in UI via `common.unassigned`). */
export const MANAGER_DASHBOARD_UNASSIGNED_OWNER_KEY = '—'

/**
 * Snapshot KPIs from `lifecycle_stage` on leads (no historical cohort).
 * - MQL / SQL: exact `lifecycleStage` match.
 * - `sqlSharePct`: SQL / (MQL + SQL) among leads still in those stages (pipeline mix proxy, not true conversion rate).
 */
export function computeMqlSqlLeadSnapshot(leads: Lead[]) {
  const mqlCount = leads.filter((l) => l.lifecycleStage === 'mql').length
  const sqlCount = leads.filter((l) => l.lifecycleStage === 'sql').length
  const denom = mqlCount + sqlCount
  const sqlSharePct = denom > 0 ? Math.round((sqlCount / denom) * 1000) / 10 : null
  return { mqlCount, sqlCount, sqlSharePct }
}

export type DealAgingBucket = 'd0_7' | 'd8_14' | 'd15_30' | 'd31p'

function dealAgeBucket(deal: Deal, closedStages: Set<string>, now: Date): DealAgingBucket | null {
  if (closedStages.has(deal.stage)) return null
  let days = 0
  try {
    days = Math.max(0, differenceInCalendarDays(now, parseISO(deal.updatedAt)))
  } catch {
    return null
  }
  if (days <= 7) return 'd0_7'
  if (days <= 14) return 'd8_14'
  if (days <= 30) return 'd15_30'
  return 'd31p'
}

/** Open deals per stage × age buckets (days since `updatedAt`). */
export function computeDealStageAgingHeatmap(
  deals: Deal[],
  stageOrder: { id: string; name: string }[],
  closedStageIds: Set<string>,
  now = new Date(),
): { stageId: string; stageName: string; buckets: Record<DealAgingBucket, number> }[] {
  return stageOrder.map(({ id, name }) => {
    const cell: Record<DealAgingBucket, number> = { d0_7: 0, d8_14: 0, d15_30: 0, d31p: 0 }
    for (const d of deals) {
      if (d.stage !== id) continue
      const b = dealAgeBucket(d, closedStageIds, now)
      if (b) cell[b] += 1
    }
    return { stageId: id, stageName: name, buckets: cell }
  })
}

const TOUCH_TYPES = new Set<Activity['type']>(['call', 'email', 'meeting'])

/**
 * Median hours from deal `createdAt` to first completed call/email/meeting on that deal by `createdBy` matching deal `assignedTo`.
 */
export function computeOwnerFirstTouchHours(
  deals: Deal[],
  activities: Activity[],
  closedStages: Set<string>,
): { ownerKey: string; medianHours: number; sampleSize: number }[] {
  const openDeals = deals.filter((d) => !closedStages.has(d.stage))
  const byOwner = new Map<string, number[]>()

  for (const deal of openDeals) {
    const ownerKey = deal.assignedTo?.trim() || MANAGER_DASHBOARD_UNASSIGNED_OWNER_KEY
    const assignee = (deal.assignedTo || '').trim()
    const dealActs = activities
      .filter((a) => a.dealId === deal.id && a.status === 'completed' && a.completedAt && TOUCH_TYPES.has(a.type))
      .filter((a) => (a.createdBy || '').trim() === assignee)
      .map((a) => {
        try {
          const start = parseISO(deal.createdAt).getTime()
          const end = parseISO(a.completedAt!).getTime()
          return (end - start) / 3_600_000
        } catch {
          return null
        }
      })
      .filter((h): h is number => h !== null && Number.isFinite(h) && h >= 0)
      .sort((a, b) => a - b)
    const first = dealActs[0]
    if (first === undefined) continue
    const arr = byOwner.get(ownerKey) ?? []
    arr.push(first)
    byOwner.set(ownerKey, arr)
  }

  const median = (vals: number[]) => {
    if (vals.length === 0) return 0
    const s = [...vals].sort((a, b) => a - b)
    const mid = Math.floor(s.length / 2)
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
  }

  return [...byOwner.entries()]
    .map(([ownerKey, hours]) => ({
      ownerKey,
      medianHours: Math.round(median(hours) * 10) / 10,
      sampleSize: hours.length,
    }))
    .filter((r) => r.sampleSize > 0)
    .sort((a, b) => a.medianHours - b.medianHours)
}
