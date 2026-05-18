import { createVerifier } from 'fast-jwt'
import type { Server, Socket } from 'socket.io'
import { env } from '../config/env.js'

interface JwtPayload {
  sub: string
  org: string | null
  role: string
}

let verifyJwt: ((token: string) => JwtPayload) | null = null

function getVerifier() {
  if (!verifyJwt) {
    verifyJwt = createVerifier({ key: env.JWT_SECRET }) as (token: string) => JwtPayload
  }
  return verifyJwt
}

export function registerRealtimeHandlers(io: Server) {
  io.use((socket, next) => {
    const { token } = socket.handshake.auth as { token?: string }
    if (!token) return next(new Error('Unauthorized'))

    let payload: JwtPayload
    try {
      payload = getVerifier()(token)
    } catch {
      return next(new Error('Unauthorized'))
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
