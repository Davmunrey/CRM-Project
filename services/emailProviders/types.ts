export type EmailProviderName = 'gmail' | 'resend' | 'smtp'

export interface SendEmailPayload {
  to: string[]
  cc?: string[]
  bcc?: string[]
  replyTo?: string
  attachments?: Array<{
    name: string
    mimeType: string
    dataBase64: string
  }>
  subject: string
  body: string
  htmlBody?: string
  accessToken?: string
}

export interface EmailProviderSendResult {
  provider: EmailProviderName
  providerMessageId?: string
  providerThreadId?: string
}

export interface EmailProvider {
  send: (payload: SendEmailPayload) => Promise<EmailProviderSendResult>
}
