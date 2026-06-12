/**
 * Public meeting booking (/public/booking) — no JWT/API-key (token-in-path).
 * Its own plugin so publicApi's x-api-key hook never applies. Honeypot + rate limit.
 * A confirmed booking creates a local calendar_events row + a 'meeting' activity
 * (+ optional lead). Live Google Calendar push is a follow-up.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomBytes, createHash } from 'node:crypto'
import { db } from '../db/client.js'
import { computeDaySlots, type AvailabilityRule } from '../services/bookingSlots.js'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

interface BookingPageRow {
  id: string
  organizationId: string
  userId: string
  title: string
  description: string
  durationMinutes: number
  availability: AvailabilityRule[]
  minNoticeMinutes: number
  maxDaysAhead: number
  createLead: boolean
}

async function takenSlots(pageId: string, dateStr: string): Promise<string[]> {
  const rows = await db`
    SELECT start_at FROM bookings
    WHERE booking_page_id = ${pageId} AND status = 'confirmed'
      AND start_at >= ${`${dateStr}T00:00:00.000Z`} AND start_at <= ${`${dateStr}T23:59:59.999Z`}
  `
  return rows.map((r) => new Date(r['startAt'] as string).toISOString())
}

export async function publicBookingRoutes(app: FastifyInstance) {
  // Public page config (safe fields only).
  app.get('/:token', async (req, reply) => {
    const { token } = req.params as { token: string }
    const [p] = await db`
      SELECT title, description, duration_minutes, timezone, max_days_ahead
      FROM booking_pages WHERE token_hash = ${sha256(token)} AND enabled = true LIMIT 1
    `
    if (!p) return reply.code(404).send({ error: 'Not found' })
    return reply.header('Cache-Control', 'no-store').send({
      title: p['title'],
      description: p['description'],
      durationMinutes: p['durationMinutes'],
      timezone: p['timezone'],
      maxDaysAhead: p['maxDaysAhead'],
    })
  })

  // Open slots for a date.
  app.get('/:token/slots', async (req, reply) => {
    const { token } = req.params as { token: string }
    const q = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(req.query)
    if (!q.success) return reply.code(400).send({ error: 'date (YYYY-MM-DD) required' })
    const [p] = await db`
      SELECT id, availability, duration_minutes, min_notice_minutes, max_days_ahead
      FROM booking_pages WHERE token_hash = ${sha256(token)} AND enabled = true LIMIT 1
    `
    if (!p) return reply.code(404).send({ error: 'Not found' })
    const slots = computeDaySlots({
      date: q.data.date,
      availability: (p['availability'] as AvailabilityRule[]) ?? [],
      durationMinutes: p['durationMinutes'] as number,
      taken: await takenSlots(p['id'] as string, q.data.date),
      nowMs: Date.now(),
      minNoticeMinutes: p['minNoticeMinutes'] as number,
      maxDaysAhead: p['maxDaysAhead'] as number,
    })
    return reply.send({ slots, durationMinutes: p['durationMinutes'] })
  })

  // Book a slot.
  app.post('/:token', { config: { rateLimit: { max: 8, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { token } = req.params as { token: string }
    const hp = (req.body as Record<string, unknown> | undefined)?.['_hp']
    if (typeof hp === 'string' && hp.trim().length > 0) return reply.code(200).send({ ok: true }) // honeypot

    const body = z
      .object({ startAt: z.string(), name: z.string().max(200).optional(), email: z.string().email().max(254), notes: z.string().max(2000).optional() })
      .safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    const [pr] = await db`SELECT * FROM booking_pages WHERE token_hash = ${sha256(token)} AND enabled = true LIMIT 1`
    if (!pr) return reply.code(404).send({ error: 'Not found' })
    const p = pr as unknown as BookingPageRow
    const d = body.data

    const startMs = Date.parse(d.startAt)
    if (!Number.isFinite(startMs)) return reply.code(400).send({ error: 'Invalid start' })
    const startIso = new Date(startMs).toISOString()
    const dateStr = startIso.slice(0, 10)

    // Re-validate the slot is genuinely open right now.
    const open = computeDaySlots({
      date: dateStr,
      availability: p.availability ?? [],
      durationMinutes: p.durationMinutes,
      taken: await takenSlots(p.id, dateStr),
      nowMs: Date.now(),
      minNoticeMinutes: p.minNoticeMinutes,
      maxDaysAhead: p.maxDaysAhead,
    })
    if (!open.includes(startIso)) return reply.code(409).send({ error: 'Slot no longer available' })

    const endIso = new Date(startMs + p.durationMinutes * 60_000).toISOString()
    const orgId = p.organizationId
    const now = new Date().toISOString()

    let contactId: string | null = null
    if (p.createLead) {
      const [c] = await db`
        INSERT INTO contacts (first_name, last_name, email, type, source, organization_id, created_at, updated_at)
        VALUES (${d.name ?? ''}, '', ${d.email}, 'lead', 'booking', ${orgId}, ${now}, ${now})
        ON CONFLICT (email, organization_id) DO UPDATE SET updated_at = ${now}
        RETURNING id
      `
      contactId = (c?.['id'] as string) ?? null
    }

    const [ev] = await db`
      INSERT INTO calendar_events (organization_id, user_id, google_event_id, title, description, start_at, end_at, status, contact_id, organizer_email)
      VALUES (${orgId}, ${p.userId}, ${'booking_' + randomBytes(8).toString('hex')}, ${p.title}, ${d.notes ?? ''}, ${startIso}, ${endIso}, 'confirmed', ${contactId}, ${d.email})
      RETURNING id
    `
    const [act] = await db`
      INSERT INTO activities (organization_id, type, subject, description, status, due_date, contact_id, created_by, created_at, updated_at)
      VALUES (${orgId}, 'meeting', ${`Booking: ${d.name ?? d.email}`}, ${d.notes ?? ''}, 'pending', ${startIso}, ${contactId}, 'booking', ${now}, ${now})
      RETURNING id
    `

    const cancelToken = randomBytes(24).toString('base64url')
    try {
      await db`
        INSERT INTO bookings (booking_page_id, organization_id, start_at, end_at, invitee_name, invitee_email, invitee_notes, status, calendar_event_id, contact_id, activity_id, cancel_token)
        VALUES (${p.id}, ${orgId}, ${startIso}, ${endIso}, ${d.name ?? ''}, ${d.email}, ${d.notes ?? null}, 'confirmed', ${(ev?.['id'] as string) ?? null}, ${contactId}, ${(act?.['id'] as string) ?? null}, ${cancelToken})
      `
    } catch {
      return reply.code(409).send({ error: 'Slot no longer available' }) // unique-slot guard tripped
    }
    await db`UPDATE booking_pages SET booking_count = booking_count + 1, updated_at = ${now} WHERE id = ${p.id}`
    return reply.code(201).send({ ok: true, cancelToken, startAt: startIso, endAt: endIso })
  })

  // Invitee self-cancel (no auth — random cancel token).
  app.post('/cancel/:cancelToken', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { cancelToken } = req.params as { cancelToken: string }
    const now = new Date().toISOString()
    const [b] = await db`SELECT id, calendar_event_id FROM bookings WHERE cancel_token = ${cancelToken} AND status = 'confirmed' LIMIT 1`
    if (!b) return reply.code(404).send({ error: 'Not found' })
    await db`UPDATE bookings SET status = 'cancelled' WHERE id = ${b['id'] as string}`
    if (b['calendarEventId']) await db`UPDATE calendar_events SET status = 'cancelled', updated_at = ${now} WHERE id = ${b['calendarEventId'] as string}`
    return reply.send({ ok: true })
  })
}
