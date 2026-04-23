/**
 * Merge user-defined webhook headers safely (no Host / hop-by-hop / oversized names).
 */

const DENY_NAMES = new Set(
  [
    'host',
    'connection',
    'content-length',
    'transfer-encoding',
    'te',
    'trailer',
    'upgrade',
    'keep-alive',
    'proxy-connection',
    'proxy-authenticate',
    'proxy-authorization',
    'via',
    'expect',
    'http2-settings',
    'alt-svc',
  ].map((s) => s.toLowerCase()),
)

const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,63}$/

export function applySafeCustomHeaders(target: Headers, custom: Record<string, string> | null | undefined): string | null {
  if (!custom || typeof custom !== 'object') return null
  let n = 0
  for (const [k0, v0] of Object.entries(custom)) {
    const k = k0.trim()
    const v = typeof v0 === 'string' ? v0 : String(v0)
    if (!k) continue
    const lower = k.toLowerCase()
    if (DENY_NAMES.has(lower)) return `forbidden_header:${lower}`
    if (!NAME_RE.test(k)) return `invalid_header_name:${k.slice(0, 32)}`
    if (v.length > 8_000) return 'header_value_too_long'
    if (n >= 32) return 'too_many_custom_headers'
    target.set(k, v.slice(0, 8_000))
    n++
  }
  return null
}
