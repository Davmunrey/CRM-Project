export type OAuthProvider = 'google' | 'azure' | 'apple'
export type PreferredSsoProvider = 'google' | 'saml' | 'azure'

export interface GoogleOAuthPolicy {
  allowGoogleOAuth: boolean
  googleHostedDomain?: string
  preferredProvider?: PreferredSsoProvider
  loginHint?: string
}

function envEnabled(key: string, defaultValue = true): boolean {
  const raw = import.meta.env[key] as string | undefined
  if (raw === undefined) return defaultValue
  return raw === '1' || raw.toLowerCase() === 'true'
}

export const authProviderConfig = {
  google: envEnabled('VITE_AUTH_GOOGLE_ENABLED', true),
  azure: envEnabled('VITE_AUTH_AZURE_ENABLED', true),
  apple: envEnabled('VITE_AUTH_APPLE_ENABLED', true),
  saml: envEnabled('VITE_AUTH_SAML_ENABLED', true),
  samlDiscoveryEndpoint: (import.meta.env.VITE_AUTH_SAML_DISCOVERY_ENDPOINT as string | undefined)?.trim() || '',
  googleDiscoveryEndpoint: (import.meta.env.VITE_AUTH_GOOGLE_DISCOVERY_ENDPOINT as string | undefined)?.trim() || '',
  googleDiscoveryRequired: envEnabled('VITE_AUTH_GOOGLE_DISCOVERY_REQUIRED', Boolean(import.meta.env.PROD)),
}

export async function resolveSamlDomain(emailOrDomain: string): Promise<string> {
  const raw = emailOrDomain.trim().toLowerCase()
  if (!raw) throw new Error('SSO identifier is required.')

  if (raw.includes('@')) {
    const endpoint = authProviderConfig.samlDiscoveryEndpoint
    if (!endpoint) {
      const domain = raw.split('@')[1]
      if (!domain) throw new Error('Unable to infer domain from email.')
      return domain
    }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: raw }),
    })
    if (!res.ok) throw new Error('Could not resolve SSO domain for this email.')
    const data = await res.json() as { domain?: string }
    if (!data.domain) throw new Error('No SSO domain configured for this email.')
    return data.domain.toLowerCase()
  }

  return raw
}

export async function resolveGoogleOAuthPolicy(emailOrDomain: string): Promise<GoogleOAuthPolicy> {
  const raw = emailOrDomain.trim().toLowerCase()
  const loginHint = raw.includes('@') ? raw : undefined
  const endpoint = authProviderConfig.googleDiscoveryEndpoint || authProviderConfig.samlDiscoveryEndpoint

  if (!endpoint) {
    if (authProviderConfig.googleDiscoveryRequired) {
      throw new Error('Google SSO discovery endpoint is required but not configured.')
    }
    return { allowGoogleOAuth: true, loginHint }
  }

  if (!raw && authProviderConfig.googleDiscoveryRequired) {
    throw new Error('Work email is required to continue with Google SSO.')
  }

  if (!raw) {
    return { allowGoogleOAuth: true }
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: raw,
      email: raw.includes('@') ? raw : undefined,
      domain: raw.includes('@') ? raw.split('@')[1] : raw,
      provider: 'google',
    }),
  })

  if (!res.ok) {
    if (authProviderConfig.googleDiscoveryRequired) {
      throw new Error('Could not resolve Google SSO policy for this account.')
    }
    return { allowGoogleOAuth: true, loginHint }
  }

  const data = await res.json() as {
    allowGoogleOAuth?: boolean
    googleHostedDomain?: string
    preferredProvider?: PreferredSsoProvider
  }

  return {
    allowGoogleOAuth: data.allowGoogleOAuth ?? true,
    googleHostedDomain: data.googleHostedDomain?.trim().toLowerCase() || undefined,
    preferredProvider: data.preferredProvider,
    loginHint,
  }
}
