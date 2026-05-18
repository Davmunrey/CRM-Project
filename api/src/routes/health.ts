import type { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async (_req, reply) => {
    try {
      await db`SELECT 1`
      return reply.send({ status: 'ok', db: 'connected', ts: new Date().toISOString() })
    } catch {
      return reply.code(503).send({ status: 'degraded', db: 'unreachable' })
    }
  })
}
