import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    return { ok: false as const, status: 403, message: 'Only admins, owners, or managers can manage API keys' }
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return respond(requestId, 405, { error: 'Method not allowed', code: 'method_not_allowed' })
  }

  try {
    const body = (await req.json()) as {
      action?: string
      organizationId?: string
      name?: string
      keyId?: string
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
      const name = (body.name ?? '').trim()
      if (!name) {
        return respond(requestId, 400, { error: 'name is required', code: 'validation_error' })
      }
      const rawKey = 'crm_live_' + toBase64Url(randomBytes(32))
      const keyHash = await sha256Hex(rawKey)
      const keyPrefix = rawKey.slice(0, 14)
      const { data: row, error: insErr } = await admin
        .from('organization_api_keys')
        .insert({
          organization_id: organizationId,
          created_by: user.id,
          name,
          key_prefix: keyPrefix,
          key_hash: keyHash,
        })
        .select('id, name, key_prefix, created_at')
        .single()
      if (insErr || !row) {
        logEvent('error', requestId, 'create_key_failed', { organization_id: organizationId, error: insErr?.message ?? 'Insert failed' })
        return respond(requestId, 400, { error: insErr?.message ?? 'Insert failed', code: 'create_failed' })
      }
      logEvent('log', requestId, 'create_key_success', {
        action: 'create',
        organization_id: organizationId,
        user_id: user.id,
        result: 'success',
        status: 200,
        latency_ms: Date.now() - startedAt,
      })
      return respond(requestId, 200, {
        success: true,
        apiKey: rawKey,
        warning: 'Store this key now; it cannot be shown again.',
        key: row,
      })
    }

    if (action === 'list') {
      const { data: rows, error: lErr } = await admin
        .from('organization_api_keys')
        .select('id, name, key_prefix, created_at, revoked_at, last_used_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
      if (lErr) {
        logEvent('error', requestId, 'list_keys_failed', { organization_id: organizationId, error: lErr.message })
        return respond(requestId, 400, { error: lErr.message, code: 'list_failed' })
      }
      logEvent('log', requestId, 'list_keys_success', {
        action: 'list',
        organization_id: organizationId,
        user_id: user.id,
        result: 'success',
        status: 200,
        latency_ms: Date.now() - startedAt,
      })
      return respond(requestId, 200, { success: true, keys: rows ?? [] })
    }

    if (action === 'revoke' || action === 'delete') {
      const gate = assertPrivilegedRole(membership.role)
      if (!gate.ok) {
        return respond(requestId, gate.status, { error: gate.message, code: 'forbidden' })
      }
      const keyId = body.keyId
      if (!keyId) {
        return respond(requestId, 400, { error: 'keyId is required', code: 'validation_error' })
      }
      if (action === 'delete') {
        const { data: deleted, error: dErr } = await admin
          .from('organization_api_keys')
          .delete()
          .eq('id', keyId)
          .eq('organization_id', organizationId)
          .select('id')
          .maybeSingle()
        if (dErr) {
          logEvent('error', requestId, 'delete_key_failed', { organization_id: organizationId, key_id: keyId, error: dErr.message })
          return respond(requestId, 400, { error: dErr.message, code: 'delete_failed' })
        }
        logEvent('log', requestId, 'delete_key_success', {
          action: 'delete',
          organization_id: organizationId,
          user_id: user.id,
          key_id: keyId,
          result: 'success',
          status: 200,
          latency_ms: Date.now() - startedAt,
          deleted: !!deleted,
        })
        return respond(requestId, 200, { success: true, deleted: !!deleted })
      }

      const { data: updated, error: uErr } = await admin
        .from('organization_api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', keyId)
        .eq('organization_id', organizationId)
        .select('id')
        .maybeSingle()
      if (uErr) {
        logEvent('error', requestId, 'revoke_key_failed', { organization_id: organizationId, key_id: keyId, error: uErr.message })
        return respond(requestId, 400, { error: uErr.message, code: 'revoke_failed' })
      }
      logEvent('log', requestId, 'revoke_key_success', {
        action: 'revoke',
        organization_id: organizationId,
        user_id: user.id,
        key_id: keyId,
        result: 'success',
        status: 200,
        latency_ms: Date.now() - startedAt,
        updated: !!updated,
      })
      return respond(requestId, 200, { success: true, updated: !!updated })
    }

    return respond(requestId, 400, { error: 'Unknown action', code: 'unknown_action' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logEvent('error', requestId, 'unhandled_exception', { error: msg })
    return respond(requestId, 500, { error: msg, code: 'internal_error' })
  }
})
