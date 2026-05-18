import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: false,
  isBootstrapFatalError: false,
}))

describe('email provider resolver', () => {
  afterEach(() => {
    vi.resetModules()
    delete process.env.VITE_EMAIL_PROVIDER
  })

  it('defaults to gmail when env is missing', async () => {
    const mod = await import('../../src/services/emailProviders')
    expect(mod.resolveEmailProviderName()).toBe('gmail')
  })

  it('returns resend when env selects resend', async () => {
    process.env.VITE_EMAIL_PROVIDER = 'resend'
    const mod = await import('../../src/services/emailProviders')
    expect(mod.resolveEmailProviderName()).toBe('resend')
  })

  it('falls back to gmail on unknown provider', async () => {
    process.env.VITE_EMAIL_PROVIDER = 'unknown'
    const mod = await import('../../src/services/emailProviders')
    expect(mod.resolveEmailProviderName()).toBe('gmail')
  })
})
