import { describe, expect, it } from 'vitest'
import {
  inferWorkspaceSlugFromHostname,
  resolveWorkspaceSlugFromWindowHostname,
} from '@/lib/workspaceSlug'

describe('Propel smoke test', () => {
  it('infers a tenant slug from a multi-label hostname', () => {
    expect(inferWorkspaceSlugFromHostname('acme.crm.example.com')).toBe('acme')
  })

  it('returns null for localhost and bare domains', () => {
    expect(inferWorkspaceSlugFromHostname('localhost')).toBeNull()
    expect(inferWorkspaceSlugFromHostname('example.com')).toBeNull()
  })

  it('prefers an explicit root domain when provided', () => {
    expect(
      resolveWorkspaceSlugFromWindowHostname('acme.app.propel.io', 'app.propel.io'),
    ).toBe('acme')
  })
})
