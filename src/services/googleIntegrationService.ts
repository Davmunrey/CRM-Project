import { supabase } from '../lib/supabase'
import { getGmailRedirectUri } from './gmailService'

export const GOOGLE_OAUTH_MESSAGE_SOURCE = 'velo-google-oauth' as const

export type GoogleOAuthBundle = 'primary' | 'calendar'

export type GoogleOAuthMessagePayload = {
  ok: boolean
  error?: string
  email?: string
}

export async function fetchGoogleOAuthStartUrl(bundle: GoogleOAuthBundle = 'primary'): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }
  const { data, error } = await supabase.functions.invoke('google-oauth-start', {
    body: { redirect_uri: getGmailRedirectUri(), bundle },
  })
  if (error) {
    const msg = typeof (error as { message?: string }).message === 'string'
      ? (error as { message: string }).message
      : 'google-oauth-start failed'
    throw new Error(msg)
  }
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
  const { data, error } = await supabase.functions.invoke('google-integration-status', { body: {} })
  if (error) {
    return {
      connected: false,
      gmailConnected: false,
      calendarConnected: false,
      account: null,
      error: error.message,
    }
  }
  const d = data as GoogleIntegrationStatusResponse
  return {
    ...d,
    gmailConnected: d.gmailConnected ?? d.connected,
    calendarConnected: d.calendarConnected ?? false,
  }
}

export async function disconnectGoogleIntegration(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }
  const { error } = await supabase.functions.invoke('gmail-disconnect', { body: {} })
  if (error) {
    throw new Error(error.message)
  }
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
