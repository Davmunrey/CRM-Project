import { Redis } from 'ioredis'
import { env } from '../config/env.js'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
})

redis.on('error', (err: Error) => {
  console.error('[redis] connection error:', err.message)
})

const DENYLIST_PREFIX = 'jwt:deny:'
const VALID_AFTER_PREFIX = 'user:valid_after:'

/** Add a JWT jti to the revocation denylist. TTL matches token expiry. */
export async function denyToken(jti: string, ttlSeconds: number): Promise<void> {
  await redis.set(`${DENYLIST_PREFIX}${jti}`, '1', 'EX', ttlSeconds)
}

/** Returns true if this jti has been revoked. */
export async function isTokenDenied(jti: string): Promise<boolean> {
  const val = await redis.get(`${DENYLIST_PREFIX}${jti}`)
  return val !== null
}

/**
 * Record a login event: any token issued before this moment (Unix seconds)
 * is considered invalid, invalidating all pre-existing sessions.
 */
export async function setUserTokensValidAfter(userId: string, ttlSeconds: number): Promise<void> {
  await redis.set(`${VALID_AFTER_PREFIX}${userId}`, String(Math.floor(Date.now() / 1000)), 'EX', ttlSeconds)
}

/** Returns the Unix timestamp (seconds) before which tokens are rejected, or null if unset. */
export async function getUserTokensValidAfter(userId: string): Promise<number | null> {
  const val = await redis.get(`${VALID_AFTER_PREFIX}${userId}`)
  return val !== null ? parseInt(val, 10) : null
}

const OAUTH_STATE_PREFIX = 'oauth:gmail:state:'

/** Bind a Gmail OAuth `state` nonce to the user who started the flow (10-min TTL). */
export async function storeOAuthState(state: string, userId: string): Promise<void> {
  await redis.set(`${OAUTH_STATE_PREFIX}${state}`, userId, 'EX', 600)
}

/**
 * Consume a Gmail OAuth `state` nonce. Returns the userId that started the flow,
 * or null if the state is unknown/expired. One-time use (deleted on read) so a
 * captured state cannot be replayed.
 */
export async function consumeOAuthState(state: string): Promise<string | null> {
  const key = `${OAUTH_STATE_PREFIX}${state}`
  const userId = await redis.get(key)
  if (userId !== null) await redis.del(key)
  return userId
}

// ── SSO (OIDC) flow state ──────────────────────────────────────────────────────
const SSO_STATE_PREFIX = 'oidc:state:'

/** Persist the per-login OIDC state→{nonce,codeVerifier} binding (10-min TTL). */
export async function storeSsoFlow(state: string, data: { nonce: string; codeVerifier: string }): Promise<void> {
  await redis.set(`${SSO_STATE_PREFIX}${state}`, JSON.stringify(data), 'EX', 600)
}

/** Consume the OIDC flow state (one-time use). Returns null when unknown/expired. */
export async function consumeSsoFlow(state: string): Promise<{ nonce: string; codeVerifier: string } | null> {
  const key = `${SSO_STATE_PREFIX}${state}`
  const v = await redis.get(key)
  if (v !== null) await redis.del(key)
  return v ? (JSON.parse(v) as { nonce: string; codeVerifier: string }) : null
}

// ── Account lockout (brute-force / credential-stuffing defense) ────────────────
const LOGIN_FAIL_PREFIX = 'login:fail:'
export const LOGIN_LOCK_THRESHOLD = 10
const LOGIN_FAIL_WINDOW_SEC = 900 // 15 minutes (sliding via TTL on first failure)

/** Increment the failed-login counter for an account key; returns the new count. */
export async function recordFailedLogin(accountKey: string): Promise<number> {
  const key = `${LOGIN_FAIL_PREFIX}${accountKey}`
  const n = await redis.incr(key)
  if (n === 1) await redis.expire(key, LOGIN_FAIL_WINDOW_SEC)
  return n
}

/** Clear the failed-login counter on a successful authentication. */
export async function clearFailedLogins(accountKey: string): Promise<void> {
  await redis.del(`${LOGIN_FAIL_PREFIX}${accountKey}`)
}

/** True once an account has hit the failure threshold within the window. */
export async function isLoginLocked(accountKey: string): Promise<boolean> {
  const v = await redis.get(`${LOGIN_FAIL_PREFIX}${accountKey}`)
  return v !== null && parseInt(v, 10) >= LOGIN_LOCK_THRESHOLD
}
