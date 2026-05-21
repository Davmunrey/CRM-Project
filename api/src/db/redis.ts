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
