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

/** Map an HTTP method to a CRUD action: GET/HEAD→read, DELETE→delete, else write. */
export function crudAction(method: string): 'read' | 'write' | 'delete' {
  const m = method.toUpperCase()
  if (m === 'GET' || m === 'HEAD') return 'read'
  if (m === 'DELETE') return 'delete'
  return 'write'
}

/**
 * Resource-wide RBAC guard for CRUD route plugins: derives the permission from
 * the request method (`<resource>:<read|write|delete>`). Register once per
 * resource plugin as a preHandler hook so reads stay open to readers while
 * writes/deletes require the matching permission (e.g. viewer is read-only).
 */
export function requireCrudPermission(resource: string) {
  return async function crudGuard(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const role = (req.user as { role?: string } | undefined)?.role ?? ''
    if (!roleHasPermission(role, `${resource}:${crudAction(req.method)}`)) {
      return reply.code(403).send({ error: 'Insufficient permissions' })
    }
  }
}
