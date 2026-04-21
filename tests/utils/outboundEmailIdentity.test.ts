import { describe, expect, it } from 'vitest'
import { buildCrmFromLabel, sanitizeSenderDisplayName } from '../../src/utils/outboundEmailIdentity'

describe('outboundEmailIdentity', () => {
  it('sanitizes display names so they cannot smuggle a second address', () => {
    expect(sanitizeSenderDisplayName('Acme  <evil@x.com>')).toBe('Acme evil@x.com')
    expect(sanitizeSenderDisplayName('Line1\nLine2')).toBe('Line1 Line2')
  })

  it('buildCrmFromLabel always keeps the mailbox address', () => {
    expect(buildCrmFromLabel('me@gmail.com', 'Team')).toBe('Team <me@gmail.com>')
    expect(buildCrmFromLabel('me@gmail.com', '')).toBe('me@gmail.com')
    expect(buildCrmFromLabel('me@gmail.com', undefined)).toBe('me@gmail.com')
  })
})
