import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { mergeScopeLists, parseScopeString } from '../_shared/google-scopes.ts'
import { encryptToken, requireTokenEncryptionKey } from '../_shared/token-cipher.ts'
import { corsHeadersForRequest, isCorsOriginBlocked } from '../_shared/cors-allowlist.ts'

function decodeJwtPayload(idToken: string): Record<string, unknown> {
  const parts = idToken.split('.')
  if (parts.length < 2) {
    throw new Error('invalid_id_token')
  }
  const payload = parts[1]!
  const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4
  const padded = b64 + (pad ? '='.repeat(4 - pad) : '')
  const json = atob(padded)
  return JSON.parse(json) as Record<string, unknown>
}

type GmailTokenRow = {
  scope: string | null
  is_active: boolean | null
  refresh_token_cipher: string | null
  refresh_token: string | null
  email_address: string | null
  google_sub: string | null
  name: string | null
  avatar_url: string | null
}

Deno.serve(async (req: Request) => {
  if (isCorsOriginBlocked(req)) {
    console.warn('gmail-oauth-exchange cors_blocked', { origin: req.headers.get('Origin') ?? '' })
    return new Response(JSON.stringify({ error: 'Origin not allowed', code: 'cors_origin_not_allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const cors = corsHeadersForRequest(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...cors, 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
    })
  }

  try {
    const body = (await req.json()) as {
      code?: string
      code_verifier?: string
      redirect_uri?: string
      state?: string
    }

    const { code, redirect_uri } = body
    if (!code || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: 'code and redirect_uri are required' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

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

    const { data: orgId, error: orgErr } = await callerClient.rpc('get_org_id')
    if (orgErr || !orgId) {
      return new Response(
        JSON.stringify({ error: 'Organization context not found' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: existing } = await adminClient
      .from('gmail_tokens')
      .select(
        'scope, is_active, refresh_token_cipher, refresh_token, email_address, google_sub, name, avatar_url',
      )
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .maybeSingle()

    const existingRow = existing as GmailTokenRow | null

    let codeVerifier: string | undefined = body.code_verifier
    if (body.state) {
      const { data: st, error: stErr } = await adminClient
        .from('google_oauth_states')
        .select('user_id, code_verifier, redirect_uri, expires_at, bundle')
        .eq('state', body.state)
        .single()

      if (stErr || !st) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired OAuth state. Please try again.' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }
      if (st.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'state_mismatch' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }
      if (st.redirect_uri !== redirect_uri) {
        return new Response(
          JSON.stringify({ error: 'redirect_uri_mismatch' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }
      if (new Date(st.expires_at) < new Date()) {
        await adminClient.from('google_oauth_states').delete().eq('state', body.state)
        return new Response(
          JSON.stringify({ error: 'OAuth state expired. Please try again.' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }
      codeVerifier = st.code_verifier
      await adminClient.from('google_oauth_states').delete().eq('state', body.state)
    }

    if (!codeVerifier) {
      return new Response(
        JSON.stringify({ error: 'code_verifier or state is required' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        code_verifier: codeVerifier,
        redirect_uri,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.json().catch(() => ({})) as { error_description?: string }
      return new Response(
        JSON.stringify({ error: errBody.error_description ?? 'Google token exchange failed' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const tokens = await tokenRes.json() as {
      access_token: string
      refresh_token?: string
      expires_in: number
      scope: string
      token_type: string
      id_token?: string
    }

    const hadStoredRefresh = !!(existingRow?.refresh_token_cipher || existingRow?.refresh_token)
    if (!tokens.refresh_token && !hadStoredRefresh) {
      return new Response(
        JSON.stringify({
          error: 'No refresh_token returned. Try again from Settings, or revoke Velo at myaccount.google.com/permissions and reconnect.',
        }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    requireTokenEncryptionKey()
    let refreshCipher: string
    if (tokens.refresh_token) {
      refreshCipher = await encryptToken(tokens.refresh_token)
    } else if (existingRow?.refresh_token_cipher) {
      refreshCipher = existingRow.refresh_token_cipher
    } else if (existingRow?.refresh_token) {
      refreshCipher = await encryptToken(existingRow.refresh_token)
    } else {
      return new Response(
        JSON.stringify({ error: 'No refresh_token available' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const mergedScopes = mergeScopeLists(
      parseScopeString(existingRow?.scope),
      parseScopeString(tokens.scope),
    )
    const scopeStr = mergedScopes.join(' ')

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!
    let email = ''
    let googleSub = ''
    let name: string | null = null
    let avatarUrl: string | null = null

    if (tokens.id_token) {
      const payload = decodeJwtPayload(tokens.id_token)
      const aud = payload.aud
      if (aud !== clientId) {
        return new Response(
          JSON.stringify({ error: 'id_token audience mismatch' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }
      const iss = String(payload.iss ?? '')
      if (iss !== 'https://accounts.google.com' && iss !== 'accounts.google.com') {
        return new Response(
          JSON.stringify({ error: 'id_token issuer invalid' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }
      const exp = Number(payload.exp ?? 0)
      if (exp * 1000 < Date.now() - 60_000) {
        return new Response(
          JSON.stringify({ error: 'id_token expired' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }
      const sub = String(payload.sub ?? '')
      const em = String(payload.email ?? '')
      if (!sub || !em) {
        return new Response(
          JSON.stringify({ error: 'identity_missing' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }
      const veloEmail = (user.email ?? '').toLowerCase()
      if (veloEmail && em.toLowerCase() !== veloEmail) {
        return new Response(
          JSON.stringify({
            error: 'Google account email must match your Velo login email. Use the Google account for ' + user.email,
          }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }
      googleSub = sub
      email = em
      if (typeof payload.name === 'string') name = payload.name
      if (typeof payload.picture === 'string') avatarUrl = payload.picture
    } else {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (userinfoRes.ok) {
        const uj = await userinfoRes.json() as {
          sub?: string
          email?: string
          name?: string
          picture?: string
        }
        if (uj.email && uj.sub) {
          const veloEmail = (user.email ?? '').toLowerCase()
          if (veloEmail && uj.email.toLowerCase() !== veloEmail) {
            return new Response(
              JSON.stringify({
                error: 'Google account email must match your Velo login email. Use the Google account for ' + user.email,
              }),
              { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
            )
          }
          googleSub = uj.sub
          email = uj.email
          if (typeof uj.name === 'string') name = uj.name
          if (typeof uj.picture === 'string') avatarUrl = uj.picture
        }
      }

      if (!email || !googleSub) {
        const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        const profile = await profileRes.json() as { emailAddress?: string }
        if (profile.emailAddress) {
          const veloEmail = (user.email ?? '').toLowerCase()
          if (veloEmail && profile.emailAddress.toLowerCase() !== veloEmail) {
            return new Response(
              JSON.stringify({
                error: 'Google account email must match your Velo login email. Use the Google account for ' + user.email,
              }),
              { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
            )
          }
          email = profile.emailAddress
          googleSub = profile.emailAddress
        }
      }

      if (!email || !googleSub) {
        if (existingRow?.email_address) {
          email = existingRow.email_address
          googleSub = existingRow.google_sub ?? existingRow.email_address
          name = existingRow.name
          avatarUrl = existingRow.avatar_url
        } else {
          return new Response(
            JSON.stringify({ error: 'Could not resolve Google identity (no id_token). Try primary connect again.' }),
            { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
          )
        }
      }
    }

    if (!email || !googleSub) {
      return new Response(
        JSON.stringify({ error: 'identity_missing' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const { error: upsertErr } = await adminClient
      .from('gmail_tokens')
      .upsert(
        {
          user_id: user.id,
          organization_id: orgId,
          email_address: email,
          google_sub: googleSub,
          name,
          avatar_url: avatarUrl,
          refresh_token: null,
          refresh_token_cipher: refreshCipher,
          access_token: null,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          scope: scopeStr,
          token_type: tokens.token_type ?? 'Bearer',
          is_active: true,
          revoked_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,organization_id' },
      )

    if (upsertErr) {
      console.error('gmail-oauth-exchange upsert', upsertErr)
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({
        access_token: tokens.access_token,
        expires_in: tokens.expires_in,
        email_address: email,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('gmail-oauth-exchange', err)
    const msg = (err as Error).message ?? ''
    if (msg.includes('TOKEN_ENCRYPTION_KEY')) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    if (msg === 'invalid_id_token') {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
