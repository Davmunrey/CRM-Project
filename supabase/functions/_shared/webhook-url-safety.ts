/**
 * Blocks SSRF-prone webhook target URLs (private IPs, link-local, metadata hostnames, non-HTTPS).
 * Used before outbound fetch in webhook-worker.
 */

const BLOCKED_HOSTNAMES = new Set(
  [
    'metadata.google.internal',
    'metadata',
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'localhost.localdomain',
  ].map((h) => h.toLowerCase()),
)

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    const x = Number(p)
    if (!Number.isInteger(x) || x < 0 || x > 255) return null
    n = (n << 8) | x
  }
  return n >>> 0
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  if (n === null) return true
  // 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.168.0.0/16, 198.18.0.0/15, 224.0.0.0/4
  if (n < 0x01000000) return true // 0/8
  if (n >= 0x0a000000 && n <= 0x0affffff) return true // 10/8
  if (n >= 0x64400000 && n <= 0x647fffff) return true // CGNAT 100.64/10
  if (n >= 0x7f000000 && n <= 0x7fffffff) return true // 127/8
  if (n >= 0xa9fe0000 && n <= 0xa9feffff) return true // 169.254/16 link-local
  if (n >= 0xac100000 && n <= 0xac1fffff) return true // 172.16/12
  if (n >= 0xc0a80000 && n <= 0xc0a8ffff) return true // 192.168/16
  if (n >= 0xc6120000 && n <= 0xc613ffff) return true // 198.18/15 benchmark
  if (n >= 0xe0000000) return true // multicast + reserved
  return false
}

/** Returns error message or null if OK. */
export function validateWebhookTargetUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return 'empty_url'
  let u: URL
  try {
    u = new URL(trimmed)
  } catch {
    return 'invalid_url'
  }
  if (u.username || u.password) return 'credentials_in_url_not_allowed'
  if (u.protocol !== 'https:') return 'https_only'
  const host = u.hostname.toLowerCase()
  if (BLOCKED_HOSTNAMES.has(host)) return 'blocked_hostname'
  if (host.endsWith('.localhost')) return 'blocked_hostname'
  // Literal IPv4 in hostname
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    if (isPrivateOrReservedIpv4(host)) return 'blocked_ip'
  }
  // IPv6 in brackets [::1]
  if (host.startsWith('[') && host.endsWith(']')) {
    return 'ipv6_not_allowed'
  }
  return null
}
