import { describe, expect, it } from 'vitest'
import {
  extractWorkspaceSlugFromHost,
  inferWorkspaceSlugFromHostname,
  resolveWorkspaceSlugFromWindowHostname,
} from '../src/lib/workspaceSlug'

describe('extractWorkspaceSlugFromHost', () => {
  it('returns null on apex', () => {
    expect(extractWorkspaceSlugFromHost('crm.example.com', 'crm.example.com')).toBeNull()
  })

  it('extracts single-label subdomain', () => {
    expect(extractWorkspaceSlugFromHost('clovrlabssl.crm.example.com', 'crm.example.com')).toBe('clovrlabssl')
  })

  it('returns null when host does not end with root', () => {
    expect(extractWorkspaceSlugFromHost('other.com', 'crm.example.com')).toBeNull()
  })

  it('returns null for multi-level prefix', () => {
    expect(extractWorkspaceSlugFromHost('a.b.crm.example.com', 'crm.example.com')).toBeNull()
  })

  it('trims and lowercases', () => {
    expect(extractWorkspaceSlugFromHost('  AcMe.CRM.EXAMPLE.COM  ', 'crm.example.com')).toBe('acme')
  })
})

describe('inferWorkspaceSlugFromHostname', () => {
  it('extracts first label on public suffix style host', () => {
    expect(inferWorkspaceSlugFromHostname('clovrlabssl.pipedrive.com')).toBe('clovrlabssl')
  })

  it('returns null on apex', () => {
    expect(inferWorkspaceSlugFromHostname('pipedrive.com')).toBeNull()
  })

  it('returns null for localhost', () => {
    expect(inferWorkspaceSlugFromHostname('localhost')).toBeNull()
  })

  it('supports acme.localhost', () => {
    expect(inferWorkspaceSlugFromHostname('acme.localhost')).toBe('acme')
  })

  it('skips vercel preview hosts', () => {
    expect(inferWorkspaceSlugFromHostname('my-app-abc123.vercel.app')).toBeNull()
  })

  it('skips privateprompt app staging hosts', () => {
    expect(inferWorkspaceSlugFromHostname('staging.apps.privateprompt.tech')).toBeNull()
  })

  it('skips reserved www', () => {
    expect(inferWorkspaceSlugFromHostname('www.example.com')).toBeNull()
  })
})

describe('resolveWorkspaceSlugFromWindowHostname', () => {
  it('uses explicit root when set', () => {
    expect(resolveWorkspaceSlugFromWindowHostname('acme.crm.example.com', 'crm.example.com')).toBe('acme')
    expect(resolveWorkspaceSlugFromWindowHostname('wrong.example.com', 'crm.example.com')).toBeNull()
  })

  it('falls back to inference when root unset', () => {
    expect(resolveWorkspaceSlugFromWindowHostname('acme.example.com', undefined)).toBe('acme')
    expect(resolveWorkspaceSlugFromWindowHostname('acme.example.com', '   ')).toBe('acme')
  })
})
