/**
 * Booking-page management (/booking-pages) — authed; each member owns their own
 * pages (personal Calendly-style links). The public booking flow is in publicBooking.ts.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomBytes, createHash } from 'node:crypto'
import { db } from '../db/client.js'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'meeting'

const availabilitySchema = z.array(
  z.object({ dow: z.number().int().min(0).max(6), start: z.string().regex(/^\d{1,2}:\d{2}$/), end: z.string().regex(/^\d{1,2}:\d{2}$/) }),
).max(50)

const patchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  timezone: z.string().max(64).optional(),
  availability: availabilitySchema.optional(),
  minNoticeMinutes: z.number().int().min(0).max(43200).optional(),
  maxDaysAhead: z.number().int().min(1).max(365).optional(),
  createLead: z.boolean().optional(),
  enabled: z.boolean().optional(),
})

const LIST_COLS = db`id, slug, token_prefix, title, description, duration_minutes, timezone, availability, min_notice_minutes, max_days_ahead, create_lead, enabled, booking_count, created_at`

export async function bookingPagesRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] }

  app.get('/', auth, async (req, reply) => {
    const rows = await db`SELECT ${LIST_COLS} FROM booking_pages WHERE organization_id = ${req.user.org} AND user_id = ${req.user.sub} ORDER BY created_at DESC`
    return reply.send({ data: rows })
  })

  app.post('/', auth, async (req, reply) => {
    const orgId = req.user.org
    if (!orgId) return reply.code(403).send({ error: 'No organization' })
    const body = z.object({ title: z.string().min(1).max(200).optional() }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const title = body.data.title?.trim() || 'Book a meeting'
    const raw = `bkg_${randomBytes(24).toString('base64url')}`
    const slug = `${slugify(title)}-${randomBytes(3).toString('hex')}`
    const now = new Date().toISOString()
    const [row] = await db`
      INSERT INTO booking_pages (organization_id, user_id, slug, token_hash, token_prefix, title, created_at, updated_at)
      VALUES (${orgId}, ${req.user.sub}, ${slug}, ${sha256(raw)}, ${raw.slice(0, 12)}, ${title}, ${now}, ${now})
      RETURNING id, slug, token_prefix, title, duration_minutes, enabled, booking_count, created_at
    `
    return reply.code(201).send({ page: row, token: raw })
  })

  app.patch('/:id', auth, async (req, reply) => {
    const orgId = req.user.org
    const { id } = req.params as { id: string }
    const body = patchBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const d = body.data
    const now = new Date().toISOString()
    const [row] = await db`
      UPDATE booking_pages SET
        title = COALESCE(${d.title ?? null}, title),
        description = COALESCE(${d.description ?? null}, description),
        duration_minutes = COALESCE(${d.durationMinutes ?? null}, duration_minutes),
        timezone = COALESCE(${d.timezone ?? null}, timezone),
        availability = COALESCE(${d.availability ? db.json(d.availability as never) : null}, availability),
        min_notice_minutes = COALESCE(${d.minNoticeMinutes ?? null}, min_notice_minutes),
        max_days_ahead = COALESCE(${d.maxDaysAhead ?? null}, max_days_ahead),
        create_lead = COALESCE(${d.createLead ?? null}, create_lead),
        enabled = COALESCE(${d.enabled ?? null}, enabled),
        updated_at = ${now}
      WHERE id = ${id} AND organization_id = ${orgId} AND user_id = ${req.user.sub}
      RETURNING ${LIST_COLS}
    `
    if (!row) return reply.code(404).send({ error: 'Not found' })
    return reply.send(row)
  })

  app.delete('/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    await db`DELETE FROM booking_pages WHERE id = ${id} AND organization_id = ${req.user.org} AND user_id = ${req.user.sub}`
    return reply.code(204).send()
  })

  app.get('/:id/bookings', auth, async (req, reply) => {
    const { id } = req.params as { id: string }
    const rows = await db`
      SELECT b.* FROM bookings b JOIN booking_pages p ON p.id = b.booking_page_id
      WHERE b.booking_page_id = ${id} AND p.organization_id = ${req.user.org} AND p.user_id = ${req.user.sub}
      ORDER BY b.start_at DESC LIMIT 500
    `
    return reply.send({ data: rows })
  })
}
