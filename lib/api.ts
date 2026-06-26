'use client'

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { crmPostgrestRequest, isCrmPostgrestPath } from '@/lib/supabase/crmApi'
import { handleAnalytics, isAnalyticsPath } from '@/lib/supabase/analytics'

function apiBase(path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (typeof process !== 'undefined' && supabaseUrl) {
    if (path.startsWith('/public/v1')) return `${supabaseUrl}/functions/v1/public-api`
    if (path.startsWith('/public/forms')) return `${supabaseUrl}/functions/v1/public-forms`
    if (path.startsWith('/public/booking')) return `${supabaseUrl}/functions/v1/public-booking`
    return `${supabaseUrl}/functions/v1/propel-api`
  }
  return process.env.NEXT_PUBLIC_API_URL ?? '/api'
}

async function authHeaders(forEdge = false): Promise<Record<string, string>> {
  if (!isSupabaseConfigured()) return {}
  const headers: Record<string, string> = {}
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (forEdge && anonKey) headers.apikey = anonKey
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  return headers
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  if (isSupabaseConfigured() && method === 'GET' && isAnalyticsPath(path)) {
    return handleAnalytics<T>(path)
  }

  if (isSupabaseConfigured() && isCrmPostgrestPath(path)) {
    const result = await crmPostgrestRequest<T>(method, path, body)
    return result as T
  }

  const headers: Record<string, string> = {
    ...(await authHeaders(isSupabaseConfigured() && !isCrmPostgrestPath(path))),
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${apiBase(path)}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({ error: res.statusText }))) as {
      error?: string
      [k: string]: unknown
    }
    if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.replace('/login')
    }
    const e = new Error(
      (typeof errBody.error === 'string' ? errBody.error : undefined) ?? `HTTP ${res.status}`,
    ) as Error & { status?: number; body?: Record<string, unknown> }
    e.status = res.status
    e.body = errBody
    throw e
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>('GET', path, undefined, signal),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
}
