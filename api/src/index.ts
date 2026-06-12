import 'dotenv/config'
import http from 'node:http'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { Server } from 'socket.io'
import { db } from './db/client.js'
import { redis } from './db/redis.js'
import { healthRoute } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { contactsRoutes } from './routes/contacts.js'
import { dealsRoutes } from './routes/deals.js'
import { companiesRoutes } from './routes/companies.js'
import { orgsRoutes } from './routes/orgs.js'
import { emailRoutes } from './routes/email.js'
import { webhookRoutes } from './routes/webhooks.js'
import { publicApiRoutes } from './routes/publicApi.js'
import { activitiesRoutes } from './routes/activities.js'
import { goalsRoutes } from './routes/goals.js'
import { productsRoutes } from './routes/products.js'
import { templatesRoutes } from './routes/templates.js'
import { auditRoutes } from './routes/audit.js'
import { notificationsRoutes } from './routes/notifications.js'
import { leadsRoutes } from './routes/leads.js'
import { automationsRoutes } from './routes/automations.js'
import { sequencesRoutes } from './routes/sequences.js'
import { customFieldsRoutes } from './routes/customFields.js'
import { invitationsRoutes } from './routes/invitations.js'
import { gmailRoutes } from './routes/gmail.js'
import { calendarRoutes } from './routes/calendar.js'
import { webhookSubscriptionsRoutes } from './routes/webhookSubscriptions.js'
import { emailTrackingRoutes } from './routes/emailTracking.js'
import { apiKeysRoutes } from './routes/apiKeys.js'
import { smtpRoutes } from './routes/smtp.js'
import { uxMetricsRoutes } from './routes/uxMetrics.js'
import { pipelinesRoutes } from './routes/pipelines.js'
import { slackRoutes } from './routes/slack.js'
import { zoomRoutes } from './routes/zoom.js'
import { adminRoutes } from './routes/admin.js'
import { debugRoutes } from './routes/debug.js'
import { analyticsRoutes } from './routes/analytics.js'
import { viewsRoutes } from './routes/views.js'
import { distributionListsRoutes } from './routes/distributionLists.js'
import { userPreferencesRoutes } from './routes/userPreferences.js'
import { billingRoutes, stripeWebhookRoute } from './routes/billing.js'
import { internalRoutes } from './routes/internal.js'
import { aiRoutes } from './routes/ai.js'
import { dataPrivacyRoutes } from './routes/dataPrivacy.js'
import { ssoRoutes } from './routes/sso.js'
import { scimRoutes } from './routes/scim.js'
import { updatesRoutes } from './routes/updates.js'
import { authMiddleware } from './middleware/auth.js'
import { resolveRequestId, captureException } from './services/observability.js'
import { startSequenceRunner, stopSequenceRunner } from './workers/sequenceRunner.js'
import { startAiRetention, stopAiRetention } from './services/ai/retention.js'
import { registerRealtimeHandlers, broadcastDbChange } from './services/realtime.js'
import {
  metricsRegistry,
  httpRequestsTotal,
  activeWebsocketConnections,
} from './services/metrics.js'
import { env } from './config/env.js'

const app = Fastify({
  logger: env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : true,
  serverFactory: (handler) => http.createServer(handler),
  // Trust exactly TRUST_PROXY rightmost X-Forwarded-For hops so req.ip resolves
  // to the genuine client IP and cannot be spoofed by injecting extra leftmost
  // XFF entries (which nginx appends to, never strips). See config/env.ts.
  trustProxy: env.TRUST_PROXY,
  // Request-correlation id: continue a trusted upstream X-Request-Id or mint one.
  // Included in every per-request log line (pino reqId) and echoed to the client.
  genReqId: (req) => resolveRequestId(req.headers['x-request-id']),
})

// Echo the correlation id so clients/proxies can stitch a request to its logs.
app.addHook('onRequest', async (req, reply) => {
  reply.header('x-request-id', String(req.id))
})

// @fastify/cookie must be registered before @fastify/jwt when using cookie extraction
await app.register(cookie)

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
})

// ---------------------------------------------------------------------------
// Task 4: CORS — warn at startup when CORS_ORIGIN is not explicitly configured
// ---------------------------------------------------------------------------
if (!env.CORS_ORIGIN) {
  console.warn('[n0crm-api] WARNING: CORS_ORIGIN env var is not set. Allowing all origins (*).')
  console.warn('[n0crm-api] Set CORS_ORIGIN to your frontend URL(s) for production security.')
}

// Effective CORS origin: default to '*' (permissive) when not explicitly set.
// Production deployments MUST set CORS_ORIGIN to one or more frontend URLs.
const effectiveCorsOrigin: string = env.CORS_ORIGIN ?? '*'

if (env.NODE_ENV === 'production') {
  const origins = effectiveCorsOrigin.split(',').map((s) => s.trim())
  if (origins.some((o) => o === '*')) {
    console.error('[n0crm-api] CORS_ORIGIN cannot contain "*" in production. Set it to your frontend URL.')
    process.exit(1)
  }
}

const corsOrigins: string | string[] | boolean =
  effectiveCorsOrigin === '*'
    ? true
    : effectiveCorsOrigin.includes(',')
      ? effectiveCorsOrigin.split(',').map((s) => s.trim())
      : effectiveCorsOrigin

await app.register(cors, {
  origin: corsOrigins,
  credentials: true,
})

await app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: { algorithm: 'HS256' },
  verify: { algorithms: ['HS256'] },
  // Extract JWT from cookie when no Authorization header is present (browser clients)
  cookie: { cookieName: 'auth_token', signed: false },
})

// ---------------------------------------------------------------------------
// Task 1: Per-tenant rate limiting with Redis
//
// Two tiers:
//   A) Unauthenticated routes (login, register, public) — per-IP, 20 req/min
//   B) Authenticated routes — per-organizationId, 500 req/min stored in Redis
//
// @fastify/rate-limit v10 accepts an ioredis instance as the `redis` store.
// The keyGenerator receives the full Fastify request so we can read req.user
// (available after JWT verification) or fall back to the IP.
//
// IMPORTANT: the global plugin registration is done without a store so it acts
// as a fallback; per-route / per-plugin overrides apply their own config.
// ---------------------------------------------------------------------------

// Global default: 500 req/min per org (for authenticated requests).
// Routes that need a stricter limit (auth endpoints) override this via routeConfig.
await app.register(rateLimit, {
  global: true,
  max: 500,
  timeWindow: '1 minute',
  // Use ioredis for a shared, multi-instance counter.
  redis,
  // Key: org-scoped for authenticated requests, IP-scoped for everything else.
  keyGenerator(req) {
    const user = req.user as { org?: string } | undefined
    const orgId = user?.org
    if (orgId) {
      return `rate:org:${orgId}`
    }
    // Unauthenticated callers: key on req.ip, which Fastify resolves from the
    // trusted XFF suffix (trustProxy=TRUST_PROXY) — NOT the attacker-controlled
    // leftmost X-Forwarded-For value.
    return `rate:ip:${req.ip ?? 'unknown'}`
  },
  errorResponseBuilder(_req, context) {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
      retryAfter: Math.ceil(context.ttl / 1000),
    }
  },
  // Emit the Retry-After header (seconds until window resets).
  addHeadersOnExceeding: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
    'retry-after': true,
  },
})

app.decorate('authenticate', authMiddleware(app))

// ---------------------------------------------------------------------------
// Routes — public
// Auth routes (/auth/login, /auth/register) get a stricter per-IP limit
// (20 req/min) to slow brute-force and enumeration attacks.
// ---------------------------------------------------------------------------
await app.register(healthRoute)
await app.register(authRoutes, {
  prefix: '/auth',
  rateLimit: {
    max: 20,
    timeWindow: '1 minute',
    keyGenerator(req: import('fastify').FastifyRequest) {
      // req.ip is the trustProxy-resolved client IP, not the raw leftmost XFF.
      return `rate:ip:auth:${req.ip ?? 'unknown'}`
    },
  },
})
await app.register(ssoRoutes, { prefix: '/auth/sso' })
await app.register(publicApiRoutes, { prefix: '/public/v1' })
// SCIM 2.0 — authed via a Bearer api-key scoped `scim` (its own onRequest hook), not JWT.
await app.register(scimRoutes, { prefix: '/scim/v2' })
await app.register(webhookRoutes, { prefix: '/webhooks' })

// Routes — protected (require JWT)
await app.register(contactsRoutes, { prefix: '/contacts' })
await app.register(dealsRoutes, { prefix: '/deals' })
await app.register(companiesRoutes, { prefix: '/companies' })
await app.register(orgsRoutes, { prefix: '/orgs' })
await app.register(emailRoutes, { prefix: '/email' })
await app.register(activitiesRoutes, { prefix: '/activities' })
await app.register(goalsRoutes, { prefix: '/goals' })
await app.register(productsRoutes, { prefix: '/products' })
await app.register(templatesRoutes, { prefix: '/templates' })
await app.register(auditRoutes, { prefix: '/audit' })
await app.register(notificationsRoutes, { prefix: '/notifications' })
await app.register(leadsRoutes, { prefix: '/leads' })
await app.register(automationsRoutes, { prefix: '/automations' })
await app.register(sequencesRoutes, { prefix: '/sequences' })
await app.register(customFieldsRoutes, { prefix: '/custom-fields' })
await app.register(invitationsRoutes, { prefix: '/invitations' })
await app.register(gmailRoutes, { prefix: '/gmail' })
// Calendar webhook is public (no JWT) — registered before the authenticated block above
// but as part of calendarRoutes which guards individual routes with authenticate
await app.register(calendarRoutes, { prefix: '/calendar' })
await app.register(webhookSubscriptionsRoutes, { prefix: '/webhook-subscriptions' })
await app.register(emailTrackingRoutes, { prefix: '/email-tracking' })
await app.register(apiKeysRoutes, { prefix: '/integrations' })
await app.register(smtpRoutes, { prefix: '/smtp' })
await app.register(uxMetricsRoutes, { prefix: '/ux-metrics' })
await app.register(pipelinesRoutes, { prefix: '/pipelines' })
await app.register(slackRoutes, { prefix: '/slack' })
await app.register(zoomRoutes, { prefix: '/zoom' })
await app.register(adminRoutes, { prefix: '/admin' })
await app.register(debugRoutes, { prefix: '/_debug' })
await app.register(analyticsRoutes, { prefix: '/analytics' })
await app.register(viewsRoutes, { prefix: '/views' })
await app.register(distributionListsRoutes, { prefix: '/distribution-lists' })
await app.register(userPreferencesRoutes, { prefix: '/preferences' })
await app.register(billingRoutes, { prefix: '/billing' })
await app.register(stripeWebhookRoute)
await app.register(internalRoutes, { prefix: '/internal' })
await app.register(aiRoutes, { prefix: '/ai' })
await app.register(dataPrivacyRoutes, { prefix: '/privacy' })
await app.register(updatesRoutes, { prefix: '/updates' })

// ---------------------------------------------------------------------------
// Task 5: Prometheus /metrics endpoint
// Restricted to localhost / internal callers only. Any request that carries
// a non-loopback X-Forwarded-For or originates from a non-loopback IP is
// rejected with 403 to prevent metric leakage to the public internet.
// ---------------------------------------------------------------------------
const LOOPBACK_PREFIXES = ['127.', '::1', '::ffff:127.']

// Use the raw TCP peer (req.socket.remoteAddress), NOT req.ip. With trustProxy
// enabled, req.ip is XFF-derived and could be spoofed to 127.0.0.1; the socket
// peer cannot be forged, so the loopback gate stays sound regardless of proxy
// config. Cross-container scrapers use the x-internal-key path instead.
function isLoopbackRequest(req: { socket: { remoteAddress?: string | undefined } }): boolean {
  const peer = req.socket.remoteAddress ?? ''
  return LOOPBACK_PREFIXES.some((p) => peer.startsWith(p))
}

app.get('/metrics', { config: { rateLimit: false } }, async (req, reply) => {
  // Allow loopback (same-host curl / healthcheck) OR a caller presenting the
  // shared INTERNAL_KEY (so cross-container scrapers like Prometheus have a
  // non-spoofable way in without relying on network IPs).
  const internalKey = req.headers['x-internal-key']
  const keyOk = Boolean(env.INTERNAL_KEY) && internalKey === env.INTERNAL_KEY
  if (!keyOk && !isLoopbackRequest(req)) {
    return reply.code(403).send({ error: 'Forbidden' })
  }
  const output = await metricsRegistry.metrics()
  return reply
    .header('Content-Type', metricsRegistry.contentType)
    .send(output)
})

// ---------------------------------------------------------------------------
// Realtime via Socket.io
// ---------------------------------------------------------------------------
const io = new Server(app.server as http.Server, {
  cors: { origin: corsOrigins, credentials: true },
})
await registerRealtimeHandlers(io)

// Track active WebSocket connections for the Prometheus gauge.
io.on('connection', (socket: import('socket.io').Socket) => {
  activeWebsocketConnections.inc()
  socket.on('disconnect', () => {
    activeWebsocketConnections.dec()
  })
})

// ---------------------------------------------------------------------------
// onResponse hook — emit db:change after successful mutations
// Uses broadcastDbChange (debounced 100ms) instead of direct io.to().emit()
// to batch rapid successive writes into a single client notification.
// ---------------------------------------------------------------------------
const ROUTE_TABLE_MAP: Record<string, string> = {
  '/contacts': 'contacts',
  '/companies': 'companies',
  '/deals': 'deals',
  '/activities': 'activities',
  '/notifications': 'notifications',
  '/goals': 'sales_goals',
  '/sequences': 'email_sequences',
  '/automations': 'automation_rules',
  '/leads': 'leads',
  '/templates': 'email_templates',
  '/products': 'products',
  '/custom-fields': 'custom_field_definitions',
  '/pipelines': 'pipelines',
  '/calendar': 'calendar_events',
  '/audit': 'audit_log',
  '/orgs': 'organization_members',
  '/updates': 'item_updates',
}

app.addHook('onResponse', async (req, reply) => {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return
  if (reply.statusCode >= 400) return
  const orgId = (req.user as { org?: string } | undefined)?.org
  if (!orgId) return
  for (const [prefix, table] of Object.entries(ROUTE_TABLE_MAP)) {
    if (req.url?.startsWith(prefix)) {
      broadcastDbChange(io, orgId, table)
      break
    }
  }
})

// ---------------------------------------------------------------------------
// Task 5 cont. — HTTP request counter hook
// ---------------------------------------------------------------------------
app.addHook('onResponse', async (req, reply) => {
  // Exclude the metrics endpoint itself to avoid cardinality noise.
  if (req.url === '/metrics') return
  httpRequestsTotal.inc({
    method: req.method,
    route: req.routeOptions?.url ?? req.url,
    status_code: String(reply.statusCode),
  })
})

// Scrub internal error details from responses in production
app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
  const status = err.statusCode ?? 500
  // Server-side faults go through central capture (structured log + tracker hook)
  // with correlation context; client errors (4xx) just log at debug level.
  if (status >= 500) {
    captureException(req.log, err, {
      requestId: String(req.id),
      method: req.method,
      route: req.routeOptions?.url ?? req.url,
      orgId: (req.user as { org?: string } | undefined)?.org ?? null,
      statusCode: status,
    })
  } else {
    req.log.debug({ requestId: String(req.id), err: err.message }, 'client_error')
  }
  if (env.NODE_ENV === 'production' && status >= 500) {
    return reply.code(status).send({ error: 'Internal server error', requestId: String(req.id) })
  }
  return reply.code(status).send({ error: err.message ?? 'Internal server error', requestId: String(req.id) })
})

app.addHook('onClose', async () => {
  await db.end()
  await redis.quit()
  io.close()
})

try {
  await redis.connect()
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  app.log.info(`n0CRM API running on port ${env.PORT}`)

  // Start the background sequence runner after the server is up and DB is ready.
  startSequenceRunner()

  // Start the AI data-retention purge (no-op unless AI_MESSAGE_RETENTION_DAYS > 0).
  startAiRetention(app.log)

  // Graceful shutdown — stop background work before the process exits.
  const shutdown = (): void => {
    stopSequenceRunner()
    stopAiRetention()
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
