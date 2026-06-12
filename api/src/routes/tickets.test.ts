import { describe, it, expect } from 'vitest'
import { ticketCounts } from './tickets.js'

describe('ticketCounts', () => {
  it('counts by status plus a total', () => {
    expect(ticketCounts([{ status: 'open' }, { status: 'open' }, { status: 'closed' }, { status: 'pending' }])).toEqual({
      open: 2,
      pending: 1,
      resolved: 0,
      closed: 1,
      total: 4,
    })
  })

  it('counts total but ignores unknown/missing status', () => {
    expect(ticketCounts([{ status: 'weird' }, {}])).toMatchObject({ total: 2, open: 0, pending: 0, resolved: 0, closed: 0 })
  })

  it('returns all-zero for an empty list', () => {
    expect(ticketCounts([])).toEqual({ open: 0, pending: 0, resolved: 0, closed: 0, total: 0 })
  })
})
