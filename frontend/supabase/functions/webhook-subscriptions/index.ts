import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { OUTBOUND_WEBHOOK_SIGNATURE_HEADER } from '../_shared/outboundWebhookSignature.ts'
import { getAnonKey, getServiceRoleKey } from '../_shared/supabase-keys.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function isHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

async function assertPrivilegedOrgMember(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  organizationId: string,
) {
  const { data: membership, error } = await adminClient
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single()
  if (error || !membership) {
    return { ok: false as const, status: 403, message: 'Not a member of this organization' }
  }
  if (!['admin', 'owner', 'manager'].includes(membership.role as string)) {
    return { ok: false as const, status: 403, message: 'Only admins, owners, or managers can manage webhooks' }
  }
  return { ok: true as const }
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = (await req.json()) as {
      action?: string
      organizationId?: string
      name?: string
      targetUrl?: string
      signingSecret?: string
      eventFilters?: string[]
      customHeaders?: Record<string, string>
      subscriptionId?: string
    }

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      getAnonKey(),
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )
    const { data: { user }, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      getServiceRoleKey(),
    )

    const action = body.action ?? 'create'
    const organizationId = body.organizationId

    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'organizationId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const gate = await assertPrivilegedOrgMember(admin, user.id, organizationId)
    if (!gate.ok) {
      return new Response(JSON.stringify({ error: gate.message }), {
        status: gate.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'create') {
      const name = (body.name ?? '').trim()
      const targetUrl = (body.targetUrl ?? '').trim()
      const signingSecret = (body.signingSecret ?? '').trim()
      const eventFilters = Array.isArray(body.eventFilters) && body.eventFilters.length > 0
        ? body.eventFilters.map((s) => s.trim()).filter(Boolean)
        : ['*']
      const customHeaders = body.customHeaders && typeof body.customHeaders === 'object'
        ? body.customHeaders
        : {}

      if (!name || !targetUrl || signingSecret.length < 16) {
        return new Response(
          JSON.stringify({ error: 'name, targetUrl (https), and signingSecret (min 16 chars) are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      if (!isHttpsUrl(targetUrl)) {
        return new Response(JSON.stringify({ error: 'targetUrl must be https://' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: sub, error: insErr } = await admin
        .from('webhook_subscriptions')
        .insert({
          organization_id: organizationId,
          created_by: user.id,
          name,
          target_url: targetUrl,
          enabled: true,
          event_filters: eventFilters,
          custom_headers: customHeaders,
        })
        .select('id, name, target_url, enabled, event_filters, custom_headers, created_at')
        .single()

      if (insErr || !sub) {
        return new Response(JSON.stringify({ error: insErr?.message ?? 'Insert failed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error: secErr } = await admin.from('webhook_subscription_secrets').insert({
        subscription_id: sub.id,
        signing_secret: signingSecret,
      })
      if (secErr) {
        await admin.from('webhook_subscriptions').delete().eq('id', sub.id)
        return new Response(JSON.stringify({ error: secErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true, subscription: sub }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'rotateSecret') {
      const subscriptionId = body.subscriptionId
      const signingSecret = (body.signingSecret ?? '').trim()
      if (!subscriptionId || signingSecret.length < 16) {
        return new Response(JSON.stringify({ error: 'subscriptionId and signingSecret (min 16 chars) required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: row, error: fetchErr } = await admin
        .from('webhook_subscriptions')
        .select('id, organization_id')
        .eq('id', subscriptionId)
        .single()
      if (fetchErr || !row || row.organization_id !== organizationId) {
        return new Response(JSON.stringify({ error: 'Subscription not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { error: upErr } = await admin.from('webhook_subscription_secrets').upsert({
        subscription_id: subscriptionId,
        signing_secret: signingSecret,
      })
      if (upErr) {
        return new Response(JSON.stringify({ error: upErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'listFailedOutbox') {
      const limit = Math.min(50, Math.max(1, Number((body as { limit?: number }).limit) || 20))
      const { data: rows, error: fErr } = await admin
        .from('webhook_outbox')
        .select('id, created_at, event_key, entity_type, entity_id, attempts, last_error, status')
        .eq('organization_id', organizationId)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (fErr) {
        return new Response(JSON.stringify({ error: fErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true, rows: rows ?? [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'replayOutbox') {
      const outboxId = (body as { outboxId?: string }).outboxId
      if (!outboxId) {
        return new Response(JSON.stringify({ error: 'outboxId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: row, error: oErr } = await admin
        .from('webhook_outbox')
        .select('id, organization_id, status')
        .eq('id', outboxId)
        .single()
      if (oErr || !row || row.organization_id !== organizationId) {
        return new Response(JSON.stringify({ error: 'Outbox row not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (row.status !== 'failed') {
        return new Response(JSON.stringify({ error: 'Only failed deliveries can be replayed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { error: uErr } = await admin
        .from('webhook_outbox')
        .update({
          status: 'pending',
          attempts: 0,
          next_retry_at: null,
          last_error: null,
        })
        .eq('id', outboxId)
      if (uErr) {
        return new Response(JSON.stringify({ error: uErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'test') {
      const subscriptionId = body.subscriptionId
      if (!subscriptionId) {
        return new Response(JSON.stringify({ error: 'subscriptionId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: sub, error: sErr } = await admin
        .from('webhook_subscriptions')
        .select('id, organization_id, target_url, custom_headers, schema_version')
        .eq('id', subscriptionId)
        .single()
      if (sErr || !sub || sub.organization_id !== organizationId) {
        return new Response(JSON.stringify({ error: 'Subscription not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: secRow, error: secErr } = await admin
        .from('webhook_subscription_secrets')
        .select('signing_secret')
        .eq('subscription_id', subscriptionId)
        .single()
      if (secErr || !secRow?.signing_secret) {
        return new Response(JSON.stringify({ error: 'Signing secret missing' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const meta = {
        event_id: crypto.randomUUID(),
        event: 'ping',
        organization_id: organizationId,
        timestamp: new Date().toISOString(),
        schema_version: sub.schema_version ?? 1,
        delivery_attempt: 1,
      }
      const payload = { meta, data: { message: 'Velo webhook connectivity test' }, previous: null as null }
      const rawBody = JSON.stringify(payload)
      const signature = await hmacSha256Hex(secRow.signing_secret, rawBody)

      const headers = new Headers({
        'Content-Type': 'application/json',
        [OUTBOUND_WEBHOOK_SIGNATURE_HEADER]: signature,
      })
      const ch = sub.custom_headers as Record<string, string> | null
      if (ch && typeof ch === 'object') {
        for (const [k, v] of Object.entries(ch)) {
          if (k && typeof v === 'string') headers.set(k, v)
        }
      }

      const t0 = Date.now()
      let httpStatus = 0
      let errMsg: string | null = null
      try {
        const res = await fetch(sub.target_url, {
          method: 'POST',
          headers,
          body: rawBody,
          signal: AbortSignal.timeout(10_000),
        })
        httpStatus = res.status
        if (!res.ok) errMsg = await res.text().catch(() => res.statusText)
      } catch (e) {
        errMsg = e instanceof Error ? e.message : String(e)
      }
      const duration = Date.now() - t0

      await admin
        .from('webhook_subscriptions')
        .update({
          last_delivery_at: new Date().toISOString(),
          last_http_status: httpStatus || null,
          last_delivery_error: errMsg,
        })
        .eq('id', subscriptionId)

      return new Response(
        JSON.stringify({
          success: !errMsg && httpStatus >= 200 && httpStatus < 300,
          httpStatus,
          durationMs: duration,
          error: errMsg,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
