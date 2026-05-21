/**
 * Supabase compatibility stub — Supabase has been replaced by the Velo API.
 * This file preserves imports across the codebase during the migration.
 * Files should be updated to import from `./api` directly over time.
 *
 * `supabase` is typed as SupabaseClient | null so existing `if (!supabase)` guards
 * correctly narrow and TypeScript doesn't error on property accesses inside those guards.
 * At runtime the value is always null, so all guarded Supabase code is unreachable.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type DataRuntime = 'velo-api' | 'unconfigured'

export const isSupabaseConfigured = true
export const isBootstrapFatalError = false
export const dataRuntime: DataRuntime = 'velo-api'

/** Always null — Supabase SDK removed. Guards that check `supabase &&` will skip Supabase paths. */
export const supabase = null as unknown as SupabaseClient | null

/** Back-compat: session is now managed via HttpOnly cookie; always returns a non-null sentinel. */
export function getSupabaseSession() {
  return { access_token: 'cookie-auth' }
}
