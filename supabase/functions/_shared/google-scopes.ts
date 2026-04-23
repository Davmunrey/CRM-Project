/**
 * Incremental authorization (Crono-style):
 * - `primary`: identity + Gmail (first screen).
 * - `calendar`: Calendar only, after Gmail — Google shows incremental consent when combined with include_granted_scopes.
 */
export const GOOGLE_SCOPE_BUNDLES = {
  primary: [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.modify',
  ],
  calendar: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ],
} as const

export type GoogleScopeBundle = keyof typeof GOOGLE_SCOPE_BUNDLES

export function scopeParamForBundle(bundle: GoogleScopeBundle): string {
  return [...GOOGLE_SCOPE_BUNDLES[bundle]].join(' ')
}

/** All scopes (for declaring in Google Cloud Console consent screen). */
export function allProductScopesJoined(): string {
  const u = new Set<string>([...GOOGLE_SCOPE_BUNDLES.primary, ...GOOGLE_SCOPE_BUNDLES.calendar])
  return [...u].join(' ')
}

export function parseScopeString(scope: string | null | undefined): string[] {
  return (scope ?? '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function mergeScopeLists(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])]
}

export function scopesIndicateGmail(scopes: string[]): boolean {
  return scopes.some((s) => s.includes('gmail.'))
}

export function scopesIndicateCalendar(scopes: string[]): boolean {
  return scopes.some((s) => s.includes('/auth/calendar'))
}
