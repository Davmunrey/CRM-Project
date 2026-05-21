import { describe, it, expect } from 'vitest'
import { supabase, isSupabaseConfigured, dataRuntime } from '../../src/lib/supabase'

describe('supabase lib', () => {
  it('SEC-06: supabase is null at runtime (n0CRM API is used instead)', () => {
    expect(supabase).toBeNull()
  })

  it('isSupabaseConfigured is true (stub signals n0CRM API is active)', () => {
    expect(isSupabaseConfigured).toBe(true)
  })

  it('dataRuntime is n0crm-api', () => {
    expect(dataRuntime).toBe('n0crm-api')
  })
})
