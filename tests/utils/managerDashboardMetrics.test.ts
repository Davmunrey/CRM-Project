import { describe, expect, it } from 'vitest'
import {
  computeMqlSqlLeadSnapshot,
  computeDealStageAgingHeatmap,
  computeOwnerFirstTouchHours,
} from '../../src/utils/managerDashboardMetrics'
import type { Activity, Deal, Lead } from '../../src/types'

describe('managerDashboardMetrics', () => {
  it('counts MQL and SQL and sqlSharePct', () => {
    const leads: Lead[] = [
      { ...baseLead(), id: '1', lifecycleStage: 'mql' },
      { ...baseLead(), id: '2', lifecycleStage: 'mql' },
      { ...baseLead(), id: '3', lifecycleStage: 'sql' },
    ]
    const r = computeMqlSqlLeadSnapshot(leads)
    expect(r.mqlCount).toBe(2)
    expect(r.sqlCount).toBe(1)
    expect(r.sqlSharePct).toBeCloseTo(33.3, 0.5)
  })

  it('heatmap buckets open deals by stage and age', () => {
    const now = new Date('2026-01-20T12:00:00Z')
    const deals: Deal[] = [
      { ...baseDeal(), id: 'd1', stage: 'lead', updatedAt: '2026-01-19T12:00:00Z' },
      { ...baseDeal(), id: 'd2', stage: 'lead', updatedAt: '2026-01-01T12:00:00Z' },
    ]
    const stages = [{ id: 'lead', name: 'Lead' }]
    const closed = new Set(['closed_won', 'closed_lost'])
    const rows = computeDealStageAgingHeatmap(deals, stages, closed, now)
    expect(rows[0].buckets.d0_7).toBe(1)
    // Jan 1 → Jan 20 = 19 calendar days → d15_30 (not d31p)
    expect(rows[0].buckets.d15_30).toBe(1)
  })

  it('owner first touch uses completed activities by assignee', () => {
    const deals: Deal[] = [
      {
        ...baseDeal(),
        id: 'deal1',
        stage: 'lead',
        assignedTo: 'Alice',
        createdAt: '2026-01-01T08:00:00Z',
      },
    ]
    const activities: Activity[] = [
      {
        id: 'a1',
        type: 'call',
        subject: 'x',
        description: '',
        status: 'completed',
        completedAt: '2026-01-01T10:00:00Z',
        dealId: 'deal1',
        createdBy: 'Alice',
        createdAt: '2026-01-01T09:00:00Z',
      },
    ]
    const closed = new Set(['closed_won', 'closed_lost'])
    const rows = computeOwnerFirstTouchHours(deals, activities, closed)
    expect(rows).toHaveLength(1)
    expect(rows[0].ownerKey).toBe('Alice')
    expect(rows[0].medianHours).toBe(2)
  })
})

function baseLead(): Lead {
  return {
    id: 'x',
    firstName: 'A',
    lastName: 'B',
    email: 'a@b.co',
    source: 'web',
    status: 'open',
    lifecycleStage: 'lead',
    score: 0,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function baseDeal(): Deal {
  return {
    id: 'x',
    title: 'T',
    value: 1,
    currency: 'EUR',
    stage: 'lead',
    probability: 10,
    expectedCloseDate: new Date().toISOString(),
    contactId: 'c',
    companyId: 'co',
    assignedTo: 'Bob',
    priority: 'medium',
    source: 'x',
    notes: '',
    activities: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}
