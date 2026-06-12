import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toJson = (v: unknown) => db.json(v as any)

export async function userPreferencesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // ── GET /preferences/me ────────────────────────────────────────────────────
  app.get('/me', async (req, reply) => {
    const userId = req.user.sub
    const [row] = await db`SELECT * FROM user_preferences WHERE user_id = ${userId} LIMIT 1`
    if (!row) return reply.send({ navigation: {}, onboarding: {}, dashboard: {} })
    return reply.send({ navigation: row.navigation ?? {}, onboarding: row.onboarding ?? {}, dashboard: row.dashboard ?? {} })
  })

  // ── PATCH /preferences/me/navigation ──────────────────────────────────────
  app.patch('/me/navigation', async (req, reply) => {
    const userId = req.user.sub
    const body = z.record(z.unknown()).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const now = new Date().toISOString()
    const rows = await db`
      INSERT INTO user_preferences (user_id, navigation, onboarding, updated_at)
      VALUES (${userId}, ${toJson(body.data)}, ${toJson({})}, ${now})
      ON CONFLICT (user_id) DO UPDATE SET
        navigation = EXCLUDED.navigation,
        updated_at = EXCLUDED.updated_at
      RETURNING navigation
    `
    return reply.send({ navigation: rows[0]?.navigation ?? {} })
  })

  // ── PATCH /preferences/me/onboarding ──────────────────────────────────────
  app.patch('/me/onboarding', async (req, reply) => {
    const userId = req.user.sub
    const body = z.record(z.unknown()).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const now = new Date().toISOString()
    const rows = await db`
      INSERT INTO user_preferences (user_id, navigation, onboarding, updated_at)
      VALUES (${userId}, ${toJson({})}, ${toJson(body.data)}, ${now})
      ON CONFLICT (user_id) DO UPDATE SET
        onboarding = user_preferences.onboarding || ${toJson(body.data)},
        updated_at = EXCLUDED.updated_at
      RETURNING onboarding
    `
    return reply.send({ onboarding: rows[0]?.onboarding ?? {} })
  })

  // ── PATCH /preferences/me/dashboard ────────────────────────────────────────
  // Persists the composable dashboard layout ({ widgets: [...] }) for this user.
  app.patch('/me/dashboard', async (req, reply) => {
    const userId = req.user.sub
    const body = z.record(z.unknown()).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const now = new Date().toISOString()
    const rows = await db`
      INSERT INTO user_preferences (user_id, navigation, onboarding, dashboard, updated_at)
      VALUES (${userId}, ${toJson({})}, ${toJson({})}, ${toJson(body.data)}, ${now})
      ON CONFLICT (user_id) DO UPDATE SET
        dashboard = EXCLUDED.dashboard,
        updated_at = EXCLUDED.updated_at
      RETURNING dashboard
    `
    return reply.send({ dashboard: rows[0]?.dashboard ?? {} })
  })
}
