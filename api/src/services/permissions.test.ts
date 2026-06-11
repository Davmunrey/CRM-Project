import { describe, expect, it } from 'vitest'
import { roleHasPermission, permissionsForRole, ROLES } from './permissions.js'

describe('roleHasPermission', () => {
  it('owner has every permission (including unlisted ones)', () => {
    expect(roleHasPermission('owner', 'billing:manage')) .toBe(true)
    expect(roleHasPermission('owner', 'contacts:delete')).toBe(true)
    expect(roleHasPermission('owner', 'anything:at:all')).toBe(true)
  })

  it('admin has full operational control but is matrix-bounded', () => {
    expect(roleHasPermission('admin', 'settings:manage')).toBe(true)
    expect(roleHasPermission('admin', 'members:manage')).toBe(true)
    expect(roleHasPermission('admin', 'contacts:delete')).toBe(true)
  })

  it('manager manages CRM + reads settings, but cannot manage billing/keys/members', () => {
    expect(roleHasPermission('manager', 'deals:write')).toBe(true)
    expect(roleHasPermission('manager', 'deals:delete')).toBe(true)
    expect(roleHasPermission('manager', 'settings:read')).toBe(true)
    expect(roleHasPermission('manager', 'settings:manage')).toBe(false)
    expect(roleHasPermission('manager', 'billing:manage')).toBe(false)
    expect(roleHasPermission('manager', 'members:manage')).toBe(false)
    expect(roleHasPermission('manager', 'apikeys:manage')).toBe(false)
  })

  it('sales_rep can read/write CRM but not delete or configure', () => {
    expect(roleHasPermission('sales_rep', 'contacts:read')).toBe(true)
    expect(roleHasPermission('sales_rep', 'contacts:write')).toBe(true)
    expect(roleHasPermission('sales_rep', 'contacts:delete')).toBe(false)
    expect(roleHasPermission('sales_rep', 'settings:read')).toBe(false)
    expect(roleHasPermission('sales_rep', 'members:manage')).toBe(false)
  })

  it('viewer is read-only', () => {
    expect(roleHasPermission('viewer', 'contacts:read')).toBe(true)
    expect(roleHasPermission('viewer', 'reports:read')).toBe(true)
    expect(roleHasPermission('viewer', 'contacts:write')).toBe(false)
    expect(roleHasPermission('viewer', 'deals:delete')).toBe(false)
  })

  it('unknown role gets nothing', () => {
    expect(roleHasPermission('', 'contacts:read')).toBe(false)
    expect(roleHasPermission('superuser', 'contacts:read')).toBe(false)
  })
})

describe('permissionsForRole', () => {
  it('owner returns the full union of declared permissions', () => {
    const owner = permissionsForRole('owner')
    expect(owner).toContain('billing:manage')
    expect(owner).toContain('contacts:read')
    expect(owner.length).toBeGreaterThan(permissionsForRole('viewer').length)
  })
  it('viewer ⊂ sales_rep ⊂ manager ⊂ admin (monotonic privilege)', () => {
    const sizes = (['viewer', 'sales_rep', 'manager', 'admin'] as const).map((r) => permissionsForRole(r).length)
    expect(sizes[0]).toBeLessThan(sizes[1])
    expect(sizes[1]).toBeLessThan(sizes[2])
    expect(sizes[2]).toBeLessThan(sizes[3])
  })
  it('ROLES lists all five roles in privilege order', () => {
    expect(ROLES).toEqual(['owner', 'admin', 'manager', 'sales_rep', 'viewer'])
  })
})
