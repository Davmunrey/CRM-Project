import { describe, it, expect } from 'vitest'
import { computeDealRot, hasUpcomingActivity, DEFAULT_ROT_THRESHOLD_DAYS } from '../../src/utils/dealRot'

const NOW = Date.parse('2026-06-11T00:00:00Z')
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString()
const daysAhead = (n: number) => new Date(NOW + n * 86_400_000).toISOString()

describe('computeDealRot', () => {
  it('flags an open deal idle past the threshold', () => {
    const r = computeDealRot({ stage: 'qualified', updatedAt: daysAgo(20) }, 14, NOW)
    expect(r).toMatchObject({ isOpen: true, isRotting: true })
    expect(r.daysIdle).toBe(20)
  })

  it('does not flag a recently-updated open deal', () => {
    const r = computeDealRot({ stage: 'proposal', updatedAt: daysAgo(3) }, 14, NOW)
    expect(r.isRotting).toBe(false)
    expect(r.daysIdle).toBe(3)
  })

  it('never flags closed deals, however idle', () => {
    expect(computeDealRot({ stage: 'closed_won', updatedAt: daysAgo(100) }, 14, NOW).isRotting).toBe(false)
    expect(computeDealRot({ stage: 'closed_lost', updatedAt: daysAgo(100) }, 14, NOW)).toMatchObject({ isOpen: false, isRotting: false })
  })

  it('flags exactly at the threshold boundary', () => {
    expect(computeDealRot({ stage: 'lead', updatedAt: daysAgo(14) }, 14, NOW).isRotting).toBe(true)
    expect(computeDealRot({ stage: 'lead', updatedAt: daysAgo(13) }, 14, NOW).isRotting).toBe(false)
  })

  it('handles an unparseable date as 0 idle days', () => {
    const r = computeDealRot({ stage: 'lead', updatedAt: 'not-a-date' }, 14, NOW)
    expect(r.daysIdle).toBe(0)
    expect(r.isRotting).toBe(false)
  })

  it('defaults the threshold to DEFAULT_ROT_THRESHOLD_DAYS', () => {
    expect(computeDealRot({ stage: 'lead', updatedAt: daysAgo(DEFAULT_ROT_THRESHOLD_DAYS) }, undefined, NOW).isRotting).toBe(true)
  })
})

describe('hasUpcomingActivity', () => {
  it('is true with a non-completed activity due in the future', () => {
    expect(hasUpcomingActivity([{ status: 'pending', dueDate: daysAhead(2) }], NOW)).toBe(true)
  })
  it('is false when the only future activity is completed', () => {
    expect(hasUpcomingActivity([{ status: 'completed', dueDate: daysAhead(2) }], NOW)).toBe(false)
  })
  it('is false when activities are only past-due or undated', () => {
    expect(hasUpcomingActivity([{ status: 'pending', dueDate: daysAgo(2) }, { status: 'pending', dueDate: null }], NOW)).toBe(false)
  })
  it('is false with no activities', () => {
    expect(hasUpcomingActivity([], NOW)).toBe(false)
  })
})
