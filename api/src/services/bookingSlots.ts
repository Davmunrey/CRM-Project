/**
 * Pure slot computation for the meeting scheduler. v1 treats availability times as
 * UTC (timezone-aware expansion is a follow-up). Used by the public booking routes
 * and unit-tested in isolation.
 */
export interface AvailabilityRule {
  dow: number // 0=Sun .. 6=Sat
  start: string // 'HH:MM'
  end: string // 'HH:MM'
}

export interface SlotOptions {
  date: string // 'YYYY-MM-DD'
  availability: AvailabilityRule[]
  durationMinutes: number
  taken?: string[] // ISO start times already booked
  nowMs: number
  minNoticeMinutes?: number
  maxDaysAhead?: number
}

const HHMM = /^(\d{1,2}):(\d{2})$/
function minutesOf(hhmm: unknown): number | null {
  if (typeof hhmm !== 'string') return null
  const m = HHMM.exec(hhmm)
  if (!m) return null
  const h = Number(m[1])
  const mn = Number(m[2])
  if (h < 0 || h > 23 || mn < 0 || mn > 59) return null
  return h * 60 + mn
}

/** Open ISO slot-start times for a single date, given weekly availability + taken slots. */
export function computeDaySlots(o: SlotOptions): string[] {
  const dur = o.durationMinutes
  if (!Number.isFinite(dur) || dur <= 0) return []
  const dayMs = Date.parse(`${o.date}T00:00:00.000Z`)
  if (!Number.isFinite(dayMs)) return []
  const dow = new Date(dayMs).getUTCDay()
  const taken = new Set(o.taken ?? [])
  const earliest = o.nowMs + (o.minNoticeMinutes ?? 0) * 60_000
  const latest = o.nowMs + (o.maxDaysAhead ?? 3650) * 86_400_000
  const out: string[] = []
  for (const rule of o.availability ?? []) {
    if (rule?.dow !== dow) continue
    const s = minutesOf(rule.start)
    const e = minutesOf(rule.end)
    if (s == null || e == null || e <= s) continue
    for (let m = s; m + dur <= e; m += dur) {
      const startMs = dayMs + m * 60_000
      if (startMs < earliest || startMs > latest) continue
      const iso = new Date(startMs).toISOString()
      if (!taken.has(iso)) out.push(iso)
    }
  }
  return [...new Set(out)].sort()
}
