import 'dotenv/config'
import http from 'node:http'
import Fastify from 'fastify'
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
import { analyticsRoutes } from './routes/analytics.js'
import { viewsRoutes } from './routes/views.js'
import { distributionListsRoutes } from './routes/distributionLists.js'
import { userPreferencesRoutes } from './routes/userPreferences.js'
import { billingRoutes, stripeWebhookRoute } from './routes/billing.js'
import { authMiddleware } from './middleware/auth.js'
import { registerRealtimeHandlers } from './services/realtime.js'
import { env } from './config/env.js'

const app = Fastify({
  logger: env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : true,
  serverFactory: (handler) => http.createServer(handler),
})

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
})

if (env.NODE_ENV === 'production') {
  const origins = env.CORS_ORIGIN.split(',').map((s) => s.trim())
  if (origins.some((o) => o === '*')) {
    console.error('[velo-api] CORS_ORIGIN cannot contain "*" in production. Set it to your frontend URL.')
    process.exit(1)
  }
}

const corsOrigins = env.CORS_ORIGIN.includes(',')
  ? env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : env.CORS_ORIGIN

await app.register(cors, {
  origin: corsOrigins,
  credentials: true,
})

await app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: { algorithm: 'HS256' },
  verify: { algorithms: ['HS256'] },
})

await app.register(rateLimit, {
  max: 200,
  timeWindow: '1 minute',
})

app.decorate('authenticate', authMiddleware(app))

// Routes — public
await app.register(healthRoute)
await app.register(authRoutes, { prefix: '/auth' })
await app.register(publicApiRoutes, { prefix: '/public/v1' })
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
await app.register(analyticsRoutes, { prefix: '/analytics' })
await app.register(viewsRoutes, { prefix: '/views' })
await app.register(distributionListsRoutes, { prefix: '/distribution-lists' })
await app.register(userPreferencesRoutes, { prefix: '/preferences' })
await app.register(billingRoutes, { prefix: '/billing' })
await app.register(stripeWebhookRoute)

// Realtime via Socket.io
const io = new Server(app.server as http.Server, {
  cors: { origin: corsOrigins, credentials: true },
})
registerRealtimeHandlers(io)

// Emit db:change after successful mutations so connected clients can refresh
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
}

app.addHook('onResponse', async (req, reply) => {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return
  if (reply.statusCode >= 400) return
  const orgId = (req.user as { org?: string } | undefined)?.org
  if (!orgId) return
  for (const [prefix, table] of Object.entries(ROUTE_TABLE_MAP)) {
    if (req.url?.startsWith(prefix)) {
      io.to(`org:${orgId}`).emit('db:change', { table })
      break
    }
  }
})

// Scrub internal error details from responses in production
app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
  app.log.error(err)
  const status = err.statusCode ?? 500
  if (env.NODE_ENV === 'production' && status >= 500) {
    return reply.code(status).send({ error: 'Internal server error' })
  }
  return reply.code(status).send({ error: err.message ?? 'Internal server error' })
})

app.addHook('onClose', async () => {
  await db.end()
  await redis.quit()
  io.close()
})

try {
  await redis.connect()
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  app.log.info(`Velo API running on port ${env.PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
