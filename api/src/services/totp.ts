/**
 * RFC 6238 TOTP (and RFC 4226 HOTP) implemented on node:crypto — no third-party
 * dependency. Used for MFA: compatible with Google Authenticator / 1Password /
 * Authy (SHA1, 6 digits, 30s period). All time-dependent functions accept an
 * explicit time so they are deterministically unit-testable against RFC vectors.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** RFC 4648 base32 encode (no padding) — the format authenticator apps expect. */
export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31]
  return out
}

/** RFC 4648 base32 decode (case-insensitive, ignores padding/whitespace). */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '')
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch)
    if (idx === -1) continue // skip whitespace / separators
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** Generate a random base32 MFA secret (default 20 bytes = 160 bits). */
export function generateSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes))
}

/** RFC 4226 HOTP for a given counter. */
function hotp(key: Buffer, counter: number, digits: number): string {
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', key).update(msg).digest()
  const offset = hmac[hmac.length - 1]! & 0x0f
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff)
  return (bin % 10 ** digits).toString().padStart(digits, '0')
}

/** RFC 6238 TOTP for a specific Unix time (seconds). */
export function generateTotp(secretBase32: string, forTimeSec: number, step = 30, digits = 6): string {
  return hotp(base32Decode(secretBase32), Math.floor(forTimeSec / step), digits)
}

/**
 * Verify a TOTP token, allowing ±`window` steps of clock drift. Comparison is
 * constant-time. `nowSec` is injectable for tests; defaults to the current time.
 */
export function verifyTotp(
  secretBase32: string,
  token: string,
  opts: { nowSec?: number; step?: number; digits?: number; window?: number } = {},
): boolean {
  const step = opts.step ?? 30
  const digits = opts.digits ?? 6
  const window = opts.window ?? 1
  const nowSec = opts.nowSec ?? Math.floor(Date.now() / 1000)
  const clean = token.replace(/\s/g, '')
  if (!new RegExp(`^\\d{${digits}}$`).test(clean)) return false

  const key = base32Decode(secretBase32)
  const counter = Math.floor(nowSec / step)
  const provided = Buffer.from(clean)
  for (let w = -window; w <= window; w++) {
    const candidate = Buffer.from(hotp(key, counter + w, digits))
    if (candidate.length === provided.length && timingSafeEqual(candidate, provided)) return true
  }
  return false
}

/** Build the otpauth:// URI for QR-code enrollment in an authenticator app. */
export function otpauthUrl(secretBase32: string, accountLabel: string, issuer = 'n0CRM'): string {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`)
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  })
  return `otpauth://totp/${label}?${params.toString()}`
}
