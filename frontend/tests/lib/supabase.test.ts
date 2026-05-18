import { describe, it, expect } from 'vitest'
import { supabase, isSupabaseConfigured, dataRuntime } from '../../src/lib/supabase'

describe('supabase lib', () => {
  it('SEC-06: supabase is null at runtime (replaced by Velo API)', () => {
    expect(supabase).toBeNull()
  })

  it('isSupabaseConfigured is true (stub signals Velo API is active)', () => {
    expect(isSupabaseConfigured).toBe(true)
  })

  it('dataRuntime is velo-api', () => {
    expect(dataRuntime).toBe('velo-api')
  })
})
