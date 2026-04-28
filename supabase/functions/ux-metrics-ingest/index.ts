import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeadersForRequest, isCorsOriginBlocked } from '../_shared/cors-allowlist.ts'
import { edgeLog, getRequestId } from '../_shared/requestLog.ts'
import { rateLimitHit } from '../_shared/rateLimit.ts'

type UxEvent = { action: string; timestamp: string; meta?: Record<string, unknown> }

Deno.serve(async (req) => {
  const request_id = getRequestId(req)
  if (isCorsOriginBlocked(req)) {
    return new Response('Forbidden', { status: 403 })
  }
  const cors = corsHeadersForRequest(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const rlKey = `ux:${user.id}`
  if (rateLimitHit(rlKey, 60, 60_000)) {
    edgeLog({
      function: 'ux-metrics-ingest',
      level: 'warn',
      msg: 'rate_limited',
      request_id,
      user_id: user.id,
    })
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let body: { events?: UxEvent[] }
  try {
    body = (await req.json()) as { events?: UxEvent[] }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  const events = Array.isArray(body.events) ? body.events : []
  if (events.length > 200) {
    return new Response(JSON.stringify({ error: 'Too many events' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  edgeLog({
    function: 'ux-metrics-ingest',
    level: 'info',
    msg: 'ux_metrics_ingest',
    request_id,
    user_id: user.id,
    count: events.length,
  })

  return new Response(null, { status: 204, headers: cors })
})
