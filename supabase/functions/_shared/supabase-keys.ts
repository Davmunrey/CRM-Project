/**
 * Helpers to extract the anon / service-role key from either the current
 * format (SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS — JSON dicts)
 * or the legacy deprecated scalars (SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY).
 *
 * Always prefer the new dict format; fall back to the deprecated scalar so
 * existing deployments keep working if only the old secret is present.
 */

function parseDefault(envVar: string | undefined): string | undefined {
  if (!envVar) return undefined
  try {
    const dict = JSON.parse(envVar) as Record<string, string>
    return dict['default'] ?? Object.values(dict)[0]
  } catch {
    return undefined
  }
}

/** Equivalent to the deprecated SUPABASE_ANON_KEY. */
export function getAnonKey(): string {
  return (
    parseDefault(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')) ??
    Deno.env.get('SUPABASE_ANON_KEY') ??
    ''
  )
}

/** Equivalent to the deprecated SUPABASE_SERVICE_ROLE_KEY. */
export function getServiceRoleKey(): string {
  return (
    parseDefault(Deno.env.get('SUPABASE_SECRET_KEYS')) ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    ''
  )
}
