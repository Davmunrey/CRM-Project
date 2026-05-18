import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { decryptToken } from '../services/tokenCipher.js'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

// ─── Token helpers ─────────────────────────────────────────────────────────────

async function getAccessToken(userId: string, orgId: string): Promise<string> {
  const rows = await db`
    SELECT access_token, token_expiry, refresh_token, refresh_token_cipher
    FROM gmail_tokens
    WHERE user_id = ${userId} AND organization_id = ${orgId} AND is_active = true
    LIMIT 1
  `
  if (rows.length === 0) throw new Error('Google not connected')
  const row = rows[0]!
  const scopes = (row.scopes as string | null) ?? ''
  if (!scopes.includes('calendar')) throw new Error('Calendar scope not granted')

  const expiry = row.tokenExpiry ? new Date(row.tokenExpiry as string) : new Date(0)
  if (expiry > new Date(Date.now() + 60_000)) {
    return row.accessToken as string
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth not configured')
  }
  const refreshToken = row.refreshTokenCipher
    ? decryptToken(row.refreshTokenCipher as string)
    : (row.refreshToken as string)

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
  const data = await res.json() as { access_token: string; expires_in: number }

  const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString()
  await db`
    UPDATE gmail_tokens
    SET access_token = ${data.access_token}, token_expiry = ${newExpiry}, updated_at = now()
    WHERE user_id = ${userId} AND organization_id = ${orgId}
  `
  return data.access_token
}

// ─── Google Calendar API wrappers ──────────────────────────────────────────────

interface GoogleCalendarEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  status?: string
  htmlLink?: string
  hangoutLink?: string
  organizer?: { email?: string }
  attendees?: { email: string; displayName?: string; responseStatus?: string }[]
  recurrence?: string[]
}

interface GoogleCalendarEventList {
  items?: GoogleCalendarEvent[]
  nextPageToken?: string
  nextSyncToken?: string
}

function googleEventToRow(
  e: GoogleCalendarEvent,
  userId: string,
  orgId: string,
  calendarId: string,
) {
  const allDay = Boolean(!e.start.dateTime && e.start.date)
  const startAt = e.start.dateTime ?? `${e.start.date}T00:00:00Z`
  const endAt = e.end.dateTime ?? `${e.end.date}T23:59:59Z`
  return {
    organization_id: orgId,
    user_id: userId,
    google_event_id: e.id,
    google_calendar_id: calendarId,
    title: e.summary ?? '',
    description: e.description ?? null,
    location: e.location ?? null,
    start_at: startAt,
    end_at: endAt,
    all_day: allDay,
    status: e.status ?? 'confirmed',
    html_link: e.htmlLink ?? null,
    meet_link: e.hangoutLink ?? null,
    organizer_email: e.organizer?.email ?? null,
    attendees: JSON.stringify(e.attendees ?? []),
    recurrence: e.recurrence ?? null,
  }
}

export async function calendarRoutes(app: FastifyInstance) {
  // ─── List events (from DB cache) ────────────────────────────────────────────
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const q = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      contact_id: z.string().uuid().optional(),
      deal_id: z.string().uuid().optional(),
      limit: z.coerce.number().default(200),
    }).safeParse(req.query)
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' })

    const from = q.data.from ? new Date(q.data.from).toISOString() : new Date(Date.now() - 30 * 86400_000).toISOString()
    const to = q.data.to ? new Date(q.data.to).toISOString() : new Date(Date.now() + 90 * 86400_000).toISOString()

    const rows = await db`
      SELECT id, google_event_id, google_calendar_id, title, description, location,
             start_at, end_at, all_day, status, html_link, meet_link, organizer_email,
             attendees, recurrence, contact_id, company_id, deal_id, synced_at, updated_at
      FROM calendar_events
      WHERE organization_id = ${req.user.org}
        AND user_id = ${req.user.sub}
        AND start_at >= ${from}
        AND start_at <= ${to}
        ${q.data.contact_id ? db`AND contact_id = ${q.data.contact_id}` : db``}
        ${q.data.deal_id ? db`AND deal_id = ${q.data.deal_id}` : db``}
      ORDER BY start_at ASC
      LIMIT ${q.data.limit}
    `
    return reply.send({ data: rows })
  })

  // ─── Sync events from Google Calendar ──────────────────────────────────────
  app.post('/sync', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const body = z.object({
      calendarId: z.string().default('primary'),
      daysBack: z.number().min(1).max(365).default(30),
      daysAhead: z.number().min(1).max(365).default(90),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    let accessToken: string
    try {
      accessToken = await getAccessToken(req.user.sub, req.user.org)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Token error'
      return reply.code(400).send({ error: msg })
    }

    const calId = body.data.calendarId
    const timeMin = new Date(Date.now() - body.data.daysBack * 86400_000).toISOString()
    const timeMax = new Date(Date.now() + body.data.daysAhead * 86400_000).toISOString()

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '500',
    })

    const res = await fetch(
      `${CALENDAR_API}/calendars/${encodeURIComponent(calId)}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      return reply.code(res.status).send({ error: `Calendar API error: ${err}` })
    }

    const data = await res.json() as GoogleCalendarEventList
    const items = data.items ?? []

    let upserted = 0
    let deleted = 0
    for (const event of items) {
      if (event.status === 'cancelled') {
        await db`
          DELETE FROM calendar_events
          WHERE google_event_id = ${event.id}
            AND user_id = ${req.user.sub}
            AND organization_id = ${req.user.org}
        `
        deleted++
        continue
      }
      const row = googleEventToRow(event, req.user.sub, req.user.org, calId)
      await db`
        INSERT INTO calendar_events ${db(row)}
        ON CONFLICT (user_id, organization_id, google_event_id)
        DO UPDATE SET
          title             = EXCLUDED.title,
          description       = EXCLUDED.description,
          location          = EXCLUDED.location,
          start_at          = EXCLUDED.start_at,
          end_at            = EXCLUDED.end_at,
          all_day           = EXCLUDED.all_day,
          status            = EXCLUDED.status,
          html_link         = EXCLUDED.html_link,
          meet_link         = EXCLUDED.meet_link,
          organizer_email   = EXCLUDED.organizer_email,
          attendees         = EXCLUDED.attendees,
          recurrence        = EXCLUDED.recurrence,
          synced_at         = now(),
          updated_at        = now()
      `
      upserted++
    }

    return reply.send({ ok: true, upserted, deleted, total: items.length })
  })

  // ─── Create event in Google Calendar + store in DB ─────────────────────────
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const body = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      location: z.string().optional(),
      startAt: z.string(),
      endAt: z.string(),
      allDay: z.boolean().default(false),
      calendarId: z.string().default('primary'),
      attendeeEmails: z.array(z.string().email()).optional(),
      addMeet: z.boolean().default(false),
      contact_id: z.string().uuid().optional(),
      company_id: z.string().uuid().optional(),
      deal_id: z.string().uuid().optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const d = body.data
    let accessToken: string
    try {
      accessToken = await getAccessToken(req.user.sub, req.user.org)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Token error'
      return reply.code(400).send({ error: msg })
    }

    const googleEvent: Record<string, unknown> = {
      summary: d.title,
      description: d.description ?? '',
      location: d.location ?? '',
      start: d.allDay
        ? { date: d.startAt.split('T')[0] }
        : { dateTime: d.startAt, timeZone: 'UTC' },
      end: d.allDay
        ? { date: d.endAt.split('T')[0] }
        : { dateTime: d.endAt, timeZone: 'UTC' },
      attendees: (d.attendeeEmails ?? []).map((email) => ({ email })),
    }
    if (d.addMeet) {
      googleEvent.conferenceData = {
        createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } },
      }
    }

    const qp = new URLSearchParams({ conferenceDataVersion: '1' })
    const res = await fetch(
      `${CALENDAR_API}/calendars/${encodeURIComponent(d.calendarId)}/events?${qp.toString()}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(googleEvent),
      },
    )
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      return reply.code(res.status).send({ error: `Calendar API error: ${err}` })
    }

    const created = await res.json() as GoogleCalendarEvent
    const row = googleEventToRow(created, req.user.sub, req.user.org, d.calendarId)
    const extra = {
      contact_id: d.contact_id ?? null,
      company_id: d.company_id ?? null,
      deal_id: d.deal_id ?? null,
    }

    const [stored] = await db`
      INSERT INTO calendar_events ${db({ ...row, ...extra })}
      ON CONFLICT (user_id, organization_id, google_event_id)
      DO UPDATE SET
        title = EXCLUDED.title, updated_at = now(), synced_at = now()
      RETURNING *
    `
    return reply.code(201).send(stored)
  })

  // ─── Update event ───────────────────────────────────────────────────────────
  app.patch('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const { id } = req.params as { id: string }
    const body = z.object({
      title: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      startAt: z.string().optional(),
      endAt: z.string().optional(),
      contact_id: z.string().uuid().nullable().optional(),
      company_id: z.string().uuid().nullable().optional(),
      deal_id: z.string().uuid().nullable().optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const [existing] = await db`
      SELECT google_event_id, google_calendar_id, start_at, end_at, all_day
      FROM calendar_events
      WHERE id = ${id} AND user_id = ${req.user.sub} AND organization_id = ${req.user.org}
    `
    if (!existing) return reply.code(404).send({ error: 'Not found' })

    let accessToken: string
    try {
      accessToken = await getAccessToken(req.user.sub, req.user.org)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Token error'
      return reply.code(400).send({ error: msg })
    }

    const d = body.data
    const patch: Record<string, unknown> = {}
    if (d.title !== undefined) patch.summary = d.title
    if (d.description !== undefined) patch.description = d.description
    if (d.location !== undefined) patch.location = d.location
    if (d.startAt !== undefined) {
      patch.start = existing.allDay ? { date: d.startAt.split('T')[0] } : { dateTime: d.startAt, timeZone: 'UTC' }
    }
    if (d.endAt !== undefined) {
      patch.end = existing.allDay ? { date: d.endAt.split('T')[0] } : { dateTime: d.endAt, timeZone: 'UTC' }
    }

    const calId = existing.googleCalendarId as string
    const gEventId = existing.googleEventId as string
    const res = await fetch(
      `${CALENDAR_API}/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(gEventId)}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      },
    )
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      return reply.code(res.status).send({ error: `Calendar API error: ${err}` })
    }

    const [updated] = await db`
      UPDATE calendar_events SET
        title       = COALESCE(${d.title ?? null}, title),
        description = COALESCE(${d.description !== undefined ? d.description : null}, description),
        location    = COALESCE(${d.location !== undefined ? d.location : null}, location),
        start_at    = COALESCE(${d.startAt ?? null}, start_at),
        end_at      = COALESCE(${d.endAt ?? null}, end_at),
        contact_id  = COALESCE(${d.contact_id !== undefined ? d.contact_id : null}, contact_id),
        company_id  = COALESCE(${d.company_id !== undefined ? d.company_id : null}, company_id),
        deal_id     = COALESCE(${d.deal_id !== undefined ? d.deal_id : null}, deal_id),
        updated_at  = now(), synced_at = now()
      WHERE id = ${id} AND user_id = ${req.user.sub} AND organization_id = ${req.user.org}
      RETURNING *
    `
    return reply.send(updated)
  })

  // ─── Delete event ───────────────────────────────────────────────────────────
  app.delete('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const { id } = req.params as { id: string }

    const [existing] = await db`
      SELECT google_event_id, google_calendar_id
      FROM calendar_events
      WHERE id = ${id} AND user_id = ${req.user.sub} AND organization_id = ${req.user.org}
    `
    if (!existing) return reply.code(404).send({ error: 'Not found' })

    let accessToken: string
    try {
      accessToken = await getAccessToken(req.user.sub, req.user.org)
      const calId = existing.googleCalendarId as string
      const gEventId = existing.googleEventId as string
      await fetch(
        `${CALENDAR_API}/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(gEventId)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
      )
    } catch {
      // Still delete from local DB even if Google call fails
    }

    await db`DELETE FROM calendar_events WHERE id = ${id} AND user_id = ${req.user.sub} AND organization_id = ${req.user.org}`
    return reply.code(204).send()
  })

  // ─── Start Google Calendar push notifications (watch) ──────────────────────
  app.post('/watch', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    if (!env.GOOGLE_CALENDAR_WEBHOOK_URL) {
      return reply.code(503).send({ error: 'GOOGLE_CALENDAR_WEBHOOK_URL not configured' })
    }

    const body = z.object({ calendarId: z.string().default('primary') }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    let accessToken: string
    try {
      accessToken = await getAccessToken(req.user.sub, req.user.org)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Token error'
      return reply.code(400).send({ error: msg })
    }

    const channelId = randomUUID()
    const calId = body.data.calendarId
    const webhookUrl = `${env.GOOGLE_CALENDAR_WEBHOOK_URL}/calendar/webhook`

    // Stop existing channel first
    const [existing] = await db`
      SELECT channel_id, resource_id FROM calendar_watch_channels
      WHERE user_id = ${req.user.sub} AND organization_id = ${req.user.org} AND calendar_id = ${calId}
    `
    if (existing?.channelId && existing?.resourceId) {
      await fetch(`${CALENDAR_API}/channels/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing.channelId, resourceId: existing.resourceId }),
      }).catch(() => null)
    }

    const res = await fetch(
      `${CALENDAR_API}/calendars/${encodeURIComponent(calId)}/events/watch`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          // TTL: 7 days (Google max is ~28 days; we re-register before expiry)
          expiration: String(Date.now() + 7 * 24 * 3600 * 1000),
        }),
      },
    )
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      return reply.code(res.status).send({ error: `Watch setup failed: ${err}` })
    }

    const watchData = await res.json() as { resourceId?: string; expiration?: string }

    await db`
      INSERT INTO calendar_watch_channels
        (user_id, organization_id, channel_id, resource_id, calendar_id, expiration)
      VALUES
        (${req.user.sub}, ${req.user.org}, ${channelId},
         ${watchData.resourceId ?? null}, ${calId},
         ${watchData.expiration ? new Date(Number(watchData.expiration)).toISOString() : null})
      ON CONFLICT (user_id, organization_id, calendar_id)
      DO UPDATE SET
        channel_id  = EXCLUDED.channel_id,
        resource_id = EXCLUDED.resource_id,
        expiration  = EXCLUDED.expiration,
        created_at  = now()
    `

    return reply.send({ ok: true, channelId, expiresAt: watchData.expiration })
  })

  // ─── Stop watching (unsubscribe push notifications) ────────────────────────
  app.delete('/watch', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const q = z.object({ calendarId: z.string().default('primary') }).safeParse(req.query)
    if (!q.success) return reply.code(400).send({ error: 'Invalid request' })

    const [channel] = await db`
      SELECT channel_id, resource_id FROM calendar_watch_channels
      WHERE user_id = ${req.user.sub} AND organization_id = ${req.user.org} AND calendar_id = ${q.data.calendarId}
    `
    if (!channel) return reply.code(404).send({ error: 'No watch channel found' })

    try {
      const accessToken = await getAccessToken(req.user.sub, req.user.org)
      await fetch(`${CALENDAR_API}/channels/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: channel.channelId, resourceId: channel.resourceId }),
      })
    } catch {
      // continue — delete from DB regardless
    }

    await db`
      DELETE FROM calendar_watch_channels
      WHERE user_id = ${req.user.sub} AND organization_id = ${req.user.org} AND calendar_id = ${q.data.calendarId}
    `
    return reply.send({ ok: true })
  })

  // ─── Google Calendar webhook receiver (PUBLIC — no auth) ───────────────────
  // Google posts here when any calendar event changes. We look up the user
  // by channel_id (sent in X-Goog-Channel-ID header) and trigger a sync.
  app.post('/webhook', async (req, reply) => {
    const channelId = req.headers['x-goog-channel-id'] as string | undefined
    const state = req.headers['x-goog-resource-state'] as string | undefined

    // Immediately ack Google (must respond quickly or Google retries)
    reply.code(200).send()

    if (!channelId || state === 'sync') return

    const [channel] = await db`
      SELECT user_id, organization_id, calendar_id
      FROM calendar_watch_channels
      WHERE channel_id = ${channelId}
      LIMIT 1
    `
    if (!channel) return

    // Re-sync in the background
    setImmediate(async () => {
      try {
        const accessToken = await getAccessToken(
          channel.userId as string,
          channel.organizationId as string,
        )
        const calId = channel.calendarId as string
        const timeMin = new Date(Date.now() - 7 * 86400_000).toISOString()
        const timeMax = new Date(Date.now() + 90 * 86400_000).toISOString()
        const params = new URLSearchParams({
          timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '500',
        })
        const res = await fetch(
          `${CALENDAR_API}/calendars/${encodeURIComponent(calId)}/events?${params.toString()}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        if (!res.ok) return

        const data = await res.json() as GoogleCalendarEventList
        for (const event of data.items ?? []) {
          if (event.status === 'cancelled') {
            await db`
              DELETE FROM calendar_events
              WHERE google_event_id = ${event.id}
                AND user_id = ${channel.userId}
                AND organization_id = ${channel.organizationId}
            `
            continue
          }
          const row = googleEventToRow(
            event, channel.userId as string, channel.organizationId as string, calId,
          )
          await db`
            INSERT INTO calendar_events ${db(row)}
            ON CONFLICT (user_id, organization_id, google_event_id)
            DO UPDATE SET
              title = EXCLUDED.title, description = EXCLUDED.description,
              location = EXCLUDED.location, start_at = EXCLUDED.start_at,
              end_at = EXCLUDED.end_at, all_day = EXCLUDED.all_day,
              status = EXCLUDED.status, html_link = EXCLUDED.html_link,
              meet_link = EXCLUDED.meet_link, attendees = EXCLUDED.attendees,
              synced_at = now(), updated_at = now()
          `
        }
      } catch {
        // Swallow — background sync failures must not affect response already sent
      }
    })
  })

  // ─── List calendars available to the user ──────────────────────────────────
  app.get('/list', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })

    let accessToken: string
    try {
      accessToken = await getAccessToken(req.user.sub, req.user.org)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Token error'
      return reply.code(400).send({ error: msg })
    }

    const res = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      return reply.code(res.status).send({ error: `Calendar API error: ${err}` })
    }

    const data = await res.json() as { items?: { id: string; summary: string; primary?: boolean; backgroundColor?: string }[] }
    return reply.send({ data: data.items ?? [] })
  })
}
