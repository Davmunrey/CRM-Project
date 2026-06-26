/** @deprecated Use Supabase client — kept for incremental store migration (Hito 2). */
function apiBase(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
  }
  return process.env.NEXT_PUBLIC_API_URL ?? '/api'
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${apiBase()}${path}`, {
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
