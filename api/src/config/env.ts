import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Database
  DATABASE_URL: z.string().url(),

  // Auth — min 64 chars (256-bit key for HMAC-SHA256)
  JWT_SECRET: z.string().min(64),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().default(30),

  // CORS — use comma-separated URLs in production; '*' is rejected in production
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Frontend base URL — used in transactional email links
  APP_URL: z.string().url().default('http://localhost:5173'),

  // Email — Resend or SMTP (per-org SMTP also supported at runtime)
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@velo.app'),

  // Redis (BullMQ)
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  // Public URL the Google Calendar API will push webhook notifications to
  GOOGLE_CALENDAR_WEBHOOK_URL: z.string().url().optional(),

  // Stripe billing
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SUCCESS_URL: z.string().url().optional(),
  STRIPE_CANCEL_URL: z.string().url().optional(),

  // Anthropic (AI orchestrator)
  ANTHROPIC_API_KEY: z.string().optional(),

  // Encryption key for stored OAuth tokens (openssl rand -hex 32)
  TOKEN_ENCRYPTION_KEY: z.string().min(64).optional(),
})

const stripped = Object.fromEntries(
  Object.entries(process.env).map(([k, v]) => [k, v === '' ? undefined : v]),
)
const parsed = schema.safeParse(stripped)

if (!parsed.success) {
  console.error('[velo-api] Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
