import type { EmailProvider } from './types'
import { api } from '../../lib/api'

export const resendEmailProvider: EmailProvider = {
  send: async (payload) => {
    const data = await api.post<{ id?: string; error?: { message?: string } }>('/email/send', {
      provider: 'resend',
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
    })
    if (data.error) throw new Error(data.error.message ?? 'Resend send error')
    return { provider: 'resend', providerMessageId: data.id }
  },
}
