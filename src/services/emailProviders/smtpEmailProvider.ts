import type { EmailProvider } from './types'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

interface SmtpSendResponse {
  id?: string | null
  error?: string
}

/**
 * BYO-SMTP email provider — sends through the `smtp-send-email` Edge Function which
 * looks up the active per-organization SMTP credentials and dispatches via denomailer.
 *
 * The provider never sees the SMTP password (stored as AES-256-GCM ciphertext server-side).
 */
export const smtpEmailProvider: EmailProvider = {
  send: async (payload) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('SMTP provider requires Supabase configuration.')
    }
    const functionName =
      (import.meta.env.VITE_SMTP_SEND_FUNCTION as string | undefined) ?? 'smtp-send-email'
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      throw new Error('SMTP provider requires an authenticated Supabase session.')
    }
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send',
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        replyTo: payload.replyTo,
        subject: payload.subject,
        body: payload.body,
        htmlBody: payload.htmlBody,
        attachments: payload.attachments?.map((a) => ({
          name: a.name,
          dataBase64: a.dataBase64,
          mimeType: a.mimeType,
        })),
      }),
    })

    const data = (await res.json().catch(() => ({}))) as SmtpSendResponse
    if (!res.ok) {
      throw new Error(data.error ?? `SMTP send error ${res.status}`)
    }

    return {
      provider: 'smtp',
      providerMessageId: data.id ?? undefined,
    }
  },
}
