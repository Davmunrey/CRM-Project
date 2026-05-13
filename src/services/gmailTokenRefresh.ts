import { supabase } from '../lib/supabase'
import { GmailApiError } from './gmailService'

export type SetGmailTokenFn = (accessToken: string, expiresAt: number) => void

/**
 * Refreshes the Gmail access token using the Edge Function `gmail-refresh-token`.
 * Calls `setToken` with the new token and expiry so callers can update their context.
 */
export async function refreshGmailAccessToken(setToken: SetGmailTokenFn): Promise<string> {
  if (!supabase) throw new Error('Failed to send a request to the Edge Function: gmail-refresh-token requires server configuration')
  const { data, error } = await supabase.functions.invoke('gmail-refresh-token')
  if (error || !data?.access_token) {
    throw new Error(error?.message ?? 'Token refresh failed - please reconnect Gmail')
  }
  const newExpiry = Date.now() + ((data.expires_in as number | undefined) ?? 3600) * 1000
  setToken(data.access_token as string, newExpiry)
  return data.access_token as string
}

/**
 * Executes `fn` with a valid token, automatically refreshing a 401.
 * - If `currentToken` is provided, tries it first.
 * - On 401 GmailApiError, refreshes and retries once.
 */
export async function withGmailToken<T>(
  currentToken: string | null,
  setToken: SetGmailTokenFn,
  fn: (token: string) => Promise<T>,
): Promise<T> {
  const token = currentToken ?? await refreshGmailAccessToken(setToken)
  try {
    return await fn(token)
  } catch (err) {
    if (err instanceof GmailApiError && err.status === 401) {
      const refreshedToken = await refreshGmailAccessToken(setToken)
      return await fn(refreshedToken)
    }
    throw err
  }
}
