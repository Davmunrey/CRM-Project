import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  parseScopeString,
  scopeParamForBundle,
  scopesIndicateCalendar,
  scopesIndicateGmail,
  type GoogleScopeBundle,
} from '../_shared/google-scopes.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function base64urlEncode(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function getAllowedRedirectUris(): string[] {
  const multi = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URIS')?.split(',').map((s) => s.trim()).filter(Boolean)
  if (multi && multi.length > 0) return multi
  const one = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI')?.trim()
  if (one) return [one]
  return []
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: orgId, error: orgErr } = await callerClient.rpc('get_org_id')
    if (orgErr || !orgId) {
      return new Response(JSON.stringify({ error: 'Organization context not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json().catch(() => ({}))) as { redirect_uri?: string; bundle?: string }
    const redirectUri = typeof body.redirect_uri === 'string' ? body.redirect_uri.trim() : ''
    if (!redirectUri) {
      return new Response(JSON.stringify({ error: 'redirect_uri is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const bundleRaw = typeof body.bundle === 'string' ? body.bundle.trim() : 'primary'
    if (bundleRaw !== 'primary' && bundleRaw !== 'calendar') {
      return new Response(JSON.stringify({ error: 'Invalid bundle (use primary or calendar)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const bundle = bundleRaw as GoogleScopeBundle

    const allowed = getAllowedRedirectUris()
    if (allowed.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Server missing GOOGLE_OAUTH_REDIRECT_URI or GOOGLE_OAUTH_REDIRECT_URIS' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    if (!allowed.includes(redirectUri)) {
      return new Response(JSON.stringify({ error: 'redirect_uri is not allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')?.trim()
    if (!clientId) {
      return new Response(JSON.stringify({ error: 'Server missing GOOGLE_CLIENT_ID' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: existing } = await adminClient
      .from('gmail_tokens')
      .select('scope, is_active, refresh_token_cipher, refresh_token')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .maybeSingle()

    const existingScopes = parseScopeString(existing?.scope)
    const hasActiveGmail =
      !!existing?.is_active && scopesIndicateGmail(existingScopes) &&
      !!(existing.refresh_token_cipher || existing.refresh_token)
    const hasActiveCalendar = !!existing?.is_active && scopesIndicateCalendar(existingScopes)

    if (bundle === 'calendar') {
      if (!hasActiveGmail) {
        return new Response(
          JSON.stringify({ error: 'Connect Google (Gmail) first before enabling Calendar.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      if (hasActiveCalendar) {
        return new Response(
          JSON.stringify({ error: 'Calendar is already connected for this account.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    /** First Gmail grant: need consent + refresh_token. Re-auth: account chooser. Calendar add-on: incremental (omit prompt). */
    const isFirstPrimaryGmail =
      bundle === 'primary' &&
      (!existing?.is_active || !scopesIndicateGmail(existingScopes) ||
        !(existing.refresh_token_cipher || existing.refresh_token))

    await adminClient.from('google_oauth_states').delete().eq('user_id', user.id)
    await adminClient.from('google_oauth_states').delete().lt('expires_at', new Date().toISOString())

    const stateBytes = crypto.getRandomValues(new Uint8Array(16))
    const state = base64urlEncode(stateBytes)

    const verifierBytes = crypto.getRandomValues(new Uint8Array(64))
    const codeVerifier = base64urlEncode(verifierBytes)
    const encoder = new TextEncoder()
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier))
    const codeChallenge = base64urlEncode(new Uint8Array(digest))

    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString()
    const { error: insErr } = await adminClient.from('google_oauth_states').insert({
      user_id: user.id,
      state,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      expires_at: expiresAt,
      bundle,
    })
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopeParamForBundle(bundle),
      state,
      access_type: 'offline',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      include_granted_scopes: 'true',
    })

    if (bundle === 'calendar') {
      // Incremental: let Google show shorter “already has some access” flow; do not force prompt.
    } else if (isFirstPrimaryGmail) {
      params.set('prompt', 'consent')
    } else {
      params.set('prompt', 'select_account')
    }

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    return new Response(JSON.stringify({ url }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
