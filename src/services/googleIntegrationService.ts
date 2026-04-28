import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { getGmailRedirectUri } from './gmailService'

export const GOOGLE_OAUTH_MESSAGE_SOURCE = 'velo-google-oauth' as const

export type GoogleOAuthBundle = 'primary' | 'calendar'

export type GoogleOAuthMessagePayload = {
  ok: boolean
  error?: string
  email?: string
}

function getCurrentOrganizationId(): string | undefined {
  const raw = useAuthStore.getState().currentUser?.organizationId
  if (!raw) return undefined
  const normalized = raw.replace(/^"+|"+$/g, '').trim()
  return normalized || undefined
}

async function getAccessToken(): Promise<string | undefined> {
  if (!supabase) return undefined
  const { data: sessionData } = await supabase.auth.getSession()
  let accessToken = sessionData.session?.access_token
  if (!accessToken) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    accessToken = refreshed.session?.access_token
  }
  return accessToken
}

async function invokeEdgeWithFallback<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase not configured')

  const primary = await supabase.functions.invoke(functionName, { body })
  if (!primary.error) return primary.data as T

  if (!/Failed to send a request to the Edge Function/i.test(primary.error.message)) {
    throw new Error(primary.error.message)
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonOrPublishableKey =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  if (!supabaseUrl || !anonOrPublishableKey) {
    throw new Error(primary.error.message)
  }

  const accessToken = await getAccessToken()
  const directRes = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonOrPublishableKey,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  }).catch(() => null)

  if (directRes) {
    const directPayload = (await directRes.json().catch(() => null)) as { error?: string } | null
    if (!directRes.ok || directPayload?.error) {
      throw new Error(directPayload?.error ?? primary.error.message)
    }
    return directPayload as T
  }

  const proxyRes = await fetch(`/api/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  })

  const proxyPayload = (await proxyRes.json().catch(() => null)) as { error?: string } | null
  if (!proxyRes.ok || proxyPayload?.error) {
    throw new Error(proxyPayload?.error ?? primary.error.message)
  }
  return proxyPayload as T
}

export async function fetchGoogleOAuthStartUrl(bundle: GoogleOAuthBundle = 'primary'): Promise<string> {
  const data = await invokeEdgeWithFallback<{ url?: string }>('google-oauth-start', {
    redirect_uri: getGmailRedirectUri(),
    bundle,
    organizationId: getCurrentOrganizationId(),
  })
  const url = (data as { url?: string } | null)?.url
  if (typeof url !== 'string' || !url) {
    throw new Error('No URL returned from google-oauth-start')
  }
  return url
}

export type GoogleIntegrationStatusResponse = {
  /** True when Gmail (primary) scopes are active — same as legacy `connected` for the Google card. */
  connected: boolean
  gmailConnected: boolean
  calendarConnected: boolean
  account: {
    email: string
    name: string | null
    avatarUrl: string | null
    scopes: string[]
    lastSyncedAt: string | null
    createdAt: string
  } | null
  error?: string
}

export async function fetchGoogleIntegrationStatus(): Promise<GoogleIntegrationStatusResponse> {
  if (!supabase) {
    return {
      connected: false,
      gmailConnected: false,
      calendarConnected: false,
      account: null,
    }
  }
  try {
    const data = await invokeEdgeWithFallback<GoogleIntegrationStatusResponse>('google-integration-status', {
      organizationId: getCurrentOrganizationId(),
    })
    const d = data as GoogleIntegrationStatusResponse
    return {
      ...d,
      gmailConnected: d.gmailConnected ?? d.connected,
      calendarConnected: d.calendarConnected ?? false,
    }
  } catch (error) {
    return {
      connected: false,
      gmailConnected: false,
      calendarConnected: false,
      account: null,
      error: error instanceof Error ? error.message : 'google-integration-status failed',
    }
  }
}

export async function disconnectGoogleIntegration(): Promise<void> {
  await invokeEdgeWithFallback('gmail-disconnect', {
    organizationId: getCurrentOrganizationId(),
  })
}

function hasScope(scopes: string[], needle: string): boolean {
  return scopes.some((s) => s.includes(needle))
}

export function scopeLabelKeys(scopes: string[]): {
  key: 'googlePermGmailRead' | 'googlePermGmailSend' | 'googlePermGmailCompose' | 'googlePermGmailModify' | 'googlePermCalendar'
}[] {
  const out: { key: 'googlePermGmailRead' | 'googlePermGmailSend' | 'googlePermGmailCompose' | 'googlePermGmailModify' | 'googlePermCalendar' }[] = []
  if (hasScope(scopes, 'gmail.readonly')) out.push({ key: 'googlePermGmailRead' })
  if (hasScope(scopes, 'gmail.send')) out.push({ key: 'googlePermGmailSend' })
  if (hasScope(scopes, 'gmail.compose')) out.push({ key: 'googlePermGmailCompose' })
  if (hasScope(scopes, 'gmail.modify')) out.push({ key: 'googlePermGmailModify' })
  if (hasScope(scopes, 'calendar')) out.push({ key: 'googlePermCalendar' })
  return out
}
