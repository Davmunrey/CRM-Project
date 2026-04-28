import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Database } from './database.types'

/** Returns the typed client or throws (call only when `isSupabaseConfigured` is true or after guards). */
export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }
  return supabase
}
