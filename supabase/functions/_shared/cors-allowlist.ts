/**
 * Strict CORS: set Edge secret **EDGE_CORS_ORIGINS** to a comma-separated list of exact
 * browser origins (scheme + host + port), e.g. `https://app.example.com,http://localhost:5173`.
 * Trailing slashes on entries are stripped for matching. If unset, responses use `*`.
 *
 * When the allowlist is non-empty:
 * - Requests that send **Origin** and it is not in the list → treat as blocked (callers return 403).
 * - Requests with **no** Origin (curl, server) → still emit `Access-Control-Allow-Origin: *`
 *   so Bearer/API flows keep working.
 */

function normalizeOrigin(s: string): string {
  const t = s.trim()
  if ((t.startsWith('http://') || t.startsWith('https://')) && t.endsWith('/')) {
    return t.replace(/\/+$/, '')
  }
  return t
}

function parseAllowedOrigins(): string[] {
  const raw = Deno.env.get('EDGE_CORS_ORIGINS')?.trim()
  if (!raw) return []
  return raw.split(',').map((s) => normalizeOrigin(s)).filter(Boolean)
}

/**
 * True when **EDGE_CORS_ORIGINS** is configured, the client sent **Origin**, and that
 * value (after trim / trailing-slash normalization) is not allowlisted.
 */
export function isCorsOriginBlocked(req: Request): boolean {
  const allowed = parseAllowedOrigins()
  if (allowed.length === 0) return false
  const origin = req.headers.get('Origin')
  if (origin == null || origin === '') return false
  const normalized = normalizeOrigin(origin)
  return !allowed.includes(normalized)
}

export function corsHeadersForRequest(
  req: Request,
  extraAllowedHeaders = '',
): Record<string, string> {
  const allowed = parseAllowedOrigins()
  const baseHeaders = `authorization, x-client-info, apikey, content-type${extraAllowedHeaders ? ', ' + extraAllowedHeaders : ''}`

  if (allowed.length === 0) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': baseHeaders,
    }
  }

  const origin = req.headers.get('Origin')
  if (origin) {
    const normalized = normalizeOrigin(origin)
    if (allowed.includes(normalized)) {
      return {
        'Access-Control-Allow-Origin': normalized,
        'Access-Control-Allow-Headers': baseHeaders,
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin',
      }
    }
  }

  // Non-browser clients (no Origin): still allow wildcard for curl/scripts using Bearer only
  if (!origin) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': baseHeaders,
    }
  }

  return {
    'Access-Control-Allow-Headers': baseHeaders,
    'Vary': 'Origin',
  }
}
