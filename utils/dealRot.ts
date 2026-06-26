import type { Deal } from '../types'

/** Default "rotting" threshold — open deals untouched this many days are flagged. */
export const DEFAULT_ROT_THRESHOLD_DAYS = 14

const CLOSED_STAGES = ['closed_won', 'closed_lost']

export interface DealRotStatus {
  isOpen: boolean
  daysIdle: number
  isRotting: boolean
}

/**
 * Pipedrive-style deal rot: an OPEN deal not updated for >= thresholdDays is
 * "rotting". `nowMs` is injectable for deterministic tests.
 */
export function computeDealRot(
  deal: Pick<Deal, 'stage' | 'updatedAt'>,
  thresholdDays: number = DEFAULT_ROT_THRESHOLD_DAYS,
  nowMs: number = Date.now(),
): DealRotStatus {
  const isOpen = !CLOSED_STAGES.includes(deal.stage)
  const updated = Date.parse(deal.updatedAt)
  const daysIdle = Number.isFinite(updated) ? Math.max(0, Math.floor((nowMs - updated) / 86_400_000)) : 0
  return { isOpen, daysIdle, isRotting: isOpen && daysIdle >= thresholdDays }
}

/**
 * Activity-based selling (Pipedrive): a deal should always have a next step.
 * True when there is a non-completed activity due in the future.
 */
export function hasUpcomingActivity(
  dealActivities: Array<{ status?: string; dueDate?: string | null }>,
  nowMs: number = Date.now(),
): boolean {
  return dealActivities.some((a) => a.status !== 'completed' && a.dueDate != null && Date.parse(a.dueDate) > nowMs)
}
