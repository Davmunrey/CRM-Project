import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'

serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/public-api/, '') || url.pathname
  const apiKey = req.headers.get('x-api-key') ?? url.searchParams.get('api_key')

  if (!apiKey) return jsonResponse({ error: 'API key required' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { data: keyRow } = await supabase
    .from('api_keys')
    .select('organization_id, scopes, is_active')
    .eq('key_hash', apiKey)
    .maybeSingle()

  if (!keyRow?.is_active) return jsonResponse({ error: 'Invalid API key' }, 401)

  if (path === '/contacts' && req.method === 'GET') {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, status, created_at')
      .eq('organization_id', keyRow.organization_id)
      .limit(100)
    if (error) return jsonResponse({ error: error.message }, 400)
    return jsonResponse({ data })
  }

  if (path === '/contacts' && req.method === 'POST') {
    const body = await req.json()
    const { data, error } = await supabase
      .from('contacts')
      .insert({ ...body, organization_id: keyRow.organization_id })
      .select('*')
      .single()
    if (error) return jsonResponse({ error: error.message }, 400)
    return jsonResponse(data, 201)
  }

  return jsonResponse({ error: `Public route not found: ${path}` }, 404)
})
