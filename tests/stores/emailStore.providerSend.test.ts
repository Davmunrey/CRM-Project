import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendMock = vi.fn().mockResolvedValue({
  provider: 'resend',
  providerMessageId: 'rs_123',
})

vi.mock('../../src/services/emailProviders', () => ({
  resolveEmailProviderName: vi.fn().mockReturnValue('resend'),
  getEmailProvider: vi.fn().mockReturnValue({ send: sendMock }),
}))

vi.mock('../../src/services/gmailService', () => ({
  listGmailThreads: vi.fn(),
  getGmailProfile: vi.fn(),
  sendGmailEmail: vi.fn(),
}))

vi.mock('../../src/lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: false,
  isOfflineDemoMode: false,
  isBootstrapFatalError: false,
}))

vi.mock('../../src/lib/supabaseHelpers', () => ({
  getOrgId: vi.fn(),
  runSupabaseWrite: vi.fn(),
}))

vi.mock('../../src/store/authStore', () => ({
  useAuthStore: { getState: vi.fn().mockReturnValue({ currentUser: { id: 'u-1' } }) },
}))

vi.mock('../../src/store/leadsStore', () => ({
  useLeadsStore: { getState: vi.fn().mockReturnValue({ recomputeLeadScore: vi.fn() }) },
}))

describe('emailStore provider send', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { useEmailStore } = await import('../../src/store/emailStore')
    useEmailStore.setState({ gmailAddress: null, emails: [] })
  })

  it('delegates outbound send to configured provider', async () => {
    const { useEmailStore } = await import('../../src/store/emailStore')
    const sent = await useEmailStore.getState().sendEmail({
      to: ['lead@example.com'],
      subject: 'Hello',
      body: 'Hi there',
    })

    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sent.provider).toBe('resend')
    expect(sent.providerMessageId).toBe('rs_123')
  })
})
