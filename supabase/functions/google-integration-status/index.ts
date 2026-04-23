import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseScopeString, scopesIndicateCalendar, scopesIndicateGmail } from '../_shared/google-scopes.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: orgId, error: orgErr } = await callerClient.rpc('get_org_id')
    if (orgErr || !orgId) {
      return new Response(
        JSON.stringify({
          connected: false,
          gmailConnected: false,
          calendarConnected: false,
          account: null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
