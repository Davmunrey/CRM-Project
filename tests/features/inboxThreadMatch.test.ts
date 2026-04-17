import { describe, expect, it } from 'vitest'
import { pickBestDealForThread } from '../../src/features/inbox/threadMatch'
import type { Deal } from '../../src/types'

function deal(partial: Partial<Deal> & Pick<Deal, 'id' | 'title' | 'stage' | 'updatedAt'>): Deal {
  return {
    value: 1,
    currency: 'EUR',
    probability: 50,
    expectedCloseDate: '',
    contactId: '',
    companyId: '',
    assignedTo: '',
    priority: 'medium',
    source: '',
    notes: '',
    activities: [],
    createdAt: '',
    ...partial,
  } as Deal
}

describe('pickBestDealForThread', () => {
  it('prefers open deal over closed', () => {
    const deals = [
      deal({ id: 'won', title: 'Old', stage: 'closed_won', updatedAt: '2026-01-02T00:00:00Z' }),
      deal({ id: 'open', title: 'Open', stage: 'negotiation', updatedAt: '2026-01-01T00:00:00Z' }),
    ]
    expect(pickBestDealForThread(deals)?.id).toBe('open')
  })

  it('falls back to most recently updated when all closed', () => {
    const deals = [
      deal({ id: 'a', title: 'A', stage: 'closed_lost', updatedAt: '2026-01-01T00:00:00Z' }),
      deal({ id: 'b', title: 'B', stage: 'closed_won', updatedAt: '2026-02-01T00:00:00Z' }),
    ]
    expect(pickBestDealForThread(deals)?.id).toBe('b')
  })
})
