import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getPlainRefreshToken } from '../_shared/gmail-refresh-read.ts'

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
        JSON.stringify({ error: 'Organization context not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: tokenRow, error: fetchErr } = await adminClient
      .from('gmail_tokens')
      .select('refresh_token, refresh_token_cipher, email_address')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .single()

    if (fetchErr || !tokenRow) {
      return new Response(
        JSON.stringify({ error: 'No Gmail connection found for this user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let refreshPlain: string
    try {
      refreshPlain = await getPlainRefreshToken(tokenRow)
    } catch {
      return new Response(
        JSON.stringify({ error: 'No Gmail connection found for this user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshPlain,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        grant_type: 'refresh_token',
      }),
    })

    if (!refreshRes.ok) {
      const errBody = await refreshRes.json().catch(() => ({})) as { error?: string; error_description?: string }
      if (errBody.error === 'invalid_grant') {
        await adminClient
          .from('gmail_tokens')
          .update({ is_active: false, revoked_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('organization_id', orgId)
      }
      return new Response(
        JSON.stringify({ error: errBody.error_description ?? 'Token refresh failed', code: errBody.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const refreshed = await refreshRes.json() as {
      access_token: string
      expires_in: number
      scope: string
      token_type: string
    }

    await adminClient
      .from('gmail_tokens')
      .update({
        access_token: null,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        scope: refreshed.scope,
        token_type: refreshed.token_type ?? 'Bearer',
      })
      .eq('user_id', user.id)
      .eq('organization_id', orgId)

    return new Response(
      JSON.stringify({
        access_token: refreshed.access_token,
        expires_in: refreshed.expires_in,
        email_address: tokenRow.email_address,
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
