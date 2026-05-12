/**
 * BYO-SMTP Edge Function for Velo.
 *
 * Actions (POST JSON `{ action, ... }`):
 *   - `save_settings`  → upsert active SMTP credentials for the caller's organization (admin only).
 *   - `delete_settings`→ deactivate the active SMTP row for the caller's organization (admin only).
 *   - `test`           → send a test email using the saved (or supplied) SMTP credentials.
 *   - `send`           → send a real outbound email using the org's active SMTP credentials.
 *
 * Security:
 *   - Caller authenticated via Supabase Bearer token (`callerClient.auth.getUser()`).
 *   - Org admins resolved through `organization_members` (`role in ('owner','admin')`).
 *   - Passwords are stored as AES-256-GCM ciphertext using the shared TOKEN_ENCRYPTION_KEY.
 *   - Rate limits: per-user and per-org rolling hour windows (same shape as resend-send-email).
 *   - Audit row in `audit_log` on each successful send.
 *
 * Required Edge secrets:
 *   - SUPABASE_URL (auto)
 *   - SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS (or legacy ANON / SERVICE_ROLE)
 *   - TOKEN_ENCRYPTION_KEY  (64 hex chars — same key as gmail tokens cipher)
 *   - Optional: SMTP_RATE_MAX_PER_USER_PER_HOUR, SMTP_RATE_MAX_PER_ORG_PER_HOUR, EDGE_CORS_ORIGINS
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { getAnonKey, getServiceRoleKey } from '../_shared/supabase-keys.ts'
import { encryptToken, decryptToken } from '../_shared/token-cipher.ts'
import { corsHeadersForRequest, isCorsOriginBlocked } from '../_shared/cors-allowlist.ts'

const WINDOW_MS = 60 * 60 * 1000
const DEFAULT_MAX_SENDS_PER_USER_PER_HOUR = 60
const DEFAULT_MAX_SENDS_PER_ORG_PER_HOUR = 500
const MAX_TO_ADDRESSES = 50
const MAX_CC_BCC_EACH = 25
const MAX_ATTACHMENTS = 10
const MAX_TOTAL_ATTACHMENT_BYTES = 10 * 1024 * 1024
const MAX_SUBJECT_LENGTH = 998
const MAX_BODY_CHARS = 500_000

const userSendTimestamps = new Map<string, number[]>()
const orgSendTimestamps = new Map<string, number[]>()

type SecureMode = 'starttls' | 'ssl' | 'none'

interface SmtpCredentials {
  host: string
  port: number
  username: string
  password: string
  fromAddress: string
  fromName?: string
  replyTo?: string
  secure: SecureMode
}

interface SaveSettingsBody {
  action: 'save_settings'
  host: string
  port: number
  username: string
  password: string
  fromAddress: string
  fromName?: string
  replyTo?: string
  secure: SecureMode
}

interface DeleteSettingsBody {
  action: 'delete_settings'
}

interface TestBody {
  action: 'test'
  to: string
  /** Optional inline credentials — when omitted, the stored active SMTP row is used. */
  host?: string
  port?: number
  username?: string
  password?: string
  fromAddress?: string
  fromName?: string
  secure?: SecureMode
}

interface SendBody {
  action: 'send'
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

type ActionBody = SaveSettingsBody | DeleteSettingsBody | TestBody | SendBody

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

function recordSend(map: Map<string, number[]>, key: string, now: number): void {
  const window = trimRateWindow(map, key, now)
  window.push(now)
  map.set(key, window)
}

function auditStructured(phase: string, payload: Record<string, unknown>): void {
  console.log(JSON.stringify({ source: 'smtp-send-email', phase, ts: new Date().toISOString(), ...payload }))
}

function jsonResponse(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

interface SmtpAttachment {
  filename: string
  content: Uint8Array
  contentType: string
  encoding: 'binary'
}

async function sendViaSmtp(
  creds: SmtpCredentials,
  message: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    replyTo?: string
    subject: string
    text: string
    html?: string
    attachments?: SmtpAttachment[]
  },
): Promise<string | undefined> {
  const tlsMode = creds.secure
  const client = new SMTPClient({
    connection: {
      hostname: creds.host,
      port: creds.port,
      tls: tlsMode === 'ssl',
      auth: {
        username: creds.username,
        password: creds.password,
      },
    },
    debug: {
      log: false,
    },
  })

  try {
    const fromHeader = creds.fromName
      ? `${creds.fromName.replace(/"/g, '\\"')} <${creds.fromAddress}>`
      : creds.fromAddress

    const sendResult = await client.send({
      from: fromHeader,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      replyTo: message.replyTo ?? creds.replyTo,
      subject: message.subject,
      content: message.text,
      html: message.html,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
        encoding: 'binary' as const,
      })),
    })
    return typeof sendResult === 'object' && sendResult !== null && 'messageId' in sendResult
      ? String((sendResult as { messageId?: unknown }).messageId ?? '')
      : undefined
  } finally {
    try {
      await client.close()
    } catch {
      // best-effort
    }
  }
}

async function decodeBase64Attachments(
  list: SendBody['attachments'],
): Promise<SmtpAttachment[] | undefined> {
  if (!list || list.length === 0) return undefined
  return list.map((a) => {
    const bin = atob(a.dataBase64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return {
      filename: a.name,
      content: bytes,
      contentType: a.mimeType,
      encoding: 'binary' as const,
    }
  })
}

Deno.serve(async (req: Request) => {
  const cors = corsHeadersForRequest(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  if (isCorsOriginBlocked(req)) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, cors)
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, cors)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = getAnonKey()
  const serviceRole = getServiceRoleKey()
  if (!supabaseUrl || !supabaseAnonKey || !serviceRole) {
    return jsonResponse({ error: 'Server misconfiguration' }, 500, cors)
  }

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user }, error: authErr } = await callerClient.auth.getUser()
  if (authErr || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401, cors)
  }

  let body: ActionBody
  try {
    body = (await req.json()) as ActionBody
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400, cors)
  }

  const admin = createClient(supabaseUrl, serviceRole)

  // Resolve org id (first active membership).
  const { data: membership } = await admin
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const organizationId = (membership as { organization_id?: string } | null)?.organization_id
  const memberRole = (membership as { role?: string } | null)?.role
  if (!organizationId) {
    return jsonResponse({ error: 'No active organization for user' }, 403, cors)
  }
  const isAdmin = memberRole === 'owner' || memberRole === 'admin'

  // ── ADMIN: save SMTP settings ──────────────────────────────────────────
  if (body.action === 'save_settings') {
    if (!isAdmin) return jsonResponse({ error: 'Admin role required' }, 403, cors)
    const v = body
    if (!v.host?.trim() || !v.username?.trim() || !v.fromAddress?.trim()) {
      return jsonResponse({ error: 'host, username and fromAddress are required.' }, 400, cors)
    }
    if (!simpleEmailRe(v.fromAddress)) {
      return jsonResponse({ error: 'fromAddress must be a valid email.' }, 400, cors)
    }
    if (v.replyTo?.trim() && !simpleEmailRe(v.replyTo)) {
      return jsonResponse({ error: 'replyTo must be a valid email.' }, 400, cors)
    }
    if (!Number.isFinite(v.port) || v.port < 1 || v.port > 65535) {
      return jsonResponse({ error: 'port must be 1..65535.' }, 400, cors)
    }
    if (v.secure !== 'starttls' && v.secure !== 'ssl' && v.secure !== 'none') {
      return jsonResponse({ error: 'secure must be starttls | ssl | none.' }, 400, cors)
    }

    // Look up the current active row so we can reuse the encrypted password
    // when the admin updates non-secret fields without retyping it.
    const { data: currentRow } = await admin
      .from('email_smtp_settings')
      .select('id, password_cipher')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle()

    let cipher: string
    if (v.password?.trim()) {
      try {
        cipher = await encryptToken(v.password)
      } catch (err) {
        auditStructured('cipher_error', { organizationId, error: String(err) })
        return jsonResponse({ error: 'Encryption key not configured on server.' }, 500, cors)
      }
    } else if (currentRow?.password_cipher) {
      cipher = currentRow.password_cipher as string
    } else {
      return jsonResponse(
        { error: 'password is required for first-time SMTP setup.' },
        400,
        cors,
      )
    }

    // Deactivate any previous active row, then insert a new active row.
    await admin
      .from('email_smtp_settings')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    const { error: insertErr } = await admin
      .from('email_smtp_settings')
      .insert({
        organization_id: organizationId,
        host: v.host.trim(),
        port: v.port,
        username: v.username.trim(),
        password_cipher: cipher,
        from_address: v.fromAddress.trim(),
        from_name: v.fromName?.trim() ?? null,
        reply_to: v.replyTo?.trim() ?? null,
        secure: v.secure,
        is_active: true,
        created_by: user.id,
      })

    if (insertErr) {
      auditStructured('save_error', { organizationId, error: insertErr.message })
      return jsonResponse({ error: insertErr.message }, 500, cors)
    }

    auditStructured('save_ok', { organizationId, userId: user.id })
    return jsonResponse({ ok: true }, 200, cors)
  }

  // ── ADMIN: delete (deactivate) SMTP settings ───────────────────────────
  if (body.action === 'delete_settings') {
    if (!isAdmin) return jsonResponse({ error: 'Admin role required' }, 403, cors)
    const { error: delErr } = await admin
      .from('email_smtp_settings')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('is_active', true)
    if (delErr) return jsonResponse({ error: delErr.message }, 500, cors)
    auditStructured('delete_ok', { organizationId, userId: user.id })
    return jsonResponse({ ok: true }, 200, cors)
  }

  // ── TEST send (admin or with inline creds) ─────────────────────────────
  if (body.action === 'test') {
    if (!isAdmin) return jsonResponse({ error: 'Admin role required' }, 403, cors)
    if (!body.to?.trim() || !simpleEmailRe(body.to)) {
      return jsonResponse({ error: 'Recipient `to` must be a valid email.' }, 400, cors)
    }

    let creds: SmtpCredentials | null = null
    // Prefer inline creds (testing before saving) → fallback to stored row.
    if (body.host && body.username && body.password && body.fromAddress) {
      const portInt = Number.parseInt(String(body.port ?? 587), 10)
      creds = {
        host: body.host.trim(),
        port: Number.isFinite(portInt) && portInt > 0 ? portInt : 587,
        username: body.username.trim(),
        password: body.password,
        fromAddress: body.fromAddress.trim(),
        fromName: body.fromName?.trim(),
        secure: body.secure ?? 'starttls',
      }
    } else {
      const { data: row } = await admin
        .from('email_smtp_settings')
        .select('host, port, username, password_cipher, from_address, from_name, reply_to, secure')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .maybeSingle()
      if (!row) return jsonResponse({ error: 'No active SMTP settings for organization.' }, 404, cors)
      try {
        const r = row as {
          host: string
          port: number
          username: string
          password_cipher: string
          from_address: string
          from_name: string | null
          reply_to: string | null
          secure: SecureMode
        }
        creds = {
          host: r.host,
          port: r.port,
          username: r.username,
          password: await decryptToken(r.password_cipher),
          fromAddress: r.from_address,
          fromName: r.from_name ?? undefined,
          replyTo: r.reply_to ?? undefined,
          secure: r.secure,
        }
      } catch (err) {
        return jsonResponse({ error: `Could not decrypt SMTP password: ${String(err)}` }, 500, cors)
      }
    }

    try {
      await sendViaSmtp(creds, {
        to: [body.to.trim()],
        subject: 'Velo · SMTP test message',
        text: 'This is a Velo SMTP test message.\n\nIf you received this, your SMTP credentials work and Velo can send outbound mail on behalf of your organization.\n\nVelocity, by design.',
        html: '<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;padding:24px;color:#1e1b4b;"><h1 style="margin:0 0 12px 0;">Velo · SMTP test</h1><p>This is a Velo SMTP test message. If you received this, your SMTP credentials work and Velo can send outbound mail on behalf of your organization.</p><p style="color:#64748b;font-size:13px;">Velocity, by design.</p></body></html>',
      })

      await admin
        .from('email_smtp_settings')
        .update({
          last_test_at: new Date().toISOString(),
          last_test_ok: true,
          last_test_error: null,
        })
        .eq('organization_id', organizationId)
        .eq('is_active', true)

      auditStructured('test_ok', { organizationId, userId: user.id })
      return jsonResponse({ ok: true }, 200, cors)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await admin
        .from('email_smtp_settings')
        .update({
          last_test_at: new Date().toISOString(),
          last_test_ok: false,
          last_test_error: message.slice(0, 500),
        })
        .eq('organization_id', organizationId)
        .eq('is_active', true)
      auditStructured('test_error', { organizationId, userId: user.id, error: message })
      return jsonResponse({ error: message }, 502, cors)
    }
  }

  // ── SEND outbound mail (any active member) ─────────────────────────────
  if (body.action === 'send') {
    const payload = body
    if (!Array.isArray(payload.to) || payload.to.length === 0 || !payload.subject?.trim()) {
      return jsonResponse({ error: 'Invalid payload: at least one recipient and subject are required.' }, 400, cors)
    }
    if (payload.to.length > MAX_TO_ADDRESSES) {
      return jsonResponse({ error: `Too many To addresses (max ${MAX_TO_ADDRESSES}).` }, 400, cors)
    }
    const allRecipients = [...payload.to, ...(payload.cc ?? []), ...(payload.bcc ?? [])]
    for (const addr of allRecipients) {
      if (!simpleEmailRe(addr)) {
        return jsonResponse({ error: `Invalid email address: ${addr}` }, 400, cors)
      }
    }
    if ((payload.cc?.length ?? 0) > MAX_CC_BCC_EACH || (payload.bcc?.length ?? 0) > MAX_CC_BCC_EACH) {
      return jsonResponse({ error: `Too many Cc/Bcc addresses (max ${MAX_CC_BCC_EACH} each).` }, 400, cors)
    }
    if (payload.subject.length > MAX_SUBJECT_LENGTH) {
      return jsonResponse({ error: 'Subject too long.' }, 400, cors)
    }
    if (payload.replyTo?.trim() && !simpleEmailRe(payload.replyTo)) {
      return jsonResponse({ error: 'Invalid reply-to address.' }, 400, cors)
    }
    const bodyLen = (payload.body?.length ?? 0) + (payload.htmlBody?.length ?? 0)
    if (bodyLen > MAX_BODY_CHARS) {
      return jsonResponse({ error: 'Message body too large.' }, 400, cors)
    }
    const atts = payload.attachments ?? []
    if (atts.length > MAX_ATTACHMENTS) {
      return jsonResponse({ error: `Too many attachments (max ${MAX_ATTACHMENTS}).` }, 400, cors)
    }
    let totalAttBytes = 0
    for (const a of atts) {
      if (!a.name?.trim() || !a.mimeType?.trim() || !a.dataBase64?.trim()) {
        return jsonResponse({ error: 'Each attachment requires name, mimeType, and dataBase64.' }, 400, cors)
      }
      totalAttBytes += estimateBase64Bytes(a.dataBase64)
      if (totalAttBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
        return jsonResponse({ error: 'Total attachment size exceeds limit.' }, 400, cors)
      }
    }

    const now = Date.now()
    const maxUser = envInt('SMTP_RATE_MAX_PER_USER_PER_HOUR', DEFAULT_MAX_SENDS_PER_USER_PER_HOUR)
    const maxOrg = envInt('SMTP_RATE_MAX_PER_ORG_PER_HOUR', DEFAULT_MAX_SENDS_PER_ORG_PER_HOUR)
    const userKey = `u:${user.id}`
    if (countInWindow(userSendTimestamps, userKey, now) >= maxUser) {
      return jsonResponse({ error: 'Too many send requests. Try again later.' }, 429, cors)
    }
    const orgKey = `o:${organizationId}`
    if (countInWindow(orgSendTimestamps, orgKey, now) >= maxOrg) {
      return jsonResponse({ error: 'Organization send quota exceeded. Try again later.' }, 429, cors)
    }

    const { data: row } = await admin
      .from('email_smtp_settings')
      .select('host, port, username, password_cipher, from_address, from_name, reply_to, secure')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle()

    if (!row) {
      return jsonResponse({ error: 'No active SMTP settings for organization.' }, 404, cors)
    }

    let creds: SmtpCredentials
    try {
      const r = row as {
        host: string
        port: number
        username: string
        password_cipher: string
        from_address: string
        from_name: string | null
        reply_to: string | null
        secure: SecureMode
      }
      creds = {
        host: r.host,
        port: r.port,
        username: r.username,
        password: await decryptToken(r.password_cipher),
        fromAddress: r.from_address,
        fromName: r.from_name ?? undefined,
        replyTo: r.reply_to ?? undefined,
        secure: r.secure,
      }
    } catch (err) {
      return jsonResponse({ error: `Could not decrypt SMTP password: ${String(err)}` }, 500, cors)
    }

    try {
      const messageId = await sendViaSmtp(creds, {
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        replyTo: payload.replyTo,
        subject: payload.subject,
        text: payload.body,
        html: payload.htmlBody,
        attachments: await decodeBase64Attachments(payload.attachments),
      })

      const successAt = Date.now()
      recordSend(userSendTimestamps, userKey, successAt)
      recordSend(orgSendTimestamps, orgKey, successAt)

      try {
        await admin.from('audit_log').insert({
          organization_id: organizationId,
          user_id: user.id,
          action: 'email_smtp_sent',
          entity_type: 'email',
          entity_id: messageId ?? 'unknown',
          entity_name: payload.subject.slice(0, 200),
          details: JSON.stringify({ provider: 'smtp', toCount: payload.to.length }),
        })
      } catch {
        // non-fatal
      }

      auditStructured('send_ok', { organizationId, userId: user.id, messageId })
      return jsonResponse({ id: messageId ?? null }, 200, cors)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      auditStructured('send_error', { organizationId, userId: user.id, error: message })
      return jsonResponse({ error: message }, 502, cors)
    }
  }

  return jsonResponse({ error: 'Unknown action' }, 400, cors)
})
