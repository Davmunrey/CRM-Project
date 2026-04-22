import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
}

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
      headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
    })
  }
  if (req.method !== 'POST') {
    return respond(requestId, 405, { error: 'Method not allowed', code: 'method_not_allowed' })
  }

  try {
    const body = (await req.json()) as {
      token?: string
      first_name?: string
      last_name?: string
      email?: string
      phone?: string
      company_name?: string
      notes?: string
      website?: string
    }

    const rawToken = (body.token ?? '').trim()
    if (!rawToken.startsWith('lct_')) {
      logEvent('warn', requestId, 'token_validation_failed', { reason: 'invalid_token_format' })
      return respond(requestId, 401, { error: 'Invalid token', code: 'unauthorized' })
    }

    if (body.website && String(body.website).trim() !== '') {
      logEvent('log', requestId, 'honeypot_triggered', { result: 'ignored' })
      return respond(requestId, 200, { ok: true })
    }

    const first = (body.first_name ?? '').trim()
    const last = (body.last_name ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    if (!first || !last || !email) {
      return respond(requestId, 400, {
        error: 'first_name, last_name, and email are required',
        code: 'validation_error',
      })
    }

    const tokenHash = await sha256Hex(rawToken)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: tok, error: tErr } = await admin
      .from('lead_capture_tokens')
      .select('id, organization_id, enabled')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (tErr || !tok || !tok.enabled) {
      logEvent('warn', requestId, 'token_validation_failed', { reason: 'invalid_or_disabled_token' })
      return respond(requestId, 401, { error: 'Invalid or disabled token', code: 'unauthorized' })
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
        return respond(requestId, 200, { ok: true, duplicate: true })
      }
      logEvent('error', requestId, 'lead_insert_failed', { organization_id: orgId, error: msg })
      return respond(requestId, 400, { error: msg, code: 'insert_failed' })
    }

    logEvent('log', requestId, 'lead_insert_success', {
      action: 'create',
      organization_id: orgId,
      result: 'success',
      status: 200,
      latency_ms: Date.now() - startedAt,
      lead_id: lead?.id ?? null,
    })
    return respond(requestId, 200, { ok: true, leadId: lead?.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logEvent('error', requestId, 'unhandled_exception', { error: msg })
    return respond(requestId, 500, { error: msg, code: 'internal_error' })
  }
})
