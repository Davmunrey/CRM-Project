import { describe, expect, it } from 'vitest'
import { crudAction } from './rbac.js'
import { roleHasPermission } from '../services/permissions.js'

describe('crudAction', () => {
  it('maps reads', () => {
    expect(crudAction('GET')).toBe('read')
    expect(crudAction('head')).toBe('read')
  })
  it('maps delete', () => {
    expect(crudAction('DELETE')).toBe('delete')
  })
  it('maps mutations to write', () => {
    expect(crudAction('POST')).toBe('write')
    expect(crudAction('PUT')).toBe('write')
    expect(crudAction('PATCH')).toBe('write')
  })
})

// Sanity: the CRUD guard's effective decision per role for a resource.
describe('CRUD permission decisions', () => {
  const decide = (role: string, method: string, resource = 'contacts') =>
    roleHasPermission(role, `${resource}:${crudAction(method)}`)

  it('viewer can read but not write/delete', () => {
    expect(decide('viewer', 'GET')).toBe(true)
    expect(decide('viewer', 'POST')).toBe(false)
    expect(decide('viewer', 'DELETE')).toBe(false)
  })
  it('sales_rep can read/write but not delete', () => {
    expect(decide('sales_rep', 'GET')).toBe(true)
    expect(decide('sales_rep', 'PATCH')).toBe(true)
    expect(decide('sales_rep', 'DELETE')).toBe(false)
  })
  it('manager and admin can delete', () => {
    expect(decide('manager', 'DELETE')).toBe(true)
    expect(decide('admin', 'DELETE')).toBe(true)
  })
  it('owner can do everything', () => {
    expect(decide('owner', 'DELETE')).toBe(true)
    expect(decide('owner', 'POST', 'leads')).toBe(true)
  })
})
