import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeadersForRequest, isCorsOriginBlocked } from '../_shared/cors-allowlist.ts'

type RequestBody = { slug?: string }

function invalid(message: string, headers: Record<string, string>) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

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

  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return invalid('Invalid JSON', cors)
  }

  const slug = (body.slug ?? '').trim().toLowerCase()
  if (!slug) return invalid('slug is required', cors)
  if (!/^[a-z0-9-]+$/.test(slug)) return invalid('Invalid slug format', cors)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await admin
    .from('organizations')
    .select('id,name')
    .eq('domain', slug)
    .maybeSingle()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ organization: data ?? null }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})

