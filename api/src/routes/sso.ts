/**
 * SSO (OIDC) routes — provider-agnostic single sign-on.
 *
 *   GET /auth/sso/status    → { enabled, issuer }
 *   GET /auth/sso/start     → 302 to the IdP authorize URL (state+nonce+PKCE stored in Redis)
 *   GET /auth/sso/callback  → verify state + ID token, JIT-provision the user, set the auth cookie
 *
 * Enabled only when OIDC_ISSUER + CLIENT_ID + CLIENT_SECRET are configured;
 * otherwise the routes report disabled / 503. The ID token is verified by JWKS
 * RS256 signature + iss/aud/exp/nonce before any account is touched.
 */
import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { setAuthCookie } from '../services/cookieAuth.js'
import { setUserTokensValidAfter, storeSsoFlow, consumeSsoFlow } from '../db/redis.js'
import { recordSecurityEvent } from '../services/securityEvents.js'
import {
  isSsoConfigured,
  discover,
  buildAuthorizeUrl,
  exchangeCode,
  verifyIdToken,
  validateIdTokenClaims,
  codeChallengeS256,
} from '../services/oidc.js'

function jwtExpirySeconds(expiresIn: string): number {
  const m = /^(\d+)([smhd])$/.exec(expiresIn)
  if (!m) return 7 * 24 * 3600
  const n = parseInt(m[1]!, 10)
  const unit = m[2]!
  return unit === 's' ? n : unit === 'm' ? n * 60 : unit === 'h' ? n * 3600 : n * 86400
}

export async function ssoRoutes(app: FastifyInstance) {
  const RATE = { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }

  app.get('/status', async () => ({ enabled: isSsoConfigured(), issuer: env.OIDC_ISSUER ?? null }))

  // Kick off the login: store state/nonce/PKCE, redirect to the IdP.
  app.get('/start', RATE, async (_req, reply) => {
    if (!isSsoConfigured()) return reply.code(503).send({ error: 'SSO is not configured' })
    try {
      const cfg = await discover()
      const state = randomBytes(16).toString('hex')
      const nonce = randomBytes(16).toString('hex')
      const codeVerifier = randomBytes(32).toString('base64url')
      await storeSsoFlow(state, { nonce, codeVerifier })
      const url = buildAuthorizeUrl(cfg, { state, nonce, codeChallenge: codeChallengeS256(codeVerifier) })
      return reply.redirect(url)
    } catch (err) {
      app.log.error({ err: String(err) }, '[sso] start failed')
      return reply.code(502).send({ error: 'SSO provider unavailable' })
    }
  })

  // IdP redirects back here with ?code&state.
  app.get('/callback', RATE, async (req, reply) => {
    const loginUrl = `${env.APP_URL.replace(/\/$/, '')}/login`
    if (!isSsoConfigured()) return reply.code(503).send({ error: 'SSO is not configured' })

    const { code, state } = req.query as { code?: string; state?: string }
    if (!code || !state) return reply.redirect(`${loginUrl}?sso_error=missing_params`)

    const flow = await consumeSsoFlow(state) // one-time use → CSRF/replay guard
    if (!flow) return reply.redirect(`${loginUrl}?sso_error=invalid_state`)

    let email: string
    let name: string
    try {
      const cfg = await discover()
      const { id_token } = await exchangeCode(cfg, code, flow.codeVerifier)
      const claims = await verifyIdToken(cfg, id_token)
      const claimError = validateIdTokenClaims(claims, {
        issuer: cfg.issuer,
        clientId: env.OIDC_CLIENT_ID!,
        nonce: flow.nonce,
      })
      if (claimError) {
        app.log.warn({ claimError }, '[sso] id_token rejected')
        return reply.redirect(`${loginUrl}?sso_error=invalid_token`)
      }
      email = String(claims.email).toLowerCase()
      name = (claims.name as string | undefined) ?? email.split('@')[0]!
    } catch (err) {
      app.log.error({ err: String(err) }, '[sso] callback exchange/verify failed')
      return reply.redirect(`${loginUrl}?sso_error=exchange_failed`)
    }

    // JIT provisioning: find by email, or create a new SSO-backed user.
    let user = (await db`
      SELECT id, role, is_active, organization_id FROM users WHERE lower(email) = ${email} LIMIT 1
    `)[0]

    if (user && user['isActive'] !== true) {
      recordSecurityEvent(req, 'login_failed', { actorEmail: email, detail: 'sso: inactive account' })
      return reply.redirect(`${loginUrl}?sso_error=inactive`)
    }

    if (!user) {
      // Unusable local password — this account authenticates via SSO only.
      const placeholder = await bcrypt.hash(randomBytes(24).toString('hex'), 12)
      user = (await db`
        INSERT INTO users (email, password_hash, name, role, is_active, created_at, updated_at)
        VALUES (${email}, ${placeholder}, ${name}, ${env.OIDC_DEFAULT_ROLE}, true, now(), now())
        RETURNING id, role, is_active, organization_id
      `)[0]
      recordSecurityEvent(req, 'register', { actorUserId: user!['id'] as string, actorEmail: email, detail: 'sso provisioned' })
    }

    const ttl = jwtExpirySeconds(env.JWT_EXPIRES_IN)
    const token = app.jwt.sign(
      {
        sub: user!['id'] as string,
        org: (user!['organizationId'] as string | null) ?? null,
        role: user!['role'] as string,
        jti: randomBytes(16).toString('hex'),
      },
      { expiresIn: env.JWT_EXPIRES_IN },
    )
    await setUserTokensValidAfter(user!['id'] as string, ttl)
    setAuthCookie(reply, token, ttl)
    recordSecurityEvent(req, 'login_success', {
      actorUserId: user!['id'] as string,
      actorEmail: email,
      organizationId: (user!['organizationId'] as string | null) ?? null,
      detail: 'via SSO',
    })

    // Land in the app; if the user has no org yet they'll be routed to org setup.
    return reply.redirect(`${env.APP_URL.replace(/\/$/, '')}/`)
  })
}
