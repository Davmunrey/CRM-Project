import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Rolling-window rate limit (per isolate). For multi-region scale, back with Redis or DB. */
const userSendTimestamps = new Map<string, number[]>()
const orgSendTimestamps = new Map<string, number[]>()

const WINDOW_MS = 60 * 60 * 1000
const DEFAULT_MAX_SENDS_PER_USER_PER_HOUR = 60
const DEFAULT_MAX_SENDS_PER_ORG_PER_HOUR = 500
const MAX_TO_ADDRESSES = 50
const MAX_CC_BCC_EACH = 25
const MAX_ATTACHMENTS = 10
const MAX_TOTAL_ATTACHMENT_BYTES = 10 * 1024 * 1024
const MAX_SUBJECT_LENGTH = 998
const MAX_BODY_CHARS = 500_000

const ALLOWED_MIME_PREFIXES = [
  'image/',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

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

function envInt(key: string, fallback: number): number {
  const v = Deno.env.get(key)
  if (!v) return fallback
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function simpleEmailRe(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function estimateBase64Bytes(b64: string): number {
  const len = b64.length
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
  return Math.floor((len * 3) / 4) - padding
}

function isMimeAllowed(mime: string): boolean {
  const m = mime.trim().toLowerCase()
  return ALLOWED_MIME_PREFIXES.some((p) => (p.endsWith('/') ? m.startsWith(p) : m === p))
}

function trimRateWindow(map: Map<string, number[]>, key: string, now: number): number[] {
  const arr = map.get(key) ?? []
  const cutoff = now - WINDOW_MS
  const next = arr.filter((t) => t > cutoff)
  map.set(key, next)
  return next
}

function countInWindow(map: Map<string, number[]>, key: string, now: number): number {
  return trimRateWindow(map, key, now).length
}

function recordSend(map: Map<string, number[]>, key: string, now: number) {
  const window = trimRateWindow(map, key, now)
  window.push(now)
  map.set(key, window)
}

function auditStructured(
  phase: 'denied' | 'allowed' | 'resend_ok' | 'resend_error',
  payload: Record<string, unknown>,
) {
  console.log(JSON.stringify({ source: 'resend-send-email', phase, ts: new Date().toISOString(), ...payload }))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: 'Server misconfiguration' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user }, error: authErr } = await callerClient.auth.getUser()
  if (authErr || !user) {
    auditStructured('denied', { reason: 'unauthorized' })
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromAddress = Deno.env.get('RESEND_FROM')?.trim()
  if (!resendApiKey || !fromAddress) {
    return new Response(
      JSON.stringify({ error: 'Resend server env is missing (RESEND_API_KEY or RESEND_FROM).' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const maxUser = envInt('RESEND_RATE_MAX_PER_USER_PER_HOUR', DEFAULT_MAX_SENDS_PER_USER_PER_HOUR)
  const maxOrg = envInt('RESEND_RATE_MAX_PER_ORG_PER_HOUR', DEFAULT_MAX_SENDS_PER_ORG_PER_HOUR)
  const now = Date.now()

  let organizationId: string | null = null
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (serviceRole) {
    try {
      const admin = createClient(supabaseUrl, serviceRole)
      const { data: member } = await admin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      organizationId = (member as { organization_id?: string } | null)?.organization_id ?? null
    } catch {
      // non-fatal
    }
  }

  const userKey = `u:${user.id}`
  if (countInWindow(userSendTimestamps, userKey, now) >= maxUser) {
    auditStructured('denied', { reason: 'rate_limit_user', userId: user.id })
    return new Response(
      JSON.stringify({ error: 'Too many send requests. Try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
  if (organizationId) {
    const orgKey = `o:${organizationId}`
    if (countInWindow(orgSendTimestamps, orgKey, now) >= maxOrg) {
      auditStructured('denied', { reason: 'rate_limit_org', userId: user.id, organizationId })
      return new Response(
        JSON.stringify({ error: 'Organization send quota exceeded. Try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
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

  if (payload.to.length > MAX_TO_ADDRESSES) {
    auditStructured('denied', { reason: 'too_many_to', userId: user.id, count: payload.to.length })
    return new Response(
      JSON.stringify({ error: `Too many To addresses (max ${MAX_TO_ADDRESSES}).` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const allRecipients = [
    ...payload.to,
    ...(payload.cc ?? []),
    ...(payload.bcc ?? []),
  ]
  for (const addr of allRecipients) {
    if (!simpleEmailRe(addr)) {
      return new Response(
        JSON.stringify({ error: `Invalid email address: ${addr}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
  }
  if ((payload.cc?.length ?? 0) > MAX_CC_BCC_EACH || (payload.bcc?.length ?? 0) > MAX_CC_BCC_EACH) {
    return new Response(
      JSON.stringify({ error: `Too many Cc/Bcc addresses (max ${MAX_CC_BCC_EACH} each).` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  if (payload.subject.length > MAX_SUBJECT_LENGTH) {
    return new Response(
      JSON.stringify({ error: 'Subject too long.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const bodyLen = (payload.body?.length ?? 0) + (payload.htmlBody?.length ?? 0)
  if (bodyLen > MAX_BODY_CHARS) {
    return new Response(
      JSON.stringify({ error: 'Message body too large.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  if (payload.replyTo?.trim() && !simpleEmailRe(payload.replyTo)) {
    return new Response(
      JSON.stringify({ error: 'Invalid reply-to address.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const allowedReplyDomain = Deno.env.get('RESEND_ALLOWED_REPLY_DOMAIN')?.trim().toLowerCase()
  if (allowedReplyDomain && payload.replyTo?.includes('@')) {
    const d = payload.replyTo.split('@')[1]?.toLowerCase()
    if (d !== allowedReplyDomain) {
      auditStructured('denied', { reason: 'reply_domain_mismatch', userId: user.id })
      return new Response(
        JSON.stringify({ error: 'Reply-To domain is not allowed for this deployment.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
  }

  const atts = payload.attachments ?? []
  if (atts.length > MAX_ATTACHMENTS) {
    return new Response(
      JSON.stringify({ error: `Too many attachments (max ${MAX_ATTACHMENTS}).` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  let totalAttBytes = 0
  for (const a of atts) {
    if (!a.name?.trim() || !a.mimeType?.trim() || !a.dataBase64?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Each attachment requires name, mimeType, and dataBase64.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    if (!isMimeAllowed(a.mimeType)) {
      auditStructured('denied', { reason: 'mime_blocked', mimeType: a.mimeType, userId: user.id })
      return new Response(
        JSON.stringify({ error: `Attachment type not allowed: ${a.mimeType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const bytes = estimateBase64Bytes(a.dataBase64)
    totalAttBytes += bytes
    if (totalAttBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      return new Response(
        JSON.stringify({ error: 'Total attachment size exceeds limit.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
  }

  auditStructured('allowed', {
    userId: user.id,
    organizationId,
    toCount: payload.to.length,
    attachmentCount: atts.length,
  })

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
      attachments: atts.length
        ? atts.map((attachment) => ({
          filename: attachment.name,
          content: attachment.dataBase64,
          type: attachment.mimeType,
        }))
        : undefined,
    }),
  })

  const resendJson = (await resendResponse.json().catch(() => ({}))) as ResendResponse
  if (!resendResponse.ok) {
    const msg = resendJson.error?.message ?? `Resend API error ${resendResponse.status}`
    auditStructured('resend_error', { userId: user.id, organizationId, message: msg })
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  auditStructured('resend_ok', { userId: user.id, organizationId, resendId: resendJson.id })

  const successAt = Date.now()
  recordSend(userSendTimestamps, userKey, successAt)
  if (organizationId) recordSend(orgSendTimestamps, `o:${organizationId}`, successAt)

  if (serviceRole && organizationId) {
    try {
      const admin = createClient(supabaseUrl, serviceRole)
      await admin.from('audit_log').insert({
        organization_id: organizationId,
        user_id: user.id,
        action: 'email_resend_sent',
        entity_type: 'email',
        entity_id: resendJson.id ?? 'unknown',
        entity_name: payload.subject.slice(0, 200),
        details: JSON.stringify({ provider: 'resend', toCount: payload.to.length }),
      })
    } catch {
      // non-fatal
    }
  }

  return new Response(
    JSON.stringify({ id: resendJson.id }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
