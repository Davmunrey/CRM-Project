const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  // credentials: 'include' sends the HttpOnly auth_token cookie automatically.
  // No manual Authorization header — the token never touches JS memory.
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText })) as { error?: string; [k: string]: unknown }
    // A 401 on a protected page means the session is gone — bounce to /login.
    // On the login page itself, a 401 is an expected auth response (bad creds,
    // MFA required) and must surface to the caller, not redirect.
    if (res.status === 401 && !window.location.pathname.startsWith('/login')) {
      window.location.replace('/login')
    }
    const e = new Error((typeof errBody.error === 'string' ? errBody.error : undefined) ?? `HTTP ${res.status}`) as
      Error & { status?: number; body?: Record<string, unknown> }
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
