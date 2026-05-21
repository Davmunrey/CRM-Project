/**
 * n0CRM API compatibility stub — Supabase has been replaced by the n0CRM API.
 * This file preserves imports across the codebase during the migration.
 * Files should be updated to import from `./api` directly over time.
 *
 * `supabase` is typed as unknown | null so existing `if (!supabase)` guards
 * correctly narrow and TypeScript doesn't error on property accesses inside those guards.
 * At runtime the value is always null, so all guarded Supabase code is unreachable.
 */

export type DataRuntime = 'n0crm-api' | 'unconfigured'

export const isSupabaseConfigured = true
export const isBootstrapFatalError = false
export const dataRuntime: DataRuntime = 'n0crm-api'

/** Always null — app uses n0CRM API. Guards that check `supabase &&` will skip Supabase paths. */
export const supabase = null as unknown as null

/** Back-compat: session is now managed via HttpOnly cookie; always returns a non-null sentinel. */
export function getSupabaseSession() {
  return { access_token: 'cookie-auth' }
}
