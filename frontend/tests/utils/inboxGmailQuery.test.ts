import { describe, expect, it } from 'vitest'
import { inboxQueryHasCrmOnlyTokens, toGmailThreadsListQuery, aggregateCrmTrackingForGmailThread } from '../../src/utils/inboxGmailQuery'
import type { CRMEmail } from '../../src/types'

describe('inboxGmailQuery', () => {
  it('strips CRM-only tokens for Gmail API query', () => {
    expect(toGmailThreadsListQuery('from:acme is:tracked subject:foo')).toBe('from:acme subject:foo')
    expect(toGmailThreadsListQuery('is:opened in:mine')).toBe('')
  })

  it('detects CRM-only tokens', () => {
    expect(inboxQueryHasCrmOnlyTokens('from:x is:tracked')).toBe(true)
    expect(inboxQueryHasCrmOnlyTokens('from:x is:unread')).toBe(false)
  })

  it('aggregates CRM tracking per Gmail thread', () => {
    const emails = [
      { id: '1', gmailThreadId: 't1', trackingEnabled: true, openCount: 1, clickCount: 0 },
      { id: '2', gmailThreadId: 't1', trackingEnabled: false, openCount: 0, clickCount: 2 },
    ] as CRMEmail[]
    expect(aggregateCrmTrackingForGmailThread('t1', emails)).toEqual({
      tracked: true,
      opened: true,
      clicked: true,
    })
  })
})
