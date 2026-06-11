import { describe, expect, it } from 'vitest'
import { decodeJwtSegment, validateIdTokenClaims, codeChallengeS256, isSsoConfigured } from './oidc.js'

function seg(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url')
}

describe('decodeJwtSegment', () => {
  it('decodes a base64url JSON segment', () => {
    expect(decodeJwtSegment(seg({ email: 'a@b.com', exp: 123 }))).toEqual({ email: 'a@b.com', exp: 123 })
  })
})

describe('validateIdTokenClaims', () => {
  const base = { issuer: 'https://idp.example', clientId: 'cid', nonce: 'n1', nowSec: 1_000_000 }
  const good = { iss: 'https://idp.example', aud: 'cid', exp: 1_000_100, nonce: 'n1', email: 'u@corp.com' }

  it('accepts a valid token', () => {
    expect(validateIdTokenClaims(good, base)).toBeNull()
  })
  it('accepts array aud containing the client id', () => {
    expect(validateIdTokenClaims({ ...good, aud: ['other', 'cid'] }, base)).toBeNull()
  })
  it('rejects issuer mismatch', () => {
    expect(validateIdTokenClaims({ ...good, iss: 'https://evil' }, base)).toBe('issuer mismatch')
  })
  it('rejects audience mismatch', () => {
    expect(validateIdTokenClaims({ ...good, aud: 'someone-else' }, base)).toBe('audience mismatch')
  })
  it('rejects expired token (beyond skew)', () => {
    expect(validateIdTokenClaims({ ...good, exp: 999_000 }, base)).toBe('token expired')
  })
  it('rejects nonce mismatch (replay / CSRF)', () => {
    expect(validateIdTokenClaims({ ...good, nonce: 'different' }, base)).toBe('nonce mismatch')
  })
  it('rejects a token with no email', () => {
    const { email: _omit, ...noEmail } = good
    expect(validateIdTokenClaims(noEmail, base)).toBe('no email in token')
  })
})

describe('codeChallengeS256', () => {
  it('matches the RFC 7636 reference vector', () => {
    // verifier "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk" → known S256 challenge
    expect(codeChallengeS256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})

describe('isSsoConfigured', () => {
  it('is false when OIDC env is unset (test env)', () => {
    expect(isSsoConfigured()).toBe(false)
  })
})
