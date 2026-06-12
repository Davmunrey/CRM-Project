import { describe, it, expect } from 'vitest'
import { computeDaySlots } from './bookingSlots.js'

// 2026-06-15 is a Monday (dow=1).
const MON = '2026-06-15'
const avail = [{ dow: 1, start: '09:00', end: '11:00' }]
const NOW = Date.parse('2026-06-01T00:00:00.000Z') // well before, no min-notice clipping

describe('computeDaySlots', () => {
  it('expands a window into duration-sized slots', () => {
    expect(computeDaySlots({ date: MON, availability: avail, durationMinutes: 30, nowMs: NOW })).toEqual([
      '2026-06-15T09:00:00.000Z',
      '2026-06-15T09:30:00.000Z',
      '2026-06-15T10:00:00.000Z',
      '2026-06-15T10:30:00.000Z',
    ])
  })

  it('returns nothing when the date is not an available weekday', () => {
    // 2026-06-16 is a Tuesday (dow=2), no rule.
    expect(computeDaySlots({ date: '2026-06-16', availability: avail, durationMinutes: 30, nowMs: NOW })).toEqual([])
  })

  it('excludes already-taken slots', () => {
    const r = computeDaySlots({ date: MON, availability: avail, durationMinutes: 30, nowMs: NOW, taken: ['2026-06-15T09:30:00.000Z'] })
    expect(r).not.toContain('2026-06-15T09:30:00.000Z')
    expect(r).toContain('2026-06-15T09:00:00.000Z')
  })

  it('honors min-notice (drops slots too soon)', () => {
    const now = Date.parse('2026-06-15T08:00:00.000Z')
    const r = computeDaySlots({ date: MON, availability: avail, durationMinutes: 30, nowMs: now, minNoticeMinutes: 90 })
    // earliest = 09:30; the 09:00 slot is dropped.
    expect(r[0]).toBe('2026-06-15T09:30:00.000Z')
  })

  it('honors max-days-ahead', () => {
    const now = Date.parse('2026-06-01T00:00:00.000Z')
    expect(computeDaySlots({ date: MON, availability: avail, durationMinutes: 30, nowMs: now, maxDaysAhead: 3 })).toEqual([])
  })

  it('returns empty for invalid duration or bad rules', () => {
    expect(computeDaySlots({ date: MON, availability: avail, durationMinutes: 0, nowMs: NOW })).toEqual([])
    expect(computeDaySlots({ date: MON, availability: [{ dow: 1, start: '11:00', end: '09:00' }], durationMinutes: 30, nowMs: NOW })).toEqual([])
  })
})
