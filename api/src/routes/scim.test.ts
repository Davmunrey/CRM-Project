import { describe, it, expect } from 'vitest'
import { parseUserNameFilter, toScimUser } from './scim.js'

describe('parseUserNameFilter', () => {
  it('extracts the email from a userName eq filter and lowercases it', () => {
    expect(parseUserNameFilter('userName eq "Alice@Example.com"')).toBe('alice@example.com')
  })

  it('is case-insensitive on the operator and tolerant of surrounding whitespace', () => {
    expect(parseUserNameFilter('  USERNAME   EQ   "bob@x.io"  ')).toBe('bob@x.io')
  })

  it('returns null for an unset filter', () => {
    expect(parseUserNameFilter(undefined)).toBeNull()
    expect(parseUserNameFilter('')).toBeNull()
  })

  it('returns null for filters on other attributes or other operators', () => {
    expect(parseUserNameFilter('displayName eq "x"')).toBeNull()
    expect(parseUserNameFilter('userName co "x"')).toBeNull()
    expect(parseUserNameFilter('userName eq x')).toBeNull() // value must be quoted
  })

  it('does not allow injection past the closing quote', () => {
    // Only the quoted value is captured; trailing SQL-ish junk breaks the match.
    expect(parseUserNameFilter('userName eq "a@b.com" or 1=1')).toBeNull()
  })
})

describe('toScimUser', () => {
  it('maps a users row (camelCase, per postgres.camel) to a SCIM core User', () => {
    const out = toScimUser({
      id: 'u-1',
      email: 'jane@acme.com',
      name: 'Jane Doe',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    })
    expect(out['schemas']).toEqual(['urn:ietf:params:scim:schemas:core:2.0:User'])
    expect(out['id']).toBe('u-1')
    expect(out['userName']).toBe('jane@acme.com')
    expect(out['active']).toBe(true)
    expect(out['emails']).toEqual([{ value: 'jane@acme.com', primary: true }])
    expect(out['displayName']).toBe('Jane Doe')
    expect((out['meta'] as Record<string, unknown>)['resourceType']).toBe('User')
  })

  it('treats only an explicit false isActive as inactive (undefined → active)', () => {
    expect(toScimUser({ id: '1', email: 'a@b.com', isActive: false })['active']).toBe(false)
    expect(toScimUser({ id: '2', email: 'c@d.com' })['active']).toBe(true)
  })

  it('falls back to email for displayName when name is null', () => {
    const out = toScimUser({ id: '3', email: 'x@y.com', name: null })
    expect(out['displayName']).toBe('x@y.com')
    expect((out['name'] as Record<string, unknown>)['formatted']).toBe('')
  })
})
