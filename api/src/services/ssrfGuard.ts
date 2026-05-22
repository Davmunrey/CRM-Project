import { promises as dns } from 'node:dns'
import { isIP } from 'node:net'

export function isBlockedIp(addr: string): boolean {
  const ip = addr.replace(/^::ffff:/i, '')
  if (isIP(ip) === 4) {
    const parts = ip.split('.').map(Number)
    const [a, b] = parts as [number, number]
    return (
      a === 0 ||
      a === 127 ||
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127)
    )
  }
  const lower = addr.toLowerCase()
  if (isIP(lower) === 6) {
    return (
      lower === '::1' ||
      lower.startsWith('fe80:') ||
      lower.startsWith('fc') ||
      lower.startsWith('fd')
    )
  }
  return false
}

/**
 * Resolves hostname to a validated public IP and returns it.
 * Callers MUST use the returned IP for the actual connection to eliminate
 * the DNS rebinding TOCTOU window between validation and connection.
 */
export async function resolvePublicIp(hostname: string): Promise<string> {
  if (isIP(hostname) !== 0) {
    if (isBlockedIp(hostname)) throw new Error('Host must resolve to a public address')
    return hostname
  }
  if (/^[\d.]+$/.test(hostname) && hostname.split('.').length !== 4) {
    throw new Error('Host must resolve to a public address')
  }
  let results: { address: string }[]
  try {
    results = await dns.lookup(hostname, { all: true })
  } catch {
    throw new Error('Could not resolve hostname')
  }
  if (results.length === 0) throw new Error('Could not resolve hostname')
  for (const { address } of results) {
    if (isBlockedIp(address)) throw new Error('Host must resolve to a public address')
  }
  return results[0]!.address
}

/** @deprecated Use resolvePublicIp() to pin the validated IP and avoid TOCTOU. */
export async function assertPublicHost(hostname: string): Promise<void> {
  await resolvePublicIp(hostname)
}
