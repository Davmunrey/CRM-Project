import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeadersForRequest, isCorsOriginBlocked } from '../_shared/cors-allowlist.ts'

type RequestBody = { emailIds?: string[] }

Deno.serve(async (req) => {
  if (isCorsOriginBlocked(req)) return new Response('Forbidden', { status: 403 })
  const cors = corsHeadersForRequest(req)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const emailIds = Array.isArray(body.emailIds) ? body.emailIds.filter(Boolean) : []
  if (emailIds.length === 0) {
    return new Response(JSON.stringify({ success: true, messages: 0, links: 0, events: 0 }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  if (emailIds.length > 500) {
    return new Response(JSON.stringify({ error: 'Too many email ids (max 500)' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token)

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const organizationId = user.app_metadata?.organization_id as string | undefined
  if (!organizationId) {
    return new Response(JSON.stringify({ error: 'Missing organization context' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { error: messageError, count: messageCount } = await admin
    .from('email_tracking_messages')
    .update({ user_id: user.id })
    .eq('organization_id', organizationId)
    .is('user_id', null)
    .in('email_id', emailIds)
    .select('id', { count: 'exact', head: true })

  if (messageError) {
    return new Response(JSON.stringify({ error: messageError.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { error: linkError, count: linkCount } = await admin
    .from('email_tracking_links')
    .update({ user_id: user.id })
    .eq('organization_id', organizationId)
    .is('user_id', null)
    .in('email_id', emailIds)
    .select('id', { count: 'exact', head: true })

  if (linkError) {
    return new Response(JSON.stringify({ error: linkError.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { error: eventError, count: eventCount } = await admin
    .from('email_tracking_events')
    .update({ user_id: user.id })
    .eq('organization_id', organizationId)
    .is('user_id', null)
    .in('email_id', emailIds)
    .select('id', { count: 'exact', head: true })

  if (eventError) {
    return new Response(JSON.stringify({ error: eventError.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({
    success: true,
    messages: messageCount ?? 0,
    links: linkCount ?? 0,
    events: eventCount ?? 0,
  }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})

