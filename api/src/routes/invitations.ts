import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { sendEmail } from '../services/email.js'
import { setAuthCookie } from '../services/cookieAuth.js'

function jwtExpirySeconds(expiresIn: string): number {
  const m = /^(\d+)([smhd])$/.exec(expiresIn)
  if (!m) return 7 * 24 * 3600
  const n = parseInt(m[1]!, 10)
  const unit = m[2]!
  return unit === 's' ? n : unit === 'm' ? n * 60 : unit === 'h' ? n * 3600 : n * 86400
}

const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'sales_rep', 'viewer']).default('sales_rep'),
})

export async function invitationsRoutes(app: FastifyInstance) {
  // POST /invitations — requires auth + org + admin/manager role
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const { role: requesterRole } = req.user
    if (requesterRole !== 'admin' && requesterRole !== 'owner' && requesterRole !== 'manager') {
      return reply.code(403).send({ error: 'Insufficient permissions' })
    }

    const body = createInvitationSchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })

    const { email, role } = body.data

    // Check user is not already a member
    const existing = await db`
      SELECT id FROM users WHERE email = ${email} AND organization_id = ${req.user.org} AND is_active = true LIMIT 1
    `
    if (existing.length > 0) return reply.code(409).send({ error: 'User is already a member of this organization' })

    // Upsert invitation (re-send resets the token + expiry)
    const rows = await db`
      INSERT INTO invitations (organization_id, email, role, invited_by)
      VALUES (${req.user.org}, ${email}, ${role}, ${req.user.sub})
      ON CONFLICT (email, organization_id)
      DO UPDATE SET
        role = EXCLUDED.role,
        invited_by = EXCLUDED.invited_by,
        token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
        status = 'pending',
        expires_at = now() + INTERVAL '7 days'
      RETURNING id, token, email, role, expires_at
    `

    const inv = rows[0]!

    const acceptLink = `${env.APP_URL}/accept-invite?token=${inv.token}`
    await sendEmail({
      to: inv.email as string,
      subject: 'You have been invited to join n0CRM',
      html: `<p>You've been invited to join as <strong>${inv.role}</strong>. Accept your invitation:</p><p><a href="${acceptLink}">${acceptLink}</a></p><p>This link expires in 7 days.</p>`,
      text: `Accept your n0CRM invitation: ${acceptLink}`,
    })

    return reply.code(201).send({
      id: inv.id,
      token: inv.token,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expiresAt,
    })
  })

  // GET /invitations — list org's invitations (auth required)
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })

    const rows = await db`
      SELECT i.id, i.email, i.role, i.status, i.expires_at, i.created_at,
             u.name as invited_by_name
      FROM invitations i
      LEFT JOIN users u ON u.id = i.invited_by
      WHERE i.organization_id = ${req.user.org}
      ORDER BY i.created_at DESC
    `

    return reply.send({ data: rows })
  })

  // DELETE /invitations/:id — cancel invitation (auth required)
  app.delete<{ Params: { id: string } }>('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })

    const result = await db`
      DELETE FROM invitations
      WHERE id = ${req.params.id} AND organization_id = ${req.user.org}
      RETURNING id
    `
    if (result.length === 0) return reply.code(404).send({ error: 'Invitation not found' })
    return reply.send({ ok: true })
  })

  // GET /invitations/:token — public; fetch invitation details for the accept page
  app.get<{ Params: { token: string } }>('/:token', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
    const rows = await db`
      SELECT i.id, i.email, i.role, i.status, i.expires_at,
             o.name as org_name, o.id as org_id
      FROM invitations i
      JOIN organizations o ON o.id = i.organization_id
      WHERE i.token = ${req.params.token}
      LIMIT 1
    `
    if (rows.length === 0) return reply.code(404).send({ error: 'Invitation not found' })

    const inv = rows[0]!
    if (inv.status !== 'pending') {
      return reply.code(409).send({ error: inv.status === 'accepted' ? 'Invitation already accepted' : 'Invitation expired or cancelled' })
    }
    if (new Date(inv.expiresAt as string) < new Date()) {
      return reply.code(410).send({ error: 'Invitation has expired' })
    }

    return reply.send({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      orgName: inv.orgName,
      orgId: inv.orgId,
      expiresAt: inv.expiresAt,
    })
  })

  // POST /invitations/:token/accept — requires auth; user accepts invitation
  app.post<{ Params: { token: string } }>('/:token/accept', { onRequest: [app.authenticate] }, async (req, reply) => {
    const rows = await db`
      SELECT i.id, i.email, i.role, i.status, i.expires_at, i.organization_id
      FROM invitations i
      WHERE i.token = ${req.params.token}
      LIMIT 1
    `
    if (rows.length === 0) return reply.code(404).send({ error: 'Invitation not found' })

    const inv = rows[0]!
    if (inv.status !== 'pending') {
      return reply.code(409).send({ error: 'Invitation already used or cancelled' })
    }
    if (new Date(inv.expiresAt as string) < new Date()) {
      return reply.code(410).send({ error: 'Invitation has expired' })
    }

    // Verify logged-in user email matches invitation
    const userRows = await db`SELECT id, email, organization_id FROM users WHERE id = ${req.user.sub} LIMIT 1`
    if (userRows.length === 0) return reply.code(401).send({ error: 'Unauthorized' })

    const user = userRows[0]!
    if ((user.email as string).toLowerCase() !== (inv.email as string).toLowerCase()) {
      return reply.code(403).send({ error: 'This invitation is for a different email address' })
    }

    // Prevent reassigning users who already belong to a different org
    if (user.organizationId !== null && user.organizationId !== inv.organizationId) {
      return reply.code(409).send({ error: 'You already belong to an organization' })
    }

    // Assign user to org
    await db`
      UPDATE users
      SET organization_id = ${inv.organizationId}, role = ${inv.role}, updated_at = now()
      WHERE id = ${req.user.sub}
    `

    // Mark invitation accepted
    await db`UPDATE invitations SET status = 'accepted' WHERE id = ${inv.id}`

    // Issue new JWT with org claim — set as HttpOnly cookie
    const ttl = jwtExpirySeconds(env.JWT_EXPIRES_IN)
    const token = app.jwt.sign(
      { sub: req.user.sub, org: inv.organizationId, role: inv.role, jti: randomBytes(16).toString('hex') },
      { expiresIn: env.JWT_EXPIRES_IN },
    )
    setAuthCookie(reply, token, ttl)

    return reply.send({ organizationId: inv.organizationId, role: inv.role, expiresAt: Date.now() + ttl * 1000 })
  })
}
