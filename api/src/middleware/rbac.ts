/**
 * RBAC preHandler factory. Use on any route that needs a specific permission:
 *
 *   app.post('/things', { onRequest: [app.authenticate], preHandler: [requirePermission('things:write')] }, handler)
 *
 * Enforced server-side via the permission matrix in services/permissions.ts, so
 * authorization no longer depends on the frontend. Returns 403 when the caller's
 * role lacks the permission. (Must run after `authenticate` so req.user is set.)
 */
import type { FastifyRequest, FastifyReply } from 'fastify'
import { roleHasPermission } from '../services/permissions.js'

export function requirePermission(permission: string) {
  return async function rbacGuard(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const role = (req.user as { role?: string } | undefined)?.role ?? ''
    if (!roleHasPermission(role, permission)) {
      return reply.code(403).send({ error: 'Insufficient permissions' })
    }
  }
}
