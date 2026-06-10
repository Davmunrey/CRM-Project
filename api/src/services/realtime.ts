import { createVerifier } from 'fast-jwt'
import { Redis } from 'ioredis'
import { createAdapter } from '@socket.io/redis-adapter'
import type { Server, Socket } from 'socket.io'
import { env } from '../config/env.js'
import { COOKIE_NAME } from './cookieAuth.js'
import { isTokenDenied, getUserTokensValidAfter } from '../db/redis.js'
import { db } from '../db/client.js'

interface JwtPayload {
  sub: string
  org: string | null
  role: string
  jti?: string
  iat?: number
}

let verifyJwt: ((token: string) => JwtPayload) | null = null

function getVerifier() {
  if (!verifyJwt) {
    verifyJwt = createVerifier({ key: env.JWT_SECRET }) as (token: string) => JwtPayload
  }
  return verifyJwt
}

function extractCookieToken(cookieHeader: string): string | undefined {
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k?.trim() === COOKIE_NAME) return v.join('=')
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Redis adapter setup
// Two dedicated ioredis clients are required for the pub/sub adapter pattern:
// one for publishing, one for subscribing. These are separate from the main
// application redis client to avoid interfering with subscriptions.
// ---------------------------------------------------------------------------
async function setupRedisAdapter(io: Server): Promise<void> {
  const pubClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  })
  const subClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  })

  pubClient.on('error', (err: Error) => {
    console.error('[realtime:redis-pub] error:', err.message)
  })
  subClient.on('error', (err: Error) => {
    console.error('[realtime:redis-sub] error:', err.message)
  })

  try {
    await Promise.all([pubClient.connect(), subClient.connect()])
    io.adapter(createAdapter(pubClient, subClient))
    console.info('[realtime] Redis adapter connected — Socket.io is horizontally scalable')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[realtime] Redis adapter unavailable (${msg}). Falling back to in-memory adapter — multi-node broadcasts will NOT work.`)
    // Do not throw: single-node operation continues normally.
  }
}

// ---------------------------------------------------------------------------
// Debounce map for db:change broadcasts
// Key: `${orgId}:${table}` — value: the pending setTimeout handle.
// If the same (orgId, table) fires within DEBOUNCE_MS, only one emission
// is sent at the trailing edge of the burst.
// ---------------------------------------------------------------------------
const DEBOUNCE_MS = 100
const debounceMap = new Map<string, ReturnType<typeof setTimeout>>()

export function broadcastDbChange(io: Server, orgId: string, table: string): void {
  const key = `${orgId}:${table}`
  const existing = debounceMap.get(key)
  if (existing !== undefined) {
    clearTimeout(existing)
  }
  const handle = setTimeout(() => {
    debounceMap.delete(key)
    io.to(`org:${orgId}`).emit('db:change', { table })
  }, DEBOUNCE_MS)
  debounceMap.set(key, handle)
}

export async function registerRealtimeHandlers(io: Server): Promise<void> {
  await setupRedisAdapter(io)

  io.use(async (socket, next) => {
    // Primary: read JWT from HttpOnly cookie (browser clients)
    const cookieHeader = socket.handshake.headers.cookie ?? ''
    const cookieToken = extractCookieToken(cookieHeader)
    // Fallback: explicit auth.token (native / non-browser clients)
    const authToken = (socket.handshake.auth as { token?: string }).token
    const token = cookieToken ?? authToken

    if (!token) return next(new Error('Unauthorized'))

    let payload: JwtPayload
    try {
      payload = getVerifier()(token)
    } catch {
      return next(new Error('Unauthorized'))
    }

    // Check per-JTI revocation denylist (populated on logout / token rotation)
    if (payload.jti && await isTokenDenied(payload.jti)) {
      return next(new Error('Unauthorized'))
    }

    // Invalidate tokens issued before the user's last login (session replacement)
    if (payload.iat !== undefined) {
      const validAfter = await getUserTokensValidAfter(payload.sub)
      if (validAfter !== null && payload.iat < validAfter) {
        return next(new Error('Unauthorized'))
      }
    }

    const orgId = payload.org
    if (!orgId) return next(new Error('No organization'))

    // Verify the user still exists, is active, and still belongs to the claimed
    // org — mirrors the HTTP auth middleware. Without this, a deactivated or
    // org-removed user keeps receiving org db:change / presence events until
    // their JWT expires (up to 7 days).
    try {
      const rows = await db`
        SELECT 1 FROM users
        WHERE id = ${payload.sub} AND organization_id = ${orgId} AND is_active = true
        LIMIT 1
      `
      if (rows.length === 0) return next(new Error('Unauthorized'))
    } catch {
      return next(new Error('Unauthorized'))
    }

    socket.data['orgId'] = orgId
    socket.data['userId'] = payload.sub
    next()
  })

  io.on('connection', (socket: Socket) => {
    const orgId = socket.data['orgId'] as string
    const userId = socket.data['userId'] as string

    void socket.join(`org:${orgId}`)
    void socket.join(`user:${userId}`)

    socket.to(`org:${orgId}`).emit('presence:join', { userId })

    socket.on('disconnect', () => {
      socket.to(`org:${orgId}`).emit('presence:leave', { userId })
    })
  })
}

export function broadcastToOrg(io: Server, orgId: string, event: string, data: unknown) {
  io.to(`org:${orgId}`).emit(event, data)
}
