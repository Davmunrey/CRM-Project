import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the velo-api client
const getMock = vi.fn()

vi.mock('../../src/lib/api', () => ({
  api: { get: getMock, post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  getToken: vi.fn().mockReturnValue('fake-token'),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  decodeToken: vi.fn(),
  isTokenExpired: vi.fn().mockReturnValue(false),
  TOKEN_KEY: 'velo_token',
}))


vi.mock('../../src/store/authStore', () => ({
  useAuthStore: {
    getState: vi.fn().mockReturnValue({ currentUser: { id: 'user-1' } }),
  },
}))

vi.mock('../../src/store/leadsStore', () => ({
  useLeadsStore: {
    getState: vi.fn().mockReturnValue({ recomputeLeadScore: vi.fn() }),
  },
}))

describe('emailStore tracking metrics (velo-api)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { useEmailStore } = await import('../../src/store/emailStore')
    useEmailStore.setState({
      emails: [
        {
          id: 'mail-1',
          from: 'rep@acme.com',
          to: ['lead@acme.com'],
          subject: 'Follow up',
          body: 'Hello',
          status: 'sent',
          ownerUserId: 'user-1',
          trackingEnabled: true,
          createdAt: '2026-04-13T09:00:00.000Z',
        },
        {
          id: 'mail-2',
          from: 'rep@acme.com',
          to: ['other@acme.com'],
          subject: 'Not tracked',
          body: 'Hi',
          status: 'sent',
          ownerUserId: 'user-1',
          trackingEnabled: false,
          createdAt: '2026-04-13T09:01:00.000Z',
        },
      ],
    })
  })

  it('fetches stats for tracked emails and updates openCount/clickCount', async () => {
    getMock.mockResolvedValue({ opens: 3, clicks: 1 })

    const { useEmailStore } = await import('../../src/store/emailStore')
    await useEmailStore.getState().refreshTrackingMetrics()

    expect(getMock).toHaveBeenCalledTimes(1)
    expect(getMock).toHaveBeenCalledWith('/email-tracking/messages/mail-1/stats')

    const updated = useEmailStore.getState().emails.find((e) => e.id === 'mail-1')
    expect(updated?.openCount).toBe(3)
    expect(updated?.clickCount).toBe(1)
  })

  it('skips emails with trackingEnabled=false', async () => {
    getMock.mockResolvedValue({ opens: 0, clicks: 0 })

    const { useEmailStore } = await import('../../src/store/emailStore')
    await useEmailStore.getState().refreshTrackingMetrics()

    // Only tracked email triggers an API call
    expect(getMock).toHaveBeenCalledTimes(1)
    // Non-tracked email stats unchanged
    const untouched = useEmailStore.getState().emails.find((e) => e.id === 'mail-2')
    expect(untouched?.openCount).toBeUndefined()
  })

  it('returns early when no tracked emails', async () => {
    const { useEmailStore } = await import('../../src/store/emailStore')
    useEmailStore.setState({ emails: [] })

    await useEmailStore.getState().refreshTrackingMetrics()

    expect(getMock).not.toHaveBeenCalled()
  })

  it('continues despite individual stat fetch failure', async () => {
    getMock.mockRejectedValue(new Error('network error'))

    const { useEmailStore } = await import('../../src/store/emailStore')
    // Should not throw
    await expect(useEmailStore.getState().refreshTrackingMetrics()).resolves.not.toThrow()
  })
})
