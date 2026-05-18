import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { encryptToken, decryptToken } from '../services/tokenCipher.js'

const SLACK_URL_RE = /^https:\/\/hooks\.slack\.com\/services\//

export async function slackRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] }

  app.get('/', auth, async (req, reply) => {
    const orgId = req.user.org
    const rows = await db`SELECT settings FROM organizations WHERE id = ${orgId} LIMIT 1`
    const settings = (rows[0]?.settings ?? {}) as Record<string, unknown>
    const configured = !!settings.slackWebhookUrl
    return reply.send({ configured, channel: (settings.slackChannel as string | undefined) ?? null })
  })

  app.post('/', auth, async (req, reply) => {
    const body = z.object({
      webhookUrl: z.string().url().regex(SLACK_URL_RE, 'Must be a Slack incoming webhook URL'),
      channel: z.string().optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })

    const { webhookUrl, channel } = body.data
    const orgId = req.user.org
    const encryptedUrl = encryptToken(webhookUrl) ?? webhookUrl

    await db`
      UPDATE organizations
      SET settings = settings || ${db.json({ slackWebhookUrl: encryptedUrl, slackChannel: channel ?? null })},
          updated_at = NOW()
      WHERE id = ${orgId}
    `
    return reply.send({ ok: true })
  })

  app.post('/test', auth, async (req, reply) => {
    const orgId = req.user.org
    const rows = await db`SELECT settings FROM organizations WHERE id = ${orgId} LIMIT 1`
    const settings = (rows[0]?.settings ?? {}) as Record<string, unknown>
    if (!settings.slackWebhookUrl) return reply.code(400).send({ error: 'Slack not configured' })

    let webhookUrl: string
    try {
      webhookUrl = decryptToken(settings.slackWebhookUrl as string)
    } catch {
      webhookUrl = settings.slackWebhookUrl as string
    }

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ':white_check_mark: Velo CRM — Slack integration connected successfully!',
        }),
      })
      if (!res.ok) return reply.code(502).send({ error: 'Slack returned an error', status: res.status })
      return reply.send({ ok: true })
    } catch (err: unknown) {
      return reply.code(502).send({ error: 'Failed to reach Slack', details: String(err) })
    }
  })

  app.delete('/', auth, async (req, reply) => {
    const orgId = req.user.org
    await db`
      UPDATE organizations
      SET settings = settings - 'slackWebhookUrl' - 'slackChannel',
          updated_at = NOW()
      WHERE id = ${orgId}
    `
    return reply.code(204).send()
  })
}

// ─── Outbound notification helper ────────────────────────────────────────────

export async function sendSlackNotification(orgId: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const rows = await db`SELECT settings FROM organizations WHERE id = ${orgId} LIMIT 1`
    const settings = (rows[0]?.settings ?? {}) as Record<string, unknown>
    if (!settings.slackWebhookUrl) return

    let webhookUrl: string
    try {
      webhookUrl = decryptToken(settings.slackWebhookUrl as string)
    } catch {
      webhookUrl = settings.slackWebhookUrl as string
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // fire-and-forget — never throw
  }
}
