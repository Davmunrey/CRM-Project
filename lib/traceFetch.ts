/**
 * Lightweight W3C trace header propagation for browser->Edge calls.
 */
export function installTraceFetch() {
  const original = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers ?? {})
    if (!headers.has('traceparent')) {
      const rand = crypto.randomUUID().replaceAll('-', '')
      headers.set('traceparent', `00-${rand.slice(0, 32)}-${rand.slice(0, 16)}-01`)
    }
    return original(input, { ...init, headers })
  }
}
