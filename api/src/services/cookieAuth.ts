import type { FastifyReply } from 'fastify'

const COOKIE_NAME = 'auth_token'

export function setAuthCookie(reply: FastifyReply, token: string, ttlSeconds: number): void {
  reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ttlSeconds,
  })
}

export function clearAuthCookie(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_NAME, { path: '/' })
}

export { COOKIE_NAME }
