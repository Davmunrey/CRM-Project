import { gmailEmailProvider } from './gmailEmailProvider'
import { resendEmailProvider } from './resendEmailProvider'
import { smtpEmailProvider } from './smtpEmailProvider'
import type { EmailProvider, EmailProviderName } from './types'

export function resolveEmailProviderName(): EmailProviderName {
  const nodeEnvProvider = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process
    ?.env
    ?.VITE_EMAIL_PROVIDER

  const rawProvider = ((process.env.NEXT_PUBLIC_EMAIL_PROVIDER as string | undefined) ?? nodeEnvProvider ?? 'gmail')
    .trim()
    .toLowerCase()

  if (rawProvider === 'resend') return 'resend'
  if (rawProvider === 'smtp') return 'smtp'
  return 'gmail'
}

export function getEmailProvider(): EmailProvider {
  const name = resolveEmailProviderName()
  switch (name) {
    case 'resend':
      return resendEmailProvider
    case 'smtp':
      return smtpEmailProvider
    case 'gmail':
      return gmailEmailProvider
  }
}

export type { EmailProvider, EmailProviderName } from './types'
