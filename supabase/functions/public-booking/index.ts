import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'

serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const url = new URL(req.url)
  const slug = url.pathname.replace(/^\/public-booking\/?/, '').split('/')[0]

  if (!slug) return jsonResponse({ error: 'Booking slug required' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { data: page } = await supabase.from('booking_pages').select('*').eq('slug', slug).maybeSingle()
  if (!page) return jsonResponse({ error: 'Booking page not found' }, 404)

  if (req.method === 'GET') {
    return jsonResponse({
      title: page.title,
      durationMinutes: page.duration_minutes,
      timezone: page.timezone,
    })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        booking_page_id: page.id,
        organization_id: page.organization_id,
        guest_name: body.name,
        guest_email: body.email,
        starts_at: body.startsAt ?? body.starts_at,
        notes: body.notes ?? null,
      })
      .select('*')
      .single()
    if (error) return jsonResponse({ error: error.message }, 400)
    return jsonResponse({ success: true, booking: data }, 201)
  }

  return jsonResponse({ error: 'Method not allowed' }, 405)
})
