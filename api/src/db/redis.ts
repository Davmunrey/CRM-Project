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

/** Add a JWT jti to the revocation denylist. TTL matches token expiry. */
export async function denyToken(jti: string, ttlSeconds: number): Promise<void> {
  await redis.set(`${DENYLIST_PREFIX}${jti}`, '1', 'EX', ttlSeconds)
}

/** Returns true if this jti has been revoked. */
export async function isTokenDenied(jti: string): Promise<boolean> {
  const val = await redis.get(`${DENYLIST_PREFIX}${jti}`)
  return val !== null
}
