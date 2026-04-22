import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
}

const COLLECTIONS = ['deals', 'contacts', 'companies', 'activities'] as const

function logEvent(
  level: 'log' | 'warn' | 'error',
  requestId: string,
  event: string,
  meta: Record<string, unknown>,
) {
  console[level](JSON.stringify({ level, request_id: requestId, event, ...meta }))
}

function respond(
  requestId: string,
  status: number,
  payload: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify({ ...payload, status, request_id: requestId }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  const requestId = req.headers.get('x-request-id')?.trim() || crypto.randomUUID()
  const startedAt = Date.now()
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
    })
  }
  if (req.method !== 'GET') {
    return respond(requestId, 405, { error: 'Method not allowed', code: 'method_not_allowed' })
  }

  const auth = req.headers.get('Authorization') ?? ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (!m?.[1]) {
    logEvent('warn', requestId, 'auth_failed', { reason: 'missing_bearer_token' })
    return respond(requestId, 401, { error: 'Missing Bearer token', code: 'unauthorized' })
  }
  const rawKey = m[1].trim()
  if (!rawKey.startsWith('crm_live_')) {
    logEvent('warn', requestId, 'auth_failed', { reason: 'invalid_key_format' })
    return respond(requestId, 401, { error: 'Invalid API key format', code: 'unauthorized' })
  }

  const keyHash = await sha256Hex(rawKey)
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: keyRow, error: kErr } = await admin
    .from('organization_api_keys')
    .select('id, organization_id, revoked_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .maybeSingle()

  if (kErr || !keyRow) {
    logEvent('warn', requestId, 'auth_failed', { reason: 'invalid_or_revoked_key', status: 401 })
    return respond(requestId, 401, { error: 'Invalid or revoked API key', code: 'unauthorized' })
  }

  const orgId = keyRow.organization_id as string
  const url = new URL(req.url)
  const collection = url.searchParams.get('collection') ?? ''
  if (!COLLECTIONS.includes(collection as (typeof COLLECTIONS)[number])) {
    return respond(requestId, 400, {
      error: 'collection must be one of: ' + COLLECTIONS.join(', '),
      code: 'validation_error',
    })
  }
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50))

  const table = collection
  const { data: rows, error: qErr } = await admin
    .from(table)
    .select('*')
    .eq('organization_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (qErr) {
    logEvent('error', requestId, 'query_failed', { collection, organization_id: orgId, error: qErr.message })
    return respond(requestId, 400, { error: qErr.message, code: 'query_failed' })
  }

  await admin
    .from('organization_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRow.id)

  logEvent('log', requestId, 'public_api_query_success', {
    action: 'list',
    organization_id: orgId,
    result: 'success',
    status: 200,
    latency_ms: Date.now() - startedAt,
    collection,
    limit,
  })
  return respond(requestId, 200, { data: rows ?? [], meta: { collection, limit } })
})
