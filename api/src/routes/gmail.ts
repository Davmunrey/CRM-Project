import { randomBytes } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { encryptToken, decryptToken } from '../services/tokenCipher.js'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'openid',
  'email',
  'profile',
]

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

const CONTACTS_SCOPES = [
  'https://www.googleapis.com/auth/contacts.readonly',
]

function scopesForBundle(bundle: string): string[] {
  if (bundle === 'calendar') return [...GMAIL_SCOPES, ...CALENDAR_SCOPES]
  if (bundle === 'contacts') return [...GMAIL_SCOPES, ...CALENDAR_SCOPES, ...CONTACTS_SCOPES]
  return GMAIL_SCOPES
}

function decodeIdToken(idToken: string): Record<string, unknown> {
  try {
    const payload = idToken.split('.')[1]
    if (!payload) return {}
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as Record<string, unknown>
  } catch {
    return {}
  }
}

async function googleTokenRequest(params: Record<string, string>): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
  id_token?: string
  scope?: string
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Google token error ${res.status}: ${err}`)
  }
  return res.json() as Promise<{
    access_token: string
    refresh_token?: string
    expires_in: number
    id_token?: string
    scope?: string
  }>
}

export async function gmailRoutes(app: FastifyInstance) {
  // GET /gmail/oauth-configured — public check: tells frontend if OAuth is set up
  app.get('/oauth-configured', async (_req, reply) => {
    return reply.send({
      configured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      redirectUri: env.GOOGLE_REDIRECT_URI ?? null,
    })
  })

  // POST /gmail/oauth-start — generate Google OAuth authorization URL
  app.post('/oauth-start', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!env.GOOGLE_CLIENT_ID) {
      return reply.code(503).send({ error: 'Google OAuth not configured' })
    }
    const body = z.object({
      redirect_uri: z.string().url(),
      code_challenge: z.string().optional(),
      state: z.string().optional(),
      bundle: z.enum(['primary', 'calendar', 'contacts']).default('primary'),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    // Always generate a state nonce if client didn't provide one
    const state = body.data.state ?? randomBytes(16).toString('hex')
    const scopes = scopesForBundle(body.data.bundle)

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: body.data.redirect_uri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    })
    if (body.data.code_challenge) {
      params.set('code_challenge', body.data.code_challenge)
      params.set('code_challenge_method', 'S256')
    }

    return reply.send({ url: `${GOOGLE_AUTH_URL}?${params.toString()}` })
  })

  // POST /gmail/oauth-exchange — exchange auth code for tokens, store in DB
  app.post('/oauth-exchange', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return reply.code(503).send({ error: 'Google OAuth not configured' })
    }
    const body = z.object({
      code: z.string(),
      redirect_uri: z.string().url(),
      code_verifier: z.string().optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'code and redirect_uri are required' })
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })

    const params: Record<string, string> = {
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: body.data.redirect_uri,
      grant_type: 'authorization_code',
      code: body.data.code,
    }
    if (body.data.code_verifier) params.code_verifier = body.data.code_verifier

    const tokens = await googleTokenRequest(params).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Token exchange failed'
      return reply.code(400).send({ error: msg })
    })
    if (!tokens || typeof tokens !== 'object' || !('access_token' in tokens)) return

    const idPayload = tokens.id_token ? decodeIdToken(tokens.id_token) : {}
    const emailAddress = (idPayload.email as string | undefined) ?? ''
    const googleSub = (idPayload.sub as string | undefined) ?? null
    const name = (idPayload.name as string | undefined) ?? null
    const avatarUrl = (idPayload.picture as string | undefined) ?? null

    const plainRefresh = tokens.refresh_token
    const encryptedRefresh = plainRefresh ? encryptToken(plainRefresh) : null
    const storedRefresh = encryptedRefresh ?? plainRefresh ?? null
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await db`
      INSERT INTO gmail_tokens (
        user_id, organization_id, email_address, refresh_token, refresh_token_cipher,
        access_token, token_expiry, scopes, google_sub, name, avatar_url, is_active, updated_at
      ) VALUES (
        ${req.user.sub}, ${req.user.org}, ${emailAddress},
        ${encryptedRefresh ? null : storedRefresh},
        ${encryptedRefresh},
        ${tokens.access_token}, ${tokenExpiry},
        ${tokens.scope ?? GMAIL_SCOPES.join(' ')},
        ${googleSub}, ${name}, ${avatarUrl}, true, now()
      )
      ON CONFLICT (user_id, organization_id)
      DO UPDATE SET
        email_address       = EXCLUDED.email_address,
        refresh_token       = EXCLUDED.refresh_token,
        refresh_token_cipher = EXCLUDED.refresh_token_cipher,
        access_token        = EXCLUDED.access_token,
        token_expiry        = EXCLUDED.token_expiry,
        scopes              = EXCLUDED.scopes,
        google_sub          = EXCLUDED.google_sub,
        name                = EXCLUDED.name,
        avatar_url          = EXCLUDED.avatar_url,
        is_active           = true,
        updated_at          = now()
    `

    return reply.send({
      ok: true,
      email_address: emailAddress,
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
    })
  })

  // GET /gmail/refresh-token — get a fresh access token using stored refresh token
  app.get('/refresh-token', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return reply.code(503).send({ error: 'Google OAuth not configured' })
    }
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })

    const rows = await db`
      SELECT refresh_token, refresh_token_cipher
      FROM gmail_tokens
      WHERE user_id = ${req.user.sub}
        AND organization_id = ${req.user.org}
        AND is_active = true
      LIMIT 1
    `
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'Gmail not connected' })
    }

    const row = rows[0]!
    let refreshToken: string
    try {
      refreshToken = row.refreshTokenCipher
        ? decryptToken(row.refreshTokenCipher as string)
        : (row.refreshToken as string)
    } catch {
      return reply.code(500).send({ error: 'Failed to decrypt refresh token' })
    }

    const tokens = await googleTokenRequest({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Token refresh failed'
      return reply.code(400).send({ error: msg })
    })
    if (!tokens || typeof tokens !== 'object' || !('access_token' in tokens)) return

    return reply.send({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
    })
  })

  // POST /gmail/disconnect — revoke and delete stored gmail token
  app.post('/disconnect', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })

    const rows = await db`
      SELECT refresh_token, refresh_token_cipher, access_token
      FROM gmail_tokens
      WHERE user_id = ${req.user.sub}
        AND organization_id = ${req.user.org}
      LIMIT 1
    `

    if (rows.length > 0) {
      const row = rows[0]!
      const tokenToRevoke = row.accessToken ?? null
      if (tokenToRevoke) {
        await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(tokenToRevoke as string)}`, {
          method: 'POST',
        }).catch(() => null)
      }

      await db`
        DELETE FROM gmail_tokens
        WHERE user_id = ${req.user.sub} AND organization_id = ${req.user.org}
      `
    }

    return reply.send({ ok: true })
  })

  // GET /gmail/integration-status — connection status + account info
  app.get('/integration-status', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) {
      return reply.send({ connected: false, gmailConnected: false, calendarConnected: false, account: null })
    }

    const rows = await db`
      SELECT email_address, scopes, name, avatar_url, is_active, created_at, updated_at
      FROM gmail_tokens
      WHERE user_id = ${req.user.sub}
        AND organization_id = ${req.user.org}
        AND is_active = true
      LIMIT 1
    `

    if (rows.length === 0) {
      return reply.send({ connected: false, gmailConnected: false, calendarConnected: false, account: null })
    }

    const row = rows[0]!
    const scopes = typeof row.scopes === 'string' ? row.scopes.split(' ').filter(Boolean) : []
    const gmailConnected = scopes.some((s: string) => s.includes('gmail'))
    const calendarConnected = scopes.some((s: string) => s.includes('calendar'))
    const contactsConnected = scopes.some((s: string) => s.includes('contacts'))

    return reply.send({
      connected: gmailConnected,
      gmailConnected,
      calendarConnected,
      contactsConnected,
      account: {
        email: row.emailAddress,
        name: row.name ?? null,
        avatarUrl: row.avatarUrl ?? null,
        scopes,
        lastSyncedAt: (row.updatedAt as Date | null)?.toISOString() ?? null,
        createdAt: (row.createdAt as Date).toISOString(),
      },
    })
  })

  // GET /gmail/thread-links — list thread links for current user+org
  app.get('/thread-links', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.send([])
    const rows = await db`
      SELECT id, thread_id, contact_id, company_id, deal_id, source, created_at, updated_at
      FROM gmail_thread_links
      WHERE user_id = ${req.user.sub} AND organization_id = ${req.user.org}
      ORDER BY created_at DESC
    `
    return reply.send(rows)
  })

  // POST /gmail/thread-links — upsert a thread link
  app.post('/thread-links', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const body = z.object({
      thread_id: z.string(),
      contact_id: z.string().uuid().nullable().optional(),
      company_id: z.string().uuid().nullable().optional(),
      deal_id: z.string().uuid().nullable().optional(),
      source: z.enum(['auto', 'manual']).default('manual'),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    // Verify referenced entities belong to this org
    const orgId = req.user.org
    if (body.data.contact_id) {
      const own = await db`SELECT 1 FROM contacts WHERE id = ${body.data.contact_id} AND organization_id = ${orgId} LIMIT 1`
      if (own.length === 0) return reply.code(404).send({ error: 'Contact not found' })
    }
    if (body.data.company_id) {
      const own = await db`SELECT 1 FROM companies WHERE id = ${body.data.company_id} AND organization_id = ${orgId} LIMIT 1`
      if (own.length === 0) return reply.code(404).send({ error: 'Company not found' })
    }
    if (body.data.deal_id) {
      const own = await db`SELECT 1 FROM deals WHERE id = ${body.data.deal_id} AND organization_id = ${orgId} LIMIT 1`
      if (own.length === 0) return reply.code(404).send({ error: 'Deal not found' })
    }

    const rows = await db`
      INSERT INTO gmail_thread_links (
        thread_id, user_id, organization_id, contact_id, company_id, deal_id, source
      ) VALUES (
        ${body.data.thread_id}, ${req.user.sub}, ${req.user.org},
        ${body.data.contact_id ?? null}, ${body.data.company_id ?? null},
        ${body.data.deal_id ?? null}, ${body.data.source}
      )
      ON CONFLICT (thread_id, user_id, organization_id)
      DO UPDATE SET
        contact_id = EXCLUDED.contact_id,
        company_id = EXCLUDED.company_id,
        deal_id    = EXCLUDED.deal_id,
        source     = EXCLUDED.source,
        updated_at = now()
      RETURNING id, thread_id, contact_id, company_id, deal_id, source, created_at
    `
    return reply.code(201).send(rows[0])
  })

  // DELETE /gmail/thread-links/:threadId — remove a thread link
  app.delete('/thread-links/:threadId', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const { threadId } = req.params as { threadId: string }
    await db`
      DELETE FROM gmail_thread_links
      WHERE thread_id = ${threadId}
        AND user_id = ${req.user.sub}
        AND organization_id = ${req.user.org}
    `
    return reply.code(204).send()
  })

  // GET /gmail/thread-workspace — list all workspace entries for current user+org
  app.get('/thread-workspace', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.send([])
    const rows = await db`
      SELECT thread_id, owner_user_id, internal_note, updated_at
      FROM gmail_thread_workspace
      WHERE user_id = ${req.user.sub} AND organization_id = ${req.user.org}
      ORDER BY updated_at DESC
    `
    return reply.send(rows)
  })

  // PUT /gmail/thread-workspace/:threadId — upsert owner + note for a thread
  app.put('/thread-workspace/:threadId', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const { threadId } = req.params as { threadId: string }
    const body = z.object({
      ownerUserId: z.string().uuid().nullable().optional(),
      internalNote: z.string().max(2000).nullable().optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })

    // Verify ownerUserId belongs to this org if provided
    if (body.data.ownerUserId) {
      const own = await db`SELECT 1 FROM users WHERE id = ${body.data.ownerUserId} AND organization_id = ${req.user.org} LIMIT 1`
      if (own.length === 0) return reply.code(404).send({ error: 'User not found' })
    }

    const rows = await db`
      INSERT INTO gmail_thread_workspace (thread_id, user_id, organization_id, owner_user_id, internal_note)
      VALUES (
        ${threadId}, ${req.user.sub}, ${req.user.org},
        ${body.data.ownerUserId ?? null}, ${body.data.internalNote ?? null}
      )
      ON CONFLICT (thread_id, user_id, organization_id)
      DO UPDATE SET
        owner_user_id = COALESCE(EXCLUDED.owner_user_id, gmail_thread_workspace.owner_user_id),
        internal_note = COALESCE(EXCLUDED.internal_note, gmail_thread_workspace.internal_note),
        updated_at    = now()
      RETURNING thread_id, owner_user_id, internal_note, updated_at
    `
    return reply.send(rows[0])
  })

  // DELETE /gmail/thread-workspace/:threadId — remove workspace entry
  app.delete('/thread-workspace/:threadId', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    const { threadId } = req.params as { threadId: string }
    await db`
      DELETE FROM gmail_thread_workspace
      WHERE thread_id = ${threadId}
        AND user_id = ${req.user.sub}
        AND organization_id = ${req.user.org}
    `
    return reply.code(204).send()
  })

  // POST /gmail/sync-contacts — import Google Contacts into CRM contacts table
  app.post('/sync-contacts', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user.org) return reply.code(403).send({ error: 'No organization' })
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return reply.code(503).send({ error: 'Google OAuth not configured' })
    }

    // Fetch stored refresh token
    const rows = await db`
      SELECT refresh_token, refresh_token_cipher, scopes
      FROM gmail_tokens
      WHERE user_id = ${req.user.sub}
        AND organization_id = ${req.user.org}
        AND is_active = true
      LIMIT 1
    `
    if (rows.length === 0) return reply.code(404).send({ error: 'Google account not connected' })

    const row = rows[0]!
    const scopes = typeof row.scopes === 'string' ? row.scopes : ''
    if (!scopes.includes('contacts')) {
      return reply.code(403).send({
        error: 'contacts_scope_required',
        message: 'Re-connect with Contacts permission to sync Google Contacts',
      })
    }

    let refreshToken: string
    try {
      refreshToken = row.refreshTokenCipher
        ? decryptToken(row.refreshTokenCipher as string)
        : (row.refreshToken as string)
    } catch {
      return reply.code(500).send({ error: 'Failed to decrypt token' })
    }

    // Get fresh access token
    const tokens = await googleTokenRequest({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).catch(() => null)
    if (!tokens?.access_token) return reply.code(502).send({ error: 'Failed to refresh access token' })

    // Fetch contacts from Google People API (up to 1000)
    const peopleRes = await fetch(
      'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations&pageSize=1000',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    )
    if (!peopleRes.ok) {
      return reply.code(502).send({ error: 'Google People API error', status: peopleRes.status })
    }

    interface GooglePerson {
      names?: Array<{ displayName?: string; givenName?: string; familyName?: string }>
      emailAddresses?: Array<{ value?: string }>
      phoneNumbers?: Array<{ value?: string }>
      organizations?: Array<{ name?: string; title?: string }>
    }
    const people = (await peopleRes.json()) as { connections?: GooglePerson[] }
    const connections = people.connections ?? []

    const orgId = req.user.org
    const now = new Date().toISOString()
    let imported = 0
    let skipped = 0

    for (const person of connections) {
      const email = person.emailAddresses?.[0]?.value
      if (!email) { skipped++; continue }

      const firstName = person.names?.[0]?.givenName ?? person.names?.[0]?.displayName ?? email.split('@')[0] ?? ''
      const lastName = person.names?.[0]?.familyName ?? ''
      const phone = person.phoneNumbers?.[0]?.value ?? null
      const jobTitle = person.organizations?.[0]?.title ?? null

      const exists = await db`
        SELECT 1 FROM contacts WHERE email = ${email} AND organization_id = ${orgId} LIMIT 1
      `
      if (exists.length > 0) { skipped++; continue }
      await db`
        INSERT INTO contacts (email, first_name, last_name, phone, job_title, type, source, organization_id, created_at, updated_at)
        VALUES (${email}, ${firstName}, ${lastName}, ${phone}, ${jobTitle}, 'contact', 'google_contacts', ${orgId}, ${now}, ${now})
      `
      imported++
    }

    return reply.send({ imported, skipped, total: connections.length })
  })
}
