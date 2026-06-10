import { describe, expect, it } from 'vitest'
import { base32Encode, base32Decode, generateTotp, verifyTotp, generateSecret, otpauthUrl } from './totp.js'

// RFC 6238 Appendix B reference secret (ASCII "12345678901234567890").
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'))

describe('base32', () => {
  it('encodes the RFC seed to the canonical base32 string', () => {
    expect(RFC_SECRET).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
  })
  it('round-trips arbitrary bytes', () => {
    const buf = Buffer.from([0, 1, 2, 250, 255, 128, 64])
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true)
  })
})

describe('generateTotp — RFC 6238 SHA1 8-digit vectors', () => {
  const vectors: Array<[number, string]> = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
  ]
  for (const [t, expected] of vectors) {
    it(`T=${t} → ${expected}`, () => {
      expect(generateTotp(RFC_SECRET, t, 30, 8)).toBe(expected)
    })
  }

  it('produces the 6-digit truncation used by authenticator apps', () => {
    // 6-digit code is the low 6 digits of the 8-digit RFC value.
    expect(generateTotp(RFC_SECRET, 59, 30, 6)).toBe('287082')
  })
})

describe('verifyTotp', () => {
  it('accepts the current code', () => {
    const now = 1234567890
    const code = generateTotp(RFC_SECRET, now, 30, 6)
    expect(verifyTotp(RFC_SECRET, code, { nowSec: now })).toBe(true)
  })

  it('accepts a code one step early/late (drift window)', () => {
    const now = 1234567890
    const early = generateTotp(RFC_SECRET, now - 30, 30, 6)
    const late = generateTotp(RFC_SECRET, now + 30, 30, 6)
    expect(verifyTotp(RFC_SECRET, early, { nowSec: now, window: 1 })).toBe(true)
    expect(verifyTotp(RFC_SECRET, late, { nowSec: now, window: 1 })).toBe(true)
  })

  it('rejects a code outside the window', () => {
    const now = 1234567890
    const old = generateTotp(RFC_SECRET, now - 300, 30, 6)
    expect(verifyTotp(RFC_SECRET, old, { nowSec: now, window: 1 })).toBe(false)
  })

  it('rejects non-numeric / wrong-length input', () => {
    const now = 1234567890
    expect(verifyTotp(RFC_SECRET, 'abcdef', { nowSec: now })).toBe(false)
    expect(verifyTotp(RFC_SECRET, '12345', { nowSec: now })).toBe(false)
    expect(verifyTotp(RFC_SECRET, '', { nowSec: now })).toBe(false)
  })
})

describe('generateSecret / otpauthUrl', () => {
  it('generates a decodable base32 secret', () => {
    const s = generateSecret()
    expect(s.length).toBeGreaterThanOrEqual(32)
    expect(base32Decode(s).length).toBe(20)
  })
  it('builds a valid otpauth URI', () => {
    const url = otpauthUrl('ABCDEF', 'alice@example.com', 'n0CRM')
    expect(url.startsWith('otpauth://totp/')).toBe(true)
    expect(url).toContain('secret=ABCDEF')
    expect(url).toContain('issuer=n0CRM')
  })
})
