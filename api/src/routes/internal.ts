/**
 * Internal operational routes — not exposed to end-users.
 *
 * All routes require the X-Internal-Key header to match the INTERNAL_KEY
 * environment variable. These routes must NOT be registered under any prefix
 * that is accessible to the public internet (or should sit behind an ingress
 * rule that only allows internal / ops traffic).
 *
 * Currently exposes:
 *   POST /internal/sequences/run  — trigger one sequence runner cycle immediately
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../config/env.js'
import { runSequenceCycle } from '../workers/sequenceRunner.js'

function internalKeyGuard(req: FastifyRequest, reply: FastifyReply): boolean {
  if (!env.INTERNAL_KEY) {
    // INTERNAL_KEY not configured — reject all calls to prevent open access
    reply.code(503).send({ error: 'Internal key not configured' })
    return false
  }
  const provided = req.headers['x-internal-key']
  if (provided !== env.INTERNAL_KEY) {
    reply.code(401).send({ error: 'Unauthorized' })
    return false
  }
  return true
}

export async function internalRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /internal/sequences/run
   *
   * Immediately triggers one sequence runner cycle (same logic as the
   * background worker tick). Returns a summary of what happened.
   *
   * Protected by x-internal-key header.
   */
  app.post('/sequences/run', async (req, reply) => {
    if (!internalKeyGuard(req, reply)) return

    const start = Date.now()
    try {
      await runSequenceCycle()
      const elapsed = Date.now() - start
      return reply.send({ ok: true, message: 'Sequence cycle completed', elapsedMs: elapsed })
    } catch (err) {
      app.log.error({ err }, '[internal] sequence cycle error')
      return reply.code(500).send({
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  })
}
