/**
 * Provider-agnostic OpenID Connect (Authorization Code flow).
 *
 * Works with any compliant IdP (Microsoft Entra, Okta, Google Workspace, Auth0…)
 * via its discovery document. SSO is enabled only when OIDC_ISSUER + CLIENT_ID +
 * CLIENT_SECRET are configured. The ID token is verified by JWKS RS256 signature
 * plus iss/aud/exp/nonce claim checks before any user is provisioned.
 *
 * The pure helpers (decodeJwtSegment, validateIdTokenClaims) are unit-tested; the
 * network bits (discovery, token exchange, JWKS) are thin fetch wrappers.
 */
import { createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto'
import { env } from '../config/env.js'

export function isSsoConfigured(): boolean {
  return Boolean(env.OIDC_ISSUER && env.OIDC_CLIENT_ID && env.OIDC_CLIENT_SECRET)
}

function b64urlToBuffer(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

/** Decode one base64url JWT segment to JSON (pure; throws on malformed input). */
export function decodeJwtSegment(segment: string): Record<string, unknown> {
  return JSON.parse(b64urlToBuffer(segment).toString('utf8')) as Record<string, unknown>
}

export interface IdTokenClaims {
  iss?: string
  aud?: string | string[]
  exp?: number
  nonce?: string
  email?: string
  email_verified?: boolean
  name?: string
  sub?: string
}

/**
 * Validate ID-token claims (pure). Checks issuer match, audience contains our
 * client id, not expired (with small skew), and nonce matches. Returns an error
 * string or null when valid. `nowSec` is injectable for tests.
 */
export function validateIdTokenClaims(
  claims: IdTokenClaims,
  opts: { issuer: string; clientId: string; nonce: string; nowSec?: number; skewSec?: number },
): string | null {
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000)
  const skew = opts.skewSec ?? 60
  if (claims.iss !== opts.issuer) return 'issuer mismatch'
  const aud = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : []
  if (!aud.includes(opts.clientId)) return 'audience mismatch'
  if (typeof claims.exp !== 'number' || claims.exp + skew < now) return 'token expired'
  if (!claims.nonce || claims.nonce !== opts.nonce) return 'nonce mismatch'
  if (!claims.email) return 'no email in token'
  return null
}

// ── Discovery (cached) ────────────────────────────────────────────────────────
interface OidcConfig {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  jwks_uri: string
}
let cachedConfig: OidcConfig | null = null

export async function discover(): Promise<OidcConfig> {
  if (cachedConfig) return cachedConfig
  const url = `${env.OIDC_ISSUER!.replace(/\/$/, '')}/.well-known/openid-configuration`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OIDC discovery failed (${res.status})`)
  const cfg = (await res.json()) as OidcConfig
  cachedConfig = cfg
  return cfg
}

/** PKCE S256 challenge for a verifier. */
export function codeChallengeS256(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function buildAuthorizeUrl(cfg: OidcConfig, params: { state: string; nonce: string; codeChallenge: string }): string {
  const q = new URLSearchParams({
    client_id: env.OIDC_CLIENT_ID!,
    redirect_uri: env.OIDC_REDIRECT_URI ?? '',
    response_type: 'code',
    scope: 'openid email profile',
    state: params.state,
    nonce: params.nonce,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${cfg.authorization_endpoint}?${q.toString()}`
}

export async function exchangeCode(cfg: OidcConfig, code: string, codeVerifier: string): Promise<{ id_token: string }> {
  const res = await fetch(cfg.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.OIDC_REDIRECT_URI ?? '',
      client_id: env.OIDC_CLIENT_ID!,
      client_secret: env.OIDC_CLIENT_SECRET!,
      code_verifier: codeVerifier,
    }).toString(),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText)
    throw new Error(`OIDC token exchange failed (${res.status}): ${t.slice(0, 200)}`)
  }
  const body = (await res.json()) as { id_token?: string }
  if (!body.id_token) throw new Error('no id_token in token response')
  return { id_token: body.id_token }
}

interface Jwk { kid?: string; kty?: string; alg?: string; use?: string; n?: string; e?: string }

/** Verify a JWT's RS256 signature against the IdP's JWKS, then return its claims. */
export async function verifyIdToken(cfg: OidcConfig, idToken: string): Promise<IdTokenClaims> {
  const parts = idToken.split('.')
  if (parts.length !== 3) throw new Error('malformed id_token')
  const [headerB64, payloadB64, sigB64] = parts as [string, string, string]
  const header = decodeJwtSegment(headerB64) as { alg?: string; kid?: string }
  if (header.alg !== 'RS256') throw new Error(`unsupported id_token alg: ${header.alg}`)

  const jwksRes = await fetch(cfg.jwks_uri)
  if (!jwksRes.ok) throw new Error(`JWKS fetch failed (${jwksRes.status})`)
  const { keys } = (await jwksRes.json()) as { keys: Jwk[] }
  const jwk = keys.find((k) => k.kid === header.kid && (k.kty === 'RSA')) ?? keys.find((k) => k.kty === 'RSA')
  if (!jwk) throw new Error('no matching JWKS key')

  const pubKey = createPublicKey({ key: jwk as unknown as import('node:crypto').JsonWebKey, format: 'jwk' })
  const ok = cryptoVerify('RSA-SHA256', Buffer.from(`${headerB64}.${payloadB64}`), pubKey, b64urlToBuffer(sigB64))
  if (!ok) throw new Error('id_token signature verification failed')

  return decodeJwtSegment(payloadB64) as IdTokenClaims
}
