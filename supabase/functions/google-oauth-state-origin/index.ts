import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeadersForRequest, isCorsOriginBlocked } from '../_shared/cors-allowlist.ts'

// Simple in-memory rate limiter per IP: max 20 req/min
const ipRequestLog = new Map<string, number[]>()
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const log = ipRequestLog.get(ip) ?? []
  const recent = log.filter((ts) => now - ts < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) return true
  recent.push(now)
  ipRequestLog.set(ip, recent)
  // Cleanup old entries periodically
  if (ipRequestLog.size > 1000) {
    for (const [key, times] of ipRequestLog) {
      if (times.every((ts) => now - ts >= RATE_WINDOW_MS)) ipRequestLog.delete(key)
    }
  }
  return false
}

Deno.serve(async (req: Request) => {
  if (isCorsOriginBlocked(req)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const cors = corsHeadersForRequest(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Rate limit by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': '60' },
    })
  }

  const url = new URL(req.url)
  const state = url.searchParams.get('state')?.trim()

  if (!state || state.length < 4 || state.length > 512) {
    return new Response(JSON.stringify({ original_origin: null }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data } = await adminClient
      .from('google_oauth_states')
      .select('original_origin, expires_at')
      .eq('state', state)
      .maybeSingle()

    // Return null if not found or expired
    if (!data) {
      return new Response(JSON.stringify({ original_origin: null }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const expired = data.expires_at && new Date(data.expires_at).getTime() < Date.now()
    if (expired) {
      return new Response(JSON.stringify({ original_origin: null }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ original_origin: data.original_origin ?? null }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(JSON.stringify({ event: 'google_oauth_state_origin_error', error: (err as Error).message }))
    return new Response(JSON.stringify({ original_origin: null }), {
      status: 200, // Return 200 with null — failure to lookup is non-fatal for the OAuth flow
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
