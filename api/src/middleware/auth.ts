import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/client.js'
import { isTokenDenied } from '../db/redis.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export function authMiddleware(app: FastifyInstance) {
  return async function authenticate(req: FastifyRequest, reply: FastifyReply) {
    try {
      await req.jwtVerify()
      const payload = req.user

      // Check revocation denylist (populated on logout)
      const jti = (payload as unknown as { jti?: string }).jti
      if (jti && await isTokenDenied(jti)) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      // Verify user still exists and org membership is valid.
      // When org claim is null (user registered but hasn't created an org yet),
      // use IS NULL — PostgreSQL's = null is never true.
      const rows = payload.org
        ? await db`
            SELECT u.id, u.organization_id, u.role, u.is_active
            FROM users u
            WHERE u.id = ${payload.sub}
              AND u.organization_id = ${payload.org}
              AND u.is_active = true
            LIMIT 1
          `
        : await db`
            SELECT u.id, u.organization_id, u.role, u.is_active
            FROM users u
            WHERE u.id = ${payload.sub}
              AND u.organization_id IS NULL
              AND u.is_active = true
            LIMIT 1
          `
      if (rows.length === 0) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  }
}
