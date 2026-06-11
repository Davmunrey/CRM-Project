import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Database
  DATABASE_URL: z.string().url(),

  // Auth — min 32 chars
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhdw]$/).default('7d'),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().default(30),

  // Self-registration policy. Open by default (self-host onboarding). Set to
  // "false"/"0" for invite-only (enterprise). The very first user can always
  // register so a fresh install can be bootstrapped. (z.coerce.boolean treats
  // any non-empty string as true, so parse the string explicitly.)
  ALLOW_OPEN_REGISTRATION: z.string().default('true').transform((v) => v !== 'false' && v !== '0'),
  // Optional comma-separated email-domain allow-list for self-registration.
  REGISTRATION_ALLOWED_DOMAINS: z.string().optional(),

  // CORS — use comma-separated URLs in production; '*' is rejected in production.
  // Intentionally no .default() here so we can detect when it was NOT explicitly
  // provided and emit a startup warning. See index.ts CORS_ORIGIN guard.
  CORS_ORIGIN: z.string().optional(),

  // Frontend base URL — used in transactional email links
  APP_URL: z.string().url().default('http://localhost:5173'),

  // Email — Resend or SMTP (per-org SMTP also supported at runtime)
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@n0crm.com'),

  // Redis (BullMQ + rate limiting + Socket.io adapter)
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

  // ───────────────────────────────────────────────────────────────────────
  // AI / Agentic features — multi-provider. Gemini is the free default.
  // Each provider activates only when its key is present; the AI features
  // degrade gracefully (GET /ai/status reports `enabled: false`) when none
  // is configured. AI_DEFAULT_PROVIDER picks which configured provider to use
  // unless an org overrides it in organizations.settings.ai.provider.
  // ───────────────────────────────────────────────────────────────────────
  // Google Gemini — https://aistudio.google.com/apikey (generous free tier)
  GEMINI_API_KEY: z.string().optional(),
  // OpenAI — https://platform.openai.com/api-keys
  OPENAI_API_KEY: z.string().optional(),
  // Anthropic (also used by the legacy AI orchestrator)
  ANTHROPIC_API_KEY: z.string().optional(),
  // Default provider when an org hasn't pinned one. Falls back to whichever
  // provider has a key if the chosen one is unconfigured.
  AI_DEFAULT_PROVIDER: z.enum(['gemini', 'openai', 'anthropic']).default('gemini'),
  // Optional per-provider model overrides (sensible defaults baked into code).
  AI_GEMINI_MODEL: z.string().optional(),
  AI_OPENAI_MODEL: z.string().optional(),
  AI_ANTHROPIC_MODEL: z.string().optional(),
  // Hard ceiling on tool-call rounds in the agent loop (safety guardrail).
  AI_AGENT_MAX_STEPS: z.coerce.number().min(1).max(20).default(8),
  // Per-org monthly output-token spend cap. 0 = unlimited. An org can set a
  // lower cap in organizations.settings.ai.monthlyTokenCap. Prevents a runaway
  // or abusive tenant from burning unbounded cost on a shared provider key.
  AI_MONTHLY_TOKEN_CAP: z.coerce.number().min(0).default(0),
  // Retention for AI conversations/messages/usage. 0 = keep forever. When > 0,
  // a periodic purge deletes ai_messages/ai_conversations/ai_usage_log older
  // than N days (PII-bearing transcripts should not persist indefinitely).
  AI_MESSAGE_RETENTION_DAYS: z.coerce.number().min(0).default(0),

  // Encryption key for stored OAuth tokens (openssl rand -hex 32)
  TOKEN_ENCRYPTION_KEY: z.string().min(32).optional(),

  // Diagnostic /_debug/* routes. When DEBUG_TOKEN is set (>=16 chars),
  // /_debug/health, /_debug/users, /_debug/migrations and /_debug/sql
  // become available, gated by the X-Debug-Token header. Unset to disable.
  DEBUG_TOKEN: z.string().min(16).optional(),

  // Internal operational key — gates POST /internal/* routes (e.g. sequence runner trigger).
  // Set to a random secret (>=16 chars). When unset, all /internal/* calls return 503.
  INTERNAL_KEY: z.string().min(16).optional(),

  // Error-tracking DSN (optional). When set, captureException is expected to
  // forward to the configured tracker; observability degrades to structured
  // logs when unset.
  SENTRY_DSN: z.string().optional(),

  // Number of trusted reverse-proxy hops in front of the API, used to resolve the
  // real client IP from X-Forwarded-For for rate limiting. Must match the real
  // topology: too high lets clients spoof their IP (rotate XFF to defeat the
  // auth-route limiter); too low collapses all clients onto the proxy IP.
  //   docker-compose (nginx only) = 1   ·   privateprompt (edge + nginx) = 2
  //   0 disables proxy trust (direct exposure / tests).
  TRUST_PROXY: z.coerce.number().int().min(0).max(8).default(1),
})

const stripped = Object.fromEntries(
  Object.entries(process.env).map(([k, v]) => [k, v === '' ? undefined : v]),
)
const parsed = schema.safeParse(stripped)

if (!parsed.success) {
  console.error('[n0crm-api] Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
