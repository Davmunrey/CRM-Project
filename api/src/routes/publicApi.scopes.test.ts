import { describe, expect, it } from 'vitest'
import { hasScope } from './publicApi.js'

describe('hasScope (API-key scope enforcement)', () => {
  it('treats empty/omitted scopes as full access (back-compat)', () => {
    expect(hasScope([], 'leads:write')).toBe(true)
    expect(hasScope(null, 'leads:write')).toBe(true)
    expect(hasScope(undefined, 'leads:write')).toBe(true)
  })

  it('honors wildcard scopes', () => {
    expect(hasScope(['*'], 'leads:write')).toBe(true)
    expect(hasScope(['all'], 'anything:read')).toBe(true)
  })

  it('grants only the listed scopes once explicit', () => {
    expect(hasScope(['leads:write'], 'leads:write')).toBe(true)
    expect(hasScope(['contacts:read', 'leads:write'], 'leads:write')).toBe(true)
  })

  it('denies a scope the key does not have', () => {
    expect(hasScope(['contacts:read'], 'leads:write')).toBe(false)
    expect(hasScope(['leads:read'], 'leads:write')).toBe(false)
  })

  it('ignores non-string entries safely', () => {
    expect(hasScope([123, null, 'leads:write'] as unknown[], 'leads:write')).toBe(true)
    expect(hasScope([123, null] as unknown[], 'leads:write')).toBe(false)
  })
})
