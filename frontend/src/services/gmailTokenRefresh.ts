import { api } from '../lib/api'
import { GmailApiError } from './gmailService'

export type SetGmailTokenFn = (accessToken: string, expiresAt: number) => void

export async function refreshGmailAccessToken(setToken: SetGmailTokenFn): Promise<string> {
  const data = await api.get<{ access_token: string; expires_in: number }>('/gmail/refresh-token')
  if (!data?.access_token) {
    throw new Error('Token refresh failed - please reconnect Gmail')
  }
  const newExpiry = Date.now() + (data.expires_in ?? 3600) * 1000
  setToken(data.access_token, newExpiry)
  return data.access_token
}

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
