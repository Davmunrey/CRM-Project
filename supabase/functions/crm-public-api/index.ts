import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { clientIpFromRequest, rateLimitHit } from '../_shared/edge-rate-limit.ts'
import { corsHeadersForRequest, isCorsOriginBlocked } from '../_shared/cors-allowlist.ts'

const COLLECTIONS = ['deals', 'contacts', 'companies', 'activities'] as const

/** Explicit columns per collection (no select('*')). */
const SELECT_BY_COLLECTION: Record<(typeof COLLECTIONS)[number], string> = {
  contacts:
    'id,created_at,updated_at,first_name,last_name,email,phone,job_title,company_id,status,source,score,tags,notes,assigned_to,created_by,last_contacted_at,custom_fields,organization_id,marketing_opt_in,marketing_opt_in_at,marketing_opt_in_source',
  companies:
    'id,created_at,updated_at,name,industry,size,country,city,website,revenue,status,tags,notes,created_by,custom_fields,organization_id',
  deals:
    'id,created_at,updated_at,title,value,stage,probability,expected_close_date,contact_id,company_id,assigned_to,priority,source,notes,quote_items,created_by,custom_fields,organization_id',
  activities:
    'id,created_at,updated_at,type,subject,description,status,deal_id,contact_id,company_id,due_date,completed_at,created_by,assigned_to,outcome,organization_id',
}

const RATE_MAX = 120
const RATE_WINDOW_MS = 60_000

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
}

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
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify({ ...payload, status, request_id: requestId }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  const requestId = req.headers.get('x-request-id')?.trim() || crypto.randomUUID()
  const startedAt = Date.now()
  if (isCorsOriginBlocked(req)) {
    logEvent('warn', requestId, 'cors_blocked', { origin: req.headers.get('Origin') ?? '' })
    return respond(requestId, 403, { error: 'Origin not allowed', code: 'cors_origin_not_allowed' }, {})
  }
  const cors = corsHeadersForRequest(req, '')
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
    })
  }
  if (req.method !== 'GET') {
    return respond(requestId, 405, { error: 'Method not allowed', code: 'method_not_allowed' }, cors)
  }

  const auth = req.headers.get('Authorization') ?? ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (!m?.[1]) {
    logEvent('warn', requestId, 'auth_failed', { reason: 'missing_bearer_token' })
    return respond(requestId, 401, { error: 'Missing Bearer token', code: 'unauthorized' }, cors)
  }
  const rawKey = m[1].trim()
  if (!rawKey.startsWith('crm_live_')) {
    logEvent('warn', requestId, 'auth_failed', { reason: 'invalid_key_format' })
    return respond(requestId, 401, { error: 'Invalid API key format', code: 'unauthorized' }, cors)
  }

  const keyHash = await sha256Hex(rawKey)
  const ip = clientIpFromRequest(req)
  const rlKey = `crm_public:${keyHash}:${ip}`
  const retry = rateLimitHit(rlKey, RATE_MAX, RATE_WINDOW_MS)
  if (retry !== null) {
    logEvent('warn', requestId, 'rate_limited', { retry_after_s: retry })
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        code: 'rate_limited',
        status: 429,
        request_id: requestId,
        retry_after_s: retry,
      }),
      {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': String(retry) },
      },
    )
  }

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
    return respond(requestId, 401, { error: 'Invalid or revoked API key', code: 'unauthorized' }, cors)
  }

  const orgId = keyRow.organization_id as string
  const url = new URL(req.url)
  const collection = url.searchParams.get('collection') ?? ''
  if (!COLLECTIONS.includes(collection as (typeof COLLECTIONS)[number])) {
    return respond(requestId, 400, {
      error: 'collection must be one of: ' + COLLECTIONS.join(', '),
      code: 'validation_error',
    }, cors)
  }
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50))

  const table = collection as (typeof COLLECTIONS)[number]
  const selectCols = SELECT_BY_COLLECTION[table]

  const { data: rows, error: qErr } = await admin
    .from(table)
    .select(selectCols)
    .eq('organization_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (qErr) {
    logEvent('error', requestId, 'query_failed', {
      collection,
      organization_id: orgId,
      error: qErr.message,
      code: qErr.code,
    })
    return respond(requestId, 400, {
      error: 'Query failed',
      code: 'query_failed',
    }, cors)
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
  return respond(requestId, 200, { data: rows ?? [], meta: { collection, limit } }, cors)
})
