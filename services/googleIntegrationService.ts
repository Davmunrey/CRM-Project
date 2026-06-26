import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { getGmailRedirectUri } from './gmailService'

export type GoogleOAuthConfigStatus = {
  configured: boolean
  redirectUri: string | null
}

export async function fetchGoogleOAuthConfigStatus(): Promise<GoogleOAuthConfigStatus> {
  try {
    return await api.get<GoogleOAuthConfigStatus>('/gmail/oauth-configured')
  } catch {
    return { configured: false, redirectUri: null }
  }
}

export const GOOGLE_OAUTH_MESSAGE_SOURCE = 'propel-google-oauth' as const

export type GoogleOAuthBundle = 'primary' | 'calendar' | 'contacts'

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

export async function fetchGoogleOAuthStartUrl(bundle: GoogleOAuthBundle = 'primary'): Promise<string> {
  const redirectUri = getGmailRedirectUri()
  const data = await api.post<{ url: string }>('/gmail/oauth-start', {
    redirect_uri: redirectUri,
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
  connected: boolean
  gmailConnected: boolean
  calendarConnected: boolean
  contactsConnected?: boolean
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
  try {
    const data = await api.get<GoogleIntegrationStatusResponse>('/gmail/integration-status')
    const d = data as GoogleIntegrationStatusResponse
    return {
      ...d,
      gmailConnected: d.gmailConnected ?? d.connected,
      calendarConnected: d.calendarConnected ?? false,
      contactsConnected: d.contactsConnected ?? false,
    }
  } catch (error) {
    return {
      connected: false,
      gmailConnected: false,
      calendarConnected: false,
      contactsConnected: false,
      account: null,
      error: error instanceof Error ? error.message : 'integration-status failed',
    }
  }
}

export async function syncGoogleContacts(): Promise<{ imported: number; skipped: number; total: number }> {
  return api.post<{ imported: number; skipped: number; total: number }>('/gmail/sync-contacts', {})
}

export async function disconnectGoogleIntegration(): Promise<void> {
  await api.post('/gmail/disconnect', {
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
