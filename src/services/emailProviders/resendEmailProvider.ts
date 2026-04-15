import type { EmailProvider } from './types'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

interface ResendSendResponse {
  id?: string
  error?: {
    message?: string
  }
}

export const resendEmailProvider: EmailProvider = {
  send: async (payload) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Resend provider requires Supabase configuration.')
    }
    const functionName = (import.meta.env.VITE_RESEND_SEND_FUNCTION as string | undefined) ?? 'resend-send-email'
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      throw new Error('Resend provider requires an authenticated Supabase session.')
    }
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        replyTo: payload.replyTo,
        subject: payload.subject,
        body: payload.body,
        htmlBody: payload.htmlBody,
        attachments: payload.attachments?.map((attachment) => ({
          name: attachment.name,
          dataBase64: attachment.dataBase64,
          mimeType: attachment.mimeType,
        })),
      }),
    })

    const data = (await res.json().catch(() => ({}))) as ResendSendResponse
    if (!res.ok) {
      throw new Error(data.error?.message ?? `Resend API error ${res.status}`)
    }

    return {
      provider: 'resend',
      providerMessageId: data.id,
    }
  },
}
