import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeadersForRequest, isCorsOriginBlocked } from '../_shared/cors-allowlist.ts'

async function getOrgMembershipRole(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  organizationId: string,
) : Promise<{ ok: true; role: string } | { ok: false; status: number; message: string }> {
  const { data: membership, error } = await adminClient
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single()
  if (error || !membership) {
    return { ok: false as const, status: 403, message: 'Not a member of this organization' }
  }
  return { ok: true as const, role: String(membership.role ?? '') }
}

function assertPrivilegedRole(role: string) {
  if (!['admin', 'owner', 'manager'].includes(role)) {
    return {
      ok: false as const,
      status: 403,
      message: 'Only admins, owners, or managers can manage lead capture tokens',
    }
  }
  return { ok: true as const }
}

function logEvent(
  level: 'log' | 'warn' | 'error',
  requestId: string,
  event: string,
  meta: Record<string, unknown>,
) {
  console[level](JSON.stringify({ level, request_id: requestId, event, ...meta }))
}

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n)
  crypto.getRandomValues(b)
  return b
}

function toBase64Url(b: Uint8Array): string {
  let s = ''
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]!)
  const bin = btoa(s)
  return bin.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
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
    return new Response(
      JSON.stringify({ error: 'Method not allowed', code: 'method_not_allowed', status: 405, request_id: requestId }),
      { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  function respond(requestId: string, status: number, payload: Record<string, unknown>): Response {
    return new Response(JSON.stringify({ ...payload, status, request_id: requestId }), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = (await req.json()) as {
      action?: string
      organizationId?: string
      label?: string
      tokenId?: string
    }

    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization') ?? ''
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !user) {
      const reason = userErr?.message ?? (authHeader ? 'token_invalid_or_expired' : 'missing_authorization_header')
      logEvent('warn', requestId, 'auth_failed', { reason })
      return respond(requestId, 401, { error: `Unauthorized: ${reason}`, code: 'unauthorized' })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const action = body.action ?? 'list'
    const organizationId = body.organizationId
    if (!organizationId) {
      return respond(requestId, 400, { error: 'organizationId is required', code: 'validation_error' })
    }

    const membership = await getOrgMembershipRole(admin, user.id, organizationId)
    if (!membership.ok) {
      return respond(requestId, membership.status, { error: membership.message, code: 'forbidden' })
    }

    if (action === 'create') {
      const gate = assertPrivilegedRole(membership.role)
      if (!gate.ok) {
        return respond(requestId, gate.status, { error: gate.message, code: 'forbidden' })
      }
      const label = (body.label ?? 'Website form').trim() || 'Website form'
      const raw = 'lct_' + toBase64Url(randomBytes(32))
      const tokenHash = await sha256Hex(raw)
      const { data: row, error: insErr } = await admin
        .from('lead_capture_tokens')
        .insert({
          organization_id: organizationId,
          created_by: user.id,
          label,
          token_hash: tokenHash,
          enabled: true,
        })
        .select('id, label, created_at, enabled')
        .single()
      if (insErr || !row) {
        logEvent('error', requestId, 'create_token_failed', { organization_id: organizationId, error: insErr?.message ?? 'Insert failed' })
        return respond(requestId, 400, { error: insErr?.message ?? 'Insert failed', code: 'create_failed' })
      }
      logEvent('log', requestId, 'create_token_success', {
        action: 'create',
        organization_id: organizationId,
        user_id: user.id,
        result: 'success',
        status: 200,
        latency_ms: Date.now() - startedAt,
      })
      return respond(requestId, 200, {
        success: true,
        token: raw,
        warning: 'Store this token now; it cannot be shown again.',
        row,
      })
    }

    if (action === 'list') {
      const { data: rows, error: lErr } = await admin
        .from('lead_capture_tokens')
        .select('id, label, created_at, enabled')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
      if (lErr) {
        logEvent('error', requestId, 'list_tokens_failed', { organization_id: organizationId, error: lErr.message })
        return respond(requestId, 400, { error: lErr.message, code: 'list_failed' })
      }
      logEvent('log', requestId, 'list_tokens_success', {
        action: 'list',
        organization_id: organizationId,
        user_id: user.id,
        result: 'success',
        status: 200,
        latency_ms: Date.now() - startedAt,
      })
      return respond(requestId, 200, { success: true, tokens: rows ?? [] })
    }

    if (action === 'delete') {
      const gate = assertPrivilegedRole(membership.role)
      if (!gate.ok) {
        return respond(requestId, gate.status, { error: gate.message, code: 'forbidden' })
      }
      const tokenId = body.tokenId
      if (!tokenId) {
        return respond(requestId, 400, { error: 'tokenId is required', code: 'validation_error' })
      }
      const { data: deleted, error: dErr } = await admin
        .from('lead_capture_tokens')
        .delete()
        .eq('id', tokenId)
        .eq('organization_id', organizationId)
        .select('id')
        .maybeSingle()
      if (dErr) {
        logEvent('error', requestId, 'delete_token_failed', { organization_id: organizationId, token_id: tokenId, error: dErr.message })
        return respond(requestId, 400, { error: dErr.message, code: 'delete_failed' })
      }
      logEvent('log', requestId, 'delete_token_success', {
        action,
        organization_id: organizationId,
        user_id: user.id,
        token_id: tokenId,
        result: 'success',
        status: 200,
        latency_ms: Date.now() - startedAt,
        deleted: !!deleted,
      })
      return respond(requestId, 200, { success: true, deleted: !!deleted })
    }

    return respond(requestId, 400, { error: 'Unknown action', code: 'unknown_action' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logEvent('error', requestId, 'unhandled_exception', { error: msg })
    return respond(requestId, 500, { error: msg, code: 'internal_error' })
  }
})
