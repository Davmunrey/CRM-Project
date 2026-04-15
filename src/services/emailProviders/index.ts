import { gmailEmailProvider } from './gmailEmailProvider'
import { resendEmailProvider } from './resendEmailProvider'
import type { EmailProvider, EmailProviderName } from './types'

export function resolveEmailProviderName(): EmailProviderName {
  const nodeEnvProvider = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process
    ?.env
    ?.VITE_EMAIL_PROVIDER

  const rawProvider = ((import.meta.env.VITE_EMAIL_PROVIDER as string | undefined) ?? nodeEnvProvider ?? 'gmail')
    .trim()
    .toLowerCase()

  return rawProvider === 'resend' ? 'resend' : 'gmail'
}

export function getEmailProvider(): EmailProvider {
  return resolveEmailProviderName() === 'resend' ? resendEmailProvider : gmailEmailProvider
}

export type { EmailProvider, EmailProviderName } from './types'
