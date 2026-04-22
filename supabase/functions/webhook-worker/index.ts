import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { OUTBOUND_WEBHOOK_SIGNATURE_HEADER } from '../_shared/outboundWebhookSignature.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-worker-secret',
}

const WORKER_HEADER = 'x-webhook-worker-secret'

const RETRY_MS = [3_000, 30_000, 150_000, 300_000, 600_000, 600_000, 600_000]

function subscriptionMatchesEvent(filters: string[] | null | undefined, eventKey: string): boolean {
  const f = filters?.length ? filters : ['*']
  for (const raw of f) {
    const p = raw.trim()
    if (p === '*' || p === '*.*') return true
    if (p === eventKey) return true
    if (p.endsWith('.*')) {
      const prefix = p.slice(0, -2)
      if (prefix && eventKey.startsWith(prefix + '.')) return true
    }
    if (p.startsWith('*.')) {
      const suffix = p.slice(2)
      if (suffix && eventKey.endsWith('.' + suffix)) return true
    }
  }
  return false
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

  const configured = Deno.env.get('WEBHOOK_WORKER_SECRET') ?? ''
  const provided = req.headers.get(WORKER_HEADER) ?? ''
  if (!configured || provided !== configured) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { data: batch, error: qErr } = await admin
      .from('webhook_outbox')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 8)
      .order('created_at', { ascending: true })
      .limit(80)

    if (qErr) throw qErr

    const nowMs = Date.now()
    const rows = (batch ?? []).filter((r) => {
      const nr = r.next_retry_at as string | null
      return !nr || new Date(nr).getTime() <= nowMs
    }).slice(0, 40)

    let processed = 0

    for (const row of rows) {
      const eventKey = row.event_key as string
      const { data: subs, error: sErr } = await admin
        .from('webhook_subscriptions')
        .select('id, target_url, event_filters, custom_headers, schema_version')
        .eq('organization_id', row.organization_id as string)
        .eq('enabled', true)

      if (sErr) throw sErr

      const matched = (subs ?? []).filter((s) =>
        subscriptionMatchesEvent(s.event_filters as string[] | null, eventKey)
      )

      if (matched.length === 0) {
        await admin
          .from('webhook_outbox')
          .update({ status: 'delivered', next_retry_at: null, last_error: null })
          .eq('id', row.id)
        processed++
        continue
      }

      const attemptNum = (row.attempts as number) + 1
      let anyFailure = false
      let lastErr: string | null = null

      for (const sub of matched) {
        const { data: secRow, error: secErr } = await admin
          .from('webhook_subscription_secrets')
          .select('signing_secret')
          .eq('subscription_id', sub.id)
          .single()
        if (secErr || !secRow?.signing_secret) {
          anyFailure = true
          lastErr = 'missing signing secret'
          continue
        }

        const meta = {
          event_id: row.id,
          event: eventKey,
          organization_id: row.organization_id,
          timestamp: new Date().toISOString(),
          schema_version: (sub.schema_version as number) ?? 1,
          delivery_attempt: attemptNum,
          actor_user_id: row.actor_user_id ?? undefined,
        }
        const envelope = { meta, data: row.payload, previous: row.previous ?? null }
        const rawBody = JSON.stringify(envelope)
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
          const res = await fetch(sub.target_url as string, {
            method: 'POST',
            headers,
            body: rawBody,
            signal: AbortSignal.timeout(10_000),
          })
          httpStatus = res.status
          if (!res.ok) errMsg = (await res.text().catch(() => res.statusText)).slice(0, 2000)
        } catch (e) {
          errMsg = e instanceof Error ? e.message : String(e)
        }
        const duration = Date.now() - t0

        await admin.from('webhook_delivery_log').insert({
          outbox_id: row.id,
          subscription_id: sub.id,
          attempt: attemptNum,
          http_status: httpStatus || null,
          duration_ms: duration,
          error_message: errMsg,
        })

        await admin
          .from('webhook_subscriptions')
          .update({
            last_delivery_at: new Date().toISOString(),
            last_http_status: httpStatus || null,
            last_delivery_error: errMsg,
          })
          .eq('id', sub.id)

        if (errMsg || httpStatus < 200 || httpStatus >= 300) {
          anyFailure = true
          lastErr = errMsg ?? `HTTP ${httpStatus}`
        }
      }

      if (!anyFailure) {
        await admin
          .from('webhook_outbox')
          .update({ status: 'delivered', next_retry_at: null, last_error: null })
          .eq('id', row.id)
      } else {
        const nextAttempts = attemptNum
        const delay = RETRY_MS[Math.min(nextAttempts - 1, RETRY_MS.length - 1)] ?? 60_000
        const nextAt = new Date(Date.now() + delay).toISOString()
        if (nextAttempts >= 8) {
          await admin
            .from('webhook_outbox')
            .update({
              status: 'failed',
              attempts: nextAttempts,
              next_retry_at: null,
              last_error: lastErr ?? 'delivery failed',
            })
            .eq('id', row.id)
        } else {
          await admin
            .from('webhook_outbox')
            .update({
              attempts: nextAttempts,
              next_retry_at: nextAt,
              last_error: lastErr ?? 'delivery failed',
            })
            .eq('id', row.id)
        }
      }
      processed++
    }

    return new Response(JSON.stringify({ success: true, processed }), {
      status: 200,
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
