import { sendGmailEmail } from '../gmailService'
import type { EmailProvider } from './types'

export const gmailEmailProvider: EmailProvider = {
  send: async (payload) => {
    if (!payload.accessToken) {
      throw new Error('Gmail provider requires access token.')
    }

    const sent = await sendGmailEmail(
      {
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        replyTo: payload.replyTo,
        attachments: payload.attachments,
        subject: payload.subject,
        body: payload.body,
        htmlBody: payload.htmlBody,
      },
      payload.accessToken,
    )

    return {
      provider: 'gmail',
      providerMessageId: sent.id,
      providerThreadId: sent.threadId,
    }
  },
}
