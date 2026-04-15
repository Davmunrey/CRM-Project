import { afterEach, describe, expect, it, vi } from 'vitest'

describe('authProviders Google discovery', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('requires discovery endpoint when enforcement is enabled', async () => {
    vi.stubEnv('PROD', 'true')
    vi.stubEnv('VITE_AUTH_GOOGLE_DISCOVERY_REQUIRED', 'true')
    vi.stubEnv('VITE_AUTH_GOOGLE_DISCOVERY_ENDPOINT', '')
    vi.stubEnv('VITE_AUTH_SAML_DISCOVERY_ENDPOINT', '')

    const { resolveGoogleOAuthPolicy } = await import('../../src/config/authProviders')

    await expect(resolveGoogleOAuthPolicy('buyer@enterprise.com')).rejects.toThrow(
      'Google SSO discovery endpoint is required but not configured.',
    )
  })

  it('returns permissive fallback when discovery is optional and endpoint is absent', async () => {
    vi.stubEnv('PROD', 'false')
    vi.stubEnv('VITE_AUTH_GOOGLE_DISCOVERY_REQUIRED', 'false')
    vi.stubEnv('VITE_AUTH_GOOGLE_DISCOVERY_ENDPOINT', '')
    vi.stubEnv('VITE_AUTH_SAML_DISCOVERY_ENDPOINT', '')

    const { resolveGoogleOAuthPolicy } = await import('../../src/config/authProviders')

    await expect(resolveGoogleOAuthPolicy('buyer@enterprise.com')).resolves.toEqual({
      allowGoogleOAuth: true,
      loginHint: 'buyer@enterprise.com',
    })
  })

  it('maps discovery response with hosted domain and provider guidance', async () => {
    vi.stubEnv('PROD', 'true')
    vi.stubEnv('VITE_AUTH_GOOGLE_DISCOVERY_REQUIRED', 'true')
    vi.stubEnv('VITE_AUTH_GOOGLE_DISCOVERY_ENDPOINT', 'https://api.example.com/auth/sso/discovery')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        allowGoogleOAuth: true,
        googleHostedDomain: 'enterprise.com',
        preferredProvider: 'google',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { resolveGoogleOAuthPolicy } = await import('../../src/config/authProviders')
    const policy = await resolveGoogleOAuthPolicy('buyer@enterprise.com')

    expect(policy).toEqual({
      allowGoogleOAuth: true,
      googleHostedDomain: 'enterprise.com',
      preferredProvider: 'google',
      loginHint: 'buyer@enterprise.com',
    })
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/auth/sso/discovery', expect.any(Object))
  })
})
