export type PreferredSsoProvider = 'google' | 'saml' | 'azure'

export interface GoogleOAuthPolicy {
  allowGoogleOAuth: boolean
  googleHostedDomain?: string
  preferredProvider?: PreferredSsoProvider
  loginHint?: string
}

function envEnabled(key: string, defaultValue = true): boolean {
  const raw = process.env[key] as string | undefined
  if (raw === undefined) return defaultValue
  return raw === '1' || raw.toLowerCase() === 'true'
}

export const authProviderConfig = {
  googleDiscoveryEndpoint: process.env.NEXT_PUBLIC_AUTH_GOOGLE_DISCOVERY_ENDPOINT?.trim() || '',
  googleDiscoveryRequired: envEnabled('NEXT_PUBLIC_AUTH_GOOGLE_DISCOVERY_REQUIRED', Boolean(process.env.NODE_ENV === 'production')),
}

export async function resolveGoogleOAuthPolicy(emailOrDomain: string): Promise<GoogleOAuthPolicy> {
  const raw = emailOrDomain.trim().toLowerCase()
  const loginHint = raw.includes('@') ? raw : undefined
  const endpoint = authProviderConfig.googleDiscoveryEndpoint

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
