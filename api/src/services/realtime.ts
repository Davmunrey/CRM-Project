import { createVerifier } from 'fast-jwt'
import type { Server, Socket } from 'socket.io'
import { env } from '../config/env.js'
import { COOKIE_NAME } from './cookieAuth.js'
import { isTokenDenied, getUserTokensValidAfter } from '../db/redis.js'

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

export function registerRealtimeHandlers(io: Server) {
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
