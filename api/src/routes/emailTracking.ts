import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { env } from '../config/env.js'

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
)

export async function emailTrackingRoutes(app: FastifyInstance) {
  // POST /email-tracking/messages — register a tracked email (returns open_token)
  app.post('/messages', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const body = z.object({
      email_id: z.string(),
      open_token: z.string().optional(),
      contact_id: z.string().uuid().nullable().optional(),
      company_id: z.string().uuid().nullable().optional(),
      deal_id: z.string().uuid().nullable().optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const rows = body.data.open_token
      ? await db`
          INSERT INTO email_tracking_messages (email_id, organization_id, user_id, contact_id, company_id, deal_id, open_token)
          VALUES (
            ${body.data.email_id}, ${req.user.org}, ${req.user.sub},
            ${body.data.contact_id ?? null}, ${body.data.company_id ?? null}, ${body.data.deal_id ?? null},
            ${body.data.open_token}
          )
          RETURNING id, open_token
        `
      : await db`
          INSERT INTO email_tracking_messages (email_id, organization_id, user_id, contact_id, company_id, deal_id)
          VALUES (
            ${body.data.email_id}, ${req.user.org}, ${req.user.sub},
            ${body.data.contact_id ?? null}, ${body.data.company_id ?? null}, ${body.data.deal_id ?? null}
          )
          RETURNING id, open_token
        `

    const row = rows[0]!
    const apiBase = env.APP_URL.replace(/\/$/, '')
    const openUrl = `${apiBase}/api/email-tracking/open?token=${row.openToken as string}`
    return reply.code(201).send({ id: row.id, open_token: row.openToken, open_url: openUrl })
  })

  // POST /email-tracking/links — register tracked links (batch)
  app.post('/links', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const body = z.object({
      links: z.array(z.object({
        tracking_message_id: z.string().uuid(),
        email_id: z.string(),
        original_url: z.string().url(),
        click_token: z.string().optional(),
        contact_id: z.string().uuid().nullable().optional(),
      })).min(1),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const apiBase = env.APP_URL.replace(/\/$/, '')
    // Collect unique tracking_message_ids and verify they all belong to this org
    const messageIds = [...new Set(body.data.links.map((l) => l.tracking_message_id))]
    for (const msgId of messageIds) {
      const own = await db`SELECT 1 FROM email_tracking_messages WHERE id = ${msgId} AND organization_id = ${req.user.org} LIMIT 1`
      if (own.length === 0) return reply.code(404).send({ error: 'Tracking message not found' })
    }
    if (body.data.links.some((l) => l.contact_id)) {
      for (const link of body.data.links.filter((l) => l.contact_id)) {
        const own = await db`SELECT 1 FROM contacts WHERE id = ${link.contact_id!} AND organization_id = ${req.user.org} LIMIT 1`
        if (own.length === 0) return reply.code(404).send({ error: 'Contact not found' })
      }
    }
    const results: Array<{ id: string; click_token: string; click_url: string; original_url: string }> = []
    for (const link of body.data.links) {
      const rows = link.click_token
        ? await db`
            INSERT INTO email_tracking_links (tracking_message_id, email_id, organization_id, contact_id, original_url, click_token)
            VALUES (${link.tracking_message_id}, ${link.email_id}, ${req.user.org}, ${link.contact_id ?? null}, ${link.original_url}, ${link.click_token})
            RETURNING id, click_token, original_url
          `
        : await db`
            INSERT INTO email_tracking_links (tracking_message_id, email_id, organization_id, contact_id, original_url)
            VALUES (${link.tracking_message_id}, ${link.email_id}, ${req.user.org}, ${link.contact_id ?? null}, ${link.original_url})
            RETURNING id, click_token, original_url
          `
      if (rows.length > 0) {
        const row = rows[0]!
        results.push({
          id: row.id as string,
          click_token: row.clickToken as string,
          click_url: `${apiBase}/api/email-tracking/click?token=${row.clickToken as string}`,
          original_url: row.originalUrl as string,
        })
      }
    }
    return reply.code(201).send(results)
  })

  // GET /email-tracking/open — pixel beacon (public, no auth)
  app.get('/open', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { token } = req.query as { token?: string }
    if (token) {
      const rows = await db`
        SELECT id, organization_id, contact_id, email_id
        FROM email_tracking_messages WHERE open_token = ${token} LIMIT 1
      `
      if (rows.length > 0) {
        const row = rows[0]!
        const ua = (req.headers['user-agent'] as string | undefined) ?? null
        await db`
          INSERT INTO email_tracking_events (tracking_message_id, email_id, organization_id, contact_id, event_type, user_agent)
          VALUES (${row.id}, ${row.emailId}, ${row.organizationId}, ${row.contactId ?? null}, 'open', ${ua})
        `.catch(() => null)
      }
    }
    return reply
      .header('Content-Type', 'image/gif')
      .header('Cache-Control', 'no-store, no-cache, must-revalidate')
      .send(TRANSPARENT_GIF)
  })

  // GET /email-tracking/click — redirect and record click (public, no auth)
  app.get('/click', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { token } = req.query as { token?: string }
    let redirectTo = '/'
    if (token) {
      const rows = await db`
        SELECT etl.id, etl.original_url, etl.email_id, etl.organization_id, etl.contact_id,
               etm.id AS tracking_message_id
        FROM email_tracking_links etl
        JOIN email_tracking_messages etm ON etm.id = etl.tracking_message_id
        WHERE etl.click_token = ${token}
        LIMIT 1
      `
      if (rows.length > 0) {
        const row = rows[0]!
        const url = row.originalUrl as string
        // Only redirect to http(s) URLs — reject javascript:/data: schemes
        redirectTo = /^https?:\/\//i.test(url) ? url : '/'
        const ua = (req.headers['user-agent'] as string | undefined) ?? null
        await db`
          INSERT INTO email_tracking_events (
            tracking_message_id, link_id, email_id, organization_id, contact_id, event_type, user_agent
          ) VALUES (
            ${row.trackingMessageId}, ${row.id}, ${row.emailId}, ${row.organizationId},
            ${row.contactId ?? null}, 'click', ${ua}
          )
        `.catch(() => null)
      }
    }
    return reply.redirect(redirectTo, 302)
  })

  // GET /email-tracking/messages/:emailId/stats — per-email open/click counts
  app.get('/messages/:emailId/stats', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.send({ opens: 0, clicks: 0 })
    const { emailId } = req.params as { emailId: string }
    const rows = await db`
      SELECT event_type, COUNT(*) AS count
      FROM email_tracking_events
      WHERE organization_id = ${req.user.org}
        AND email_id = ${emailId}
      GROUP BY event_type
    `
    const opens = rows.find((r) => r.eventType === 'open')?.count ?? 0
    const clicks = rows.find((r) => r.eventType === 'click')?.count ?? 0
    return reply.send({ opens: Number(opens), clicks: Number(clicks) })
  })

  // GET /email-tracking/stats — aggregate open/click counts for org
  app.get('/stats', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.send({ opens: 0, clicks: 0 })
    const qSchema = z.object({
      from: z.string().datetime({ offset: true }).optional(),
      to: z.string().datetime({ offset: true }).optional(),
    })
    const q = qSchema.safeParse(req.query)
    if (!q.success) return reply.code(400).send({ error: 'Invalid date range' })
    const from = q.data.from ?? new Date(Date.now() - 180 * 86400000).toISOString()
    const to = q.data.to ?? new Date().toISOString()

    const rows = await db`
      SELECT event_type, COUNT(*) AS count
      FROM email_tracking_events
      WHERE organization_id = ${req.user.org}
        AND created_at >= ${from}
        AND created_at <= ${to}
      GROUP BY event_type
    `
    const opens = rows.find((r) => r.eventType === 'open')?.count ?? 0
    const clicks = rows.find((r) => r.eventType === 'click')?.count ?? 0
    return reply.send({ opens: Number(opens), clicks: Number(clicks) })
  })
}
