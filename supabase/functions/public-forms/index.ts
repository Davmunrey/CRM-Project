import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'

serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const url = new URL(req.url)
  const token = url.searchParams.get('token') ?? url.pathname.split('/').pop()

  if (!token) return jsonResponse({ error: 'Form token required' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { data: formConfig } = await supabase
    .from('lead_form_configs')
    .select('*')
    .eq('public_token', token)
    .maybeSingle()

  if (!formConfig) return jsonResponse({ error: 'Form not found' }, 404)

  if (req.method === 'GET') {
    return jsonResponse({ name: formConfig.name, fields: formConfig.fields ?? [] })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const { data, error } = await supabase
      .from('leads')
      .insert({
        organization_id: formConfig.organization_id,
        first_name: body.firstName ?? body.first_name ?? '',
        last_name: body.lastName ?? body.last_name ?? '',
        email: body.email,
        source: 'web_form',
        status: 'new',
      })
      .select('*')
      .single()
    if (error) return jsonResponse({ error: error.message }, 400)
    return jsonResponse({ success: true, id: data.id }, 201)
  }

  return jsonResponse({ error: 'Method not allowed' }, 405)
})
