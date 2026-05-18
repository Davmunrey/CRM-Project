import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { clientIpFromRequest, rateLimitHit } from '../_shared/edge-rate-limit.ts'
import { corsHeadersForRequest, isCorsOriginBlocked } from '../_shared/cors-allowlist.ts'
import { getServiceRoleKey } from '../_shared/supabase-keys.ts'

const MAX_BODY_BYTES = 65_536
const RATE_MAX = 40
const RATE_WINDOW_MS = 3_600_000

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
    return new Response(
      JSON.stringify({
        error: 'Origin not allowed',
        code: 'cors_origin_not_allowed',
        status: 403,
        request_id: requestId,
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }
  const cors = corsHeadersForRequest(req, '')
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...cors, 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
    })
  }
  if (req.method !== 'POST') {
    return respond(requestId, 405, { error: 'Method not allowed', code: 'method_not_allowed' }, cors)
  }

  try {
    const rawBody = await req.text()
    if (rawBody.length > MAX_BODY_BYTES) {
      return respond(requestId, 413, { error: 'Payload too large', code: 'payload_too_large' }, cors)
    }
    let body: {
      token?: string
      first_name?: string
      last_name?: string
      email?: string
      phone?: string
      company_name?: string
      notes?: string
      website?: string
    }
    try {
      body = JSON.parse(rawBody || '{}') as typeof body
    } catch {
      return respond(requestId, 400, { error: 'Invalid JSON', code: 'validation_error' }, cors)
    }

    const rawToken = (body.token ?? '').trim()
    if (!rawToken.startsWith('lct_')) {
      logEvent('warn', requestId, 'token_validation_failed', { reason: 'invalid_token_format' })
      return respond(requestId, 401, { error: 'Invalid token', code: 'unauthorized' }, cors)
    }

    if (body.website && String(body.website).trim() !== '') {
      logEvent('log', requestId, 'honeypot_triggered', { result: 'ignored' })
      return respond(requestId, 200, { ok: true }, cors)
    }

    const first = (body.first_name ?? '').trim()
    const last = (body.last_name ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    if (!first || !last || !email) {
      return respond(requestId, 400, {
        error: 'first_name, last_name, and email are required',
        code: 'validation_error',
      }, cors)
    }

    const tokenHash = await sha256Hex(rawToken)
    const ip = clientIpFromRequest(req)
    const rlKey = `lead_capture:${tokenHash}:${ip}`
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
      getServiceRoleKey(),
    )

    const { data: tok, error: tErr } = await admin
      .from('lead_capture_tokens')
      .select('id, organization_id, enabled')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (tErr || !tok || !tok.enabled) {
      logEvent('warn', requestId, 'token_validation_failed', { reason: 'invalid_or_disabled_token' })
      return respond(requestId, 401, { error: 'Invalid or disabled token', code: 'unauthorized' }, cors)
    }

    const orgId = tok.organization_id as string
    const { data: lead, error: insErr } = await admin
      .from('leads')
      .insert({
        organization_id: orgId,
        first_name: first,
        last_name: last,
        email,
        phone: body.phone?.trim() || null,
        company_name: body.company_name?.trim() || null,
        notes: body.notes?.trim() || null,
        source: 'website',
      })
      .select('id')
      .single()

    if (insErr) {
      const msg = insErr.message ?? 'Insert failed'
      const isDup = msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')
      if (isDup) {
        logEvent('log', requestId, 'lead_insert_duplicate', {
          organization_id: orgId,
          result: 'duplicate',
          status: 200,
          latency_ms: Date.now() - startedAt,
        })
        return respond(requestId, 200, { ok: true, duplicate: true }, cors)
      }
      logEvent('error', requestId, 'lead_insert_failed', { organization_id: orgId, error: msg })
      return respond(requestId, 400, { error: 'Could not create lead', code: 'insert_failed' }, cors)
    }

    logEvent('log', requestId, 'lead_insert_success', {
      action: 'create',
      organization_id: orgId,
      result: 'success',
      status: 200,
      latency_ms: Date.now() - startedAt,
      lead_id: lead?.id ?? null,
    })
    return respond(requestId, 200, { ok: true, leadId: lead?.id }, cors)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logEvent('error', requestId, 'unhandled_exception', { error: msg })
    return respond(requestId, 500, { error: 'Internal error', code: 'internal_error' }, cors)
  }
})
