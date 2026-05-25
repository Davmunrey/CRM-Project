import type { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { redis } from '../db/redis.js'

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async (_req, reply) => {
    const timestamp = new Date().toISOString()
    const uptime = Math.floor(process.uptime())

    let dbStatus: 'ok' | 'error' = 'ok'
    let redisStatus: 'ok' | 'error' = 'ok'

    // Actively probe the database with a trivial query.
    try {
      await db`SELECT 1`
    } catch {
      dbStatus = 'error'
    }

    // Actively probe Redis with PING.
    try {
      const pong = await redis.ping()
      if (pong !== 'PONG') redisStatus = 'error'
    } catch {
      redisStatus = 'error'
    }

    const healthy = dbStatus === 'ok' && redisStatus === 'ok'
    const statusCode = healthy ? 200 : 503

    return reply.code(statusCode).send({
      status: healthy ? 'ok' : 'degraded',
      timestamp,
      db: dbStatus,
      redis: redisStatus,
      uptime,
    })
  })
}
