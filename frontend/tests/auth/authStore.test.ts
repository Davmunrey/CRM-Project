import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAuthStore, initAuth } from '../../src/store/authStore'

const { mockApiPost, mockApiGet } = vi.hoisted(() => ({
  mockApiPost: vi.fn(),
  mockApiGet: vi.fn(),
}))

vi.mock('../../src/lib/api', () => ({
  api: {
    post: mockApiPost,
    get: mockApiGet,
    patch: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  getToken: vi.fn().mockReturnValue(null),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  decodeToken: vi.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
  isTokenExpired: vi.fn().mockReturnValue(false),
  TOKEN_KEY: 'n0crm_token',
}))

const fakeToken = 'header.eyJzdWIiOiJ1MSIsIm9yZyI6Im9yZy0xIiwicm9sZSI6ImFkbWluIiwiZXhwIjo5OTk5OTk5OTk5fQ.sig'

function makeLoginResponse(overrides = {}) {
  return {
    token: fakeToken,
    user: { id: 'u1', email: 'test@test.com', name: 'Test User', role: 'admin', organizationId: 'org-1', orgSlug: 'test', ...overrides },
  }
}

describe('authStore — JWT auth', () => {
  beforeEach(() => {
    mockApiPost.mockReset()
    mockApiGet.mockReset()
    useAuthStore.setState({
      currentUser: null,
      session: null,
      organization: null,
      isLoadingAuth: true,
      organizationId: null,
      tenantResolutionStatus: 'idle',
      tenantResolutionMessage: null,
      users: [],
    })
  })

  describe('login', () => {
    it('AUTH-01: calls POST /auth/login and returns success', async () => {
      mockApiPost.mockResolvedValue(makeLoginResponse())
      const result = await useAuthStore.getState().login('test@test.com', 'pass')
      expect(mockApiPost).toHaveBeenCalledWith('/auth/login', { email: 'test@test.com', password: 'pass' })
      expect(result.success).toBe(true)
    })

    it('AUTH-01: sets currentUser and session on successful login', async () => {
      mockApiPost.mockResolvedValue(makeLoginResponse())
      await useAuthStore.getState().login('test@test.com', 'pass')
      const { currentUser, session, organizationId } = useAuthStore.getState()
      expect(currentUser?.id).toBe('u1')
      expect(currentUser?.email).toBe('test@test.com')
      expect(session?.userId).toBe('u1')
      expect(organizationId).toBe('org-1')
    })

    it('AUTH-01: returns error on API failure', async () => {
      mockApiPost.mockRejectedValue(new Error('Invalid credentials'))
      const result = await useAuthStore.getState().login('bad@test.com', 'wrong')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
    })
  })

  describe('logout', () => {
    it('AUTH-05: calls POST /auth/logout and clears state', async () => {
      mockApiPost.mockResolvedValue({ ok: true })
      useAuthStore.setState({
        currentUser: { id: 'u1', email: 'a@b.com', name: 'A', role: 'admin', jobTitle: '', isActive: true, createdAt: '', updatedAt: '' },
        session: { userId: 'u1', token: 'tok', expiresAt: Date.now() + 3600000, createdAt: '' },
      })
      await useAuthStore.getState().logout()
      expect(mockApiPost).toHaveBeenCalledWith('/auth/logout')
      expect(useAuthStore.getState().currentUser).toBeNull()
      expect(useAuthStore.getState().session).toBeNull()
    })

    it('AUTH-05: clears local state even if API call fails', async () => {
      mockApiPost.mockRejectedValue(new Error('Network error'))
      useAuthStore.setState({
        currentUser: { id: 'u1', email: 'a@b.com', name: 'A', role: 'admin', jobTitle: '', isActive: true, createdAt: '', updatedAt: '' },
      })
      await useAuthStore.getState().logout()
      expect(useAuthStore.getState().currentUser).toBeNull()
    })
  })

  describe('register', () => {
    it('AUTH-01: calls POST /auth/register and sets currentUser', async () => {
      mockApiPost.mockResolvedValue(makeLoginResponse())
      const result = await useAuthStore.getState().register({ name: 'Test', email: 'test@test.com', password: 'pass' })
      expect(mockApiPost).toHaveBeenCalledWith('/auth/register', { name: 'Test', email: 'test@test.com', password: 'pass' })
      expect(result.success).toBe(true)
      expect(useAuthStore.getState().currentUser?.id).toBe('u1')
    })
  })

  describe('ensureTenantForCurrentUser', () => {
    it('AUTH-07: creates org via POST /orgs when user has no org', async () => {
      mockApiPost.mockResolvedValue({ id: 'org-new', name: 'New Org', slug: 'new-org' })
      useAuthStore.setState({
        currentUser: { id: 'u1', email: 'u@test.com', name: 'U', role: 'admin', jobTitle: '', isActive: true, createdAt: '', updatedAt: '' },
        organizationId: null,
      })
      await useAuthStore.getState().ensureTenantForCurrentUser()
      expect(mockApiPost).toHaveBeenCalledWith('/orgs', expect.any(Object))
      expect(useAuthStore.getState().tenantResolutionStatus).toBe('ready')
    })

    it('AUTH-07: skips if user already has org', async () => {
      useAuthStore.setState({
        currentUser: { id: 'u1', email: 'u@test.com', name: 'U', role: 'admin', jobTitle: '', isActive: true, createdAt: '', updatedAt: '' },
        organizationId: 'existing-org',
      })
      await useAuthStore.getState().ensureTenantForCurrentUser()
      expect(mockApiPost).not.toHaveBeenCalled()
      expect(useAuthStore.getState().tenantResolutionStatus).toBe('ready')
    })
  })

  describe('initAuth', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('AUTH-04: sets isLoadingAuth to false when no token', () => {
      initAuth()
      expect(useAuthStore.getState().isLoadingAuth).toBe(false)
    })
  })
})
