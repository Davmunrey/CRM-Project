import type { FastifyInstance, FastifyReply } from 'fastify'
import { db } from '../db/client.js'
import { redis } from '../db/redis.js'

/** Probe dependencies and report readiness (200 ready / 503 degraded). */
async function readiness(reply: FastifyReply) {
  const timestamp = new Date().toISOString()
  const uptime = Math.floor(process.uptime())

  let dbStatus: 'ok' | 'error' = 'ok'
  let redisStatus: 'ok' | 'error' = 'ok'

  try {
    await db`SELECT 1`
  } catch {
    dbStatus = 'error'
  }
  try {
    const pong = await redis.ping()
    if (pong !== 'PONG') redisStatus = 'error'
  } catch {
    redisStatus = 'error'
  }

  const healthy = dbStatus === 'ok' && redisStatus === 'ok'
  return reply.code(healthy ? 200 : 503).send({
    status: healthy ? 'ok' : 'degraded',
    timestamp,
    db: dbStatus,
    redis: redisStatus,
    uptime,
  })
}

export async function healthRoute(app: FastifyInstance) {
  // /health and /health/ready: full readiness probe (DB + Redis). /health is kept
  // for back-compat with existing container healthchecks.
  app.get('/health', { config: { rateLimit: false } }, async (_req, reply) => readiness(reply))
  app.get('/health/ready', { config: { rateLimit: false } }, async (_req, reply) => readiness(reply))

  // /health/live: liveness only — process is up. No dependency checks, so a
  // transient DB/Redis blip can't trigger a restart loop via the orchestrator.
  app.get('/health/live', { config: { rateLimit: false } }, async (_req, reply) =>
    reply.code(200).send({ status: 'ok', uptime: Math.floor(process.uptime()) }),
  )
}
