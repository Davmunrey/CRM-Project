import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

interface Attachment {
  name: string
  mimeType?: string
  dataBase64?: string
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string | undefined
  from?: string | undefined
  replyTo?: string | undefined
  cc?: string | string[] | undefined
  bcc?: string | string[] | undefined
  attachments?: Attachment[] | undefined
}

interface SmtpConfig {
  host: string
  port: number
  secure: 'starttls' | 'ssl' | 'none'
  username: string
  password: string
  fromAddress: string
  fromName?: string | null
  replyTo?: string | null
}

function buildTransport(config?: SmtpConfig) {
  if (env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: env.RESEND_API_KEY },
    })
  }

  if (config) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure === 'ssl',
      requireTLS: config.secure === 'starttls',
      auth: { user: config.username, pass: config.password },
    })
  }

  if (env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: (env.SMTP_PORT ?? 587) === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  }

  return null
}

function sanitizeDisplayName(name: string): string {
  return name.replace(/["\\]/g, '')
}

function resolveFrom(opts: SendEmailOptions, config?: SmtpConfig): string {
  if (opts.from) return opts.from
  if (config?.fromName) return `"${sanitizeDisplayName(config.fromName)}" <${config.fromAddress}>`
  if (config?.fromAddress) return config.fromAddress
  return env.EMAIL_FROM
}

function toAddressString(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined
  return Array.isArray(v) ? v.join(', ') : v
}

export async function sendEmail(opts: SendEmailOptions, smtpConfig?: SmtpConfig): Promise<void> {
  const transport = buildTransport(smtpConfig)
  if (!transport) {
    console.warn('[email] No transport configured — email not sent')
    return
  }

  const attachments = opts.attachments
    ?.filter((a) => a.dataBase64)
    .map((a) => ({
      filename: a.name,
      content: Buffer.from(a.dataBase64!, 'base64'),
      contentType: a.mimeType ?? 'application/octet-stream',
    }))

  await transport.sendMail({
    from: resolveFrom(opts, smtpConfig),
    to: toAddressString(opts.to) ?? '',
    cc: toAddressString(opts.cc),
    bcc: toAddressString(opts.bcc),
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    replyTo: opts.replyTo ?? (smtpConfig?.replyTo ?? undefined) ?? undefined,
    attachments: attachments?.length ? attachments : undefined,
  })
}
