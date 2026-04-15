import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendEmailBody {
  to: string[]
  cc?: string[]
  bcc?: string[]
  replyTo?: string
  subject: string
  body: string
  htmlBody?: string
  attachments?: Array<{
    name: string
    mimeType: string
    dataBase64: string
  }>
}

interface ResendResponse {
  id?: string
  error?: {
    message?: string
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromAddress = Deno.env.get('RESEND_FROM')
  if (!resendApiKey || !fromAddress) {
    return new Response(
      JSON.stringify({ error: 'Resend server env is missing (RESEND_API_KEY or RESEND_FROM).' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  let payload: SendEmailBody
  try {
    payload = await req.json() as SendEmailBody
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  if (!Array.isArray(payload.to) || payload.to.length === 0 || !payload.subject?.trim()) {
    return new Response(
      JSON.stringify({ error: 'Invalid payload: at least one recipient and subject are required.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      reply_to: payload.replyTo,
      subject: payload.subject,
      text: payload.body,
      html: payload.htmlBody,
      attachments: payload.attachments?.map((attachment) => ({
        filename: attachment.name,
        content: attachment.dataBase64,
        type: attachment.mimeType,
      })),
    }),
  })

  const resendJson = (await resendResponse.json().catch(() => ({}))) as ResendResponse
  if (!resendResponse.ok) {
    return new Response(
      JSON.stringify({ error: resendJson.error?.message ?? `Resend API error ${resendResponse.status}` }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ id: resendJson.id }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
