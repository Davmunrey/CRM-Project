import type { FastifyReply, FastifyRequest } from 'fastify'

const COOKIE_NAME = 'auth_token'
const RESTORE_COOKIE_NAME = 'auth_token_restore'

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

export function setRestoreCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(RESTORE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 3600,
  })
}

export function clearRestoreCookie(reply: FastifyReply): void {
  reply.clearCookie(RESTORE_COOKIE_NAME, { path: '/' })
}

export function getRestoreCookie(req: FastifyRequest): string | undefined {
  return (req.cookies as Record<string, string | undefined>)[RESTORE_COOKIE_NAME]
}

export { COOKIE_NAME, RESTORE_COOKIE_NAME }
