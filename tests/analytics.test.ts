import { describe, expect, it } from 'vitest'
import {
  type DealRow,
  dealsByStage,
  forecastByMonth,
  lastMonths,
  nextMonths,
  revenueByMonth,
  salesReps,
  summarizeDeals,
} from '@/lib/supabase/analytics'

function deal(partial: Partial<DealRow>): DealRow {
  return {
    value: 0,
    stage: 'lead',
    status: 'open',
    owner_id: null,
    assigned_to: null,
    closed_at: null,
    expected_close_date: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    ...partial,
  }
}

describe('analytics aggregations', () => {
  const deals: DealRow[] = [
    deal({ value: 1000, stage: 'lead' }),
    deal({ value: 2000, stage: 'negotiation' }),
    deal({ value: 5000, stage: 'closed_won', status: 'won', owner_id: 'u1', closed_at: '2026-06-10T00:00:00.000Z' }),
    deal({ value: 3000, stage: 'closed_lost', status: 'lost', owner_id: 'u1' }),
    // a deal marked won via status only must still count as won
    deal({ value: 4000, stage: 'proposal', status: 'won', owner_id: 'u2', closed_at: '2026-06-15T00:00:00.000Z' }),
  ]

  it('summarizes pipeline / won / lost and rates', () => {
    const s = summarizeDeals(deals)
    expect(s.pipeline).toBe(3000) // 1000 + 2000 open
    expect(s.won).toBe(9000) // 5000 + 4000
    expect(s.lostValue).toBe(3000)
    expect(s.wonDeals).toBe(2)
    expect(s.lostDeals).toBe(1)
    expect(s.activeDeals).toBe(2)
    expect(s.totalDeals).toBe(5)
    expect(s.conversionRate).toBeCloseTo((2 / 3) * 100)
    expect(s.avgDealSize).toBe(4500)
  })

  it('respects the created_at window', () => {
    const s = summarizeDeals(deals, '2026-07-01T00:00:00.000Z', '2026-07-31T00:00:00.000Z')
    expect(s.totalDeals).toBe(0)
  })

  it('normalizes won/lost into the closed buckets with weighted value', () => {
    const rows = dealsByStage(deals)
    const won = rows.find((r) => r.stage === 'closed_won')!
    expect(won.count).toBe(2) // closed_won + status-won proposal
    expect(won.value).toBe(9000)
    expect(won.weighted).toBe(9000) // probability 1.0
    const negotiation = rows.find((r) => r.stage === 'negotiation')!
    expect(negotiation.weighted).toBe(2000 * 0.75)
  })

  it('attributes deals to sales reps', () => {
    const reps = salesReps(deals, [{ id: 'u1', name: 'Ada' }, { id: 'u2', name: 'Bo' }], [])
    const ada = reps.find((r) => r.userId === 'u1')!
    expect(ada.wonDeals).toBe(1)
    expect(ada.wonValue).toBe(5000)
    expect(ada.winRate).toBe(50) // 1 won / (1 won + 1 lost)
  })

  it('buckets won revenue by close month', () => {
    const rows = revenueByMonth(deals, 1, new Date('2026-06-20T00:00:00.000Z'))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({ month: '2026-06', revenue: 9000, dealCount: 2 })
  })

  it('weights open deals into forecast months', () => {
    const open = [deal({ value: 2000, stage: 'negotiation', expected_close_date: '2026-07-05' })]
    const rows = forecastByMonth(open, 2, new Date('2026-06-20T00:00:00.000Z'))
    expect(rows.map((r) => r.month)).toEqual(['2026-06', '2026-07'])
    expect(rows[1].weighted).toBe(2000 * 0.75)
  })

  it('builds chronological month windows', () => {
    expect(lastMonths(3, new Date('2026-06-15T00:00:00.000Z'))).toEqual(['2026-04', '2026-05', '2026-06'])
    expect(nextMonths(3, new Date('2026-06-15T00:00:00.000Z'))).toEqual(['2026-06', '2026-07', '2026-08'])
  })
})
