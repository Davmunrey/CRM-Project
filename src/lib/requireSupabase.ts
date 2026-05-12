/**
 * Compatibility stub — Supabase removed. New code uses `api` from `./api`.
 * Returns a no-op proxy so existing call sites don't crash at runtime
 * while stores are being migrated.
 */
export function requireSupabase(): never {
  throw new Error('[requireSupabase] Supabase removed — use api client from ./api')
}
