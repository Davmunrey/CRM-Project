import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getPlainRefreshToken } from '../_shared/gmail-refresh-read.ts'
import { corsHeadersForRequest, isCorsOriginBlocked } from '../_shared/cors-allowlist.ts'
import { resolveOrgId } from '../_shared/resolve-org-id.ts'
import { getAnonKey, getServiceRoleKey } from '../_shared/supabase-keys.ts'

Deno.serve(async (req: Request) => {
  if (isCorsOriginBlocked(req)) {
    console.warn('gmail-disconnect cors_blocked', { origin: req.headers.get('Origin') ?? '' })
    return new Response(JSON.stringify({ error: 'Origin not allowed', code: 'cors_origin_not_allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const cors = corsHeadersForRequest(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' },
    })
  }

  try {
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      getAnonKey(),
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )

    const { data: { user }, error: authErr } = await callerClient.auth.getUser()
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const body = (await req.json().catch(() => ({}))) as { organizationId?: string }
    const requestedOrgId = typeof body.organizationId === 'string'
      ? body.organizationId.replace(/^"+|"+$/g, '').trim()
      : ''

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      getServiceRoleKey(),
    )
    const orgId = (await resolveOrgId(callerClient, adminClient, user)) ?? requestedOrgId
    if (!orgId) {
      return new Response(
        JSON.stringify({ error: 'Organization context not found' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const { data: tokenRow } = await adminClient
      .from('gmail_tokens')
      .select('access_token, refresh_token, refresh_token_cipher')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (tokenRow) {
      let revokeToken: string | null = tokenRow.access_token
      if (!revokeToken) {
        try {
          revokeToken = await getPlainRefreshToken(tokenRow)
        } catch {
          revokeToken = null
        }
      }
      if (revokeToken) {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: revokeToken }),
        }).catch(() => null)
      }
    }

    const { error: deleteErr } = await adminClient
      .from('gmail_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('organization_id', orgId)

    if (deleteErr) {
      console.error('gmail-disconnect delete', deleteErr)
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('gmail-disconnect', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
