/**
 * Optional CORS tightening: set EDGE_CORS_ORIGINS to comma-separated exact origins
 * (e.g. https://app.example.com,http://localhost:5174). If unset, falls back to *.
 */

function parseAllowedOrigins(): string[] {
  const raw = Deno.env.get('EDGE_CORS_ORIGINS')?.trim()
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
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
  if (origin && allowed.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': baseHeaders,
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin',
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
