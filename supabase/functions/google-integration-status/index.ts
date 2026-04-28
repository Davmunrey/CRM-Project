import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseScopeString, scopesIndicateCalendar, scopesIndicateGmail } from '../_shared/google-scopes.ts'
import { corsHeadersForRequest, isCorsOriginBlocked } from '../_shared/cors-allowlist.ts'
import { resolveOrgId } from '../_shared/resolve-org-id.ts'

Deno.serve(async (req: Request) => {
  if (isCorsOriginBlocked(req)) {
    console.warn('google-integration-status cors_blocked', { origin: req.headers.get('Origin') ?? '' })
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
      Deno.env.get('SUPABASE_ANON_KEY')!,
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const orgId = (await resolveOrgId(callerClient, adminClient, user)) ?? requestedOrgId
    if (!orgId) {
      return new Response(
        JSON.stringify({
          connected: false,
          gmailConnected: false,
          calendarConnected: false,
          account: null,
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const { data: row, error: rowErr } = await callerClient
      .from('gmail_tokens')
      .select('email_address, name, avatar_url, scope, is_active, last_synced_at, created_at, revoked_at')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (rowErr || !row || !row.is_active) {
      return new Response(
        JSON.stringify({
          connected: false,
          gmailConnected: false,
          calendarConnected: false,
          account: null,
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const scopes = parseScopeString(row.scope)
    const gmailConnected = scopesIndicateGmail(scopes)
    const calendarConnected = scopesIndicateCalendar(scopes)
    const connected = gmailConnected

    if (!connected) {
      return new Response(
        JSON.stringify({
          connected: false,
          gmailConnected: false,
          calendarConnected,
          account: null,
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({
        connected: true,
        gmailConnected,
        calendarConnected,
        account: {
          email: row.email_address,
          name: row.name,
          avatarUrl: row.avatar_url,
          scopes,
          lastSyncedAt: row.last_synced_at,
          createdAt: row.created_at,
        },
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('google-integration-status', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
