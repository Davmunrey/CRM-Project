# n0CRM

> Outbound-native CRM for high-velocity sales teams — built and maintained by **Clovr Labs**.

Internal tooling. Not open source.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript 5 + Vite |
| Styling | Tailwind CSS 3 (dark theme) |
| State | Zustand 5 — optimistic, API-backed stores |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | lucide-react |
| i18n | en / es / pt / fr / de / it |
| API | Fastify 5 + Node.js 22 |
| Database | PostgreSQL 16 via postgres.js |
| Connection pooling | PgBouncer (transaction mode, 25 server connections) |
| Cache / Queue | Redis 7 + BullMQ (ioredis) |
| Realtime | Socket.io 4 (org-scoped rooms, Redis adapter for multi-node) |
| Auth | JWT HS256 — HttpOnly cookie, jti denylist in Redis |
| Encryption | AES-256-GCM (field-level) |
| AI | Multi-provider — Google Gemini (free default), OpenAI, Anthropic — with a tool-using CRM agent |
| Monitoring | Prometheus + Grafana + postgres-exporter + node-exporter |
| Backup | Automated pg_dump (every 6h, 7-day retention) |
| Payments | Stripe |
| Email | Nodemailer (SMTP) |
| Validation | Zod (API + frontend) |
| Testing | Vitest (API + frontend) |

---

## Architecture

```
Browser (React SPA)
  │
  ├── REST API   ──→  Fastify 5  (Node 22)
  │   │                 ├─ /auth /contacts /deals /companies /activities
  │   │                 ├─ /leads /sequences /automations /products
  │   │                 ├─ /reports /forecast /inbox /calendar
  │   │                 ├─ /custom-fields /goals /audit /webhooks
  │   │                 ├─ /ai (status / summarize / draft-reply / next-best-action / search / agent)
  │   │                 ├─ /health /metrics /internal/*
  │   │                 └─ /admin  /public-api
  │   │
  │   ├── Realtime   ──→  Socket.io 4 (Redis-backed adapter)
  │   │                     └─ __n0crmDbChange(table) — org-scoped rooms, JWT-verified
  │   │
  │   └── Background ──→  BullMQ on Redis
  │                         └─ email sends, sequence scheduling, enrichment jobs, sequence runner
  │
  ├── PgBouncer ──→ PostgreSQL 16
  │                 └─ Transaction pool mode (25 server connections, 500 max clients)
  │
  └── Monitoring
      ├── Prometheus (scrapes /metrics every 15s, also postgres-exporter, node-exporter)
      ├── Grafana (port 3002, auto-provisioned Prometheus datasource)
      └── Backup service (pg_dump every 6h, gzip, 7-day retention)
```

**Auth flow:** `POST /auth/login` → HS256 JWT (`sub / org / role / jti`) set as an **HttpOnly cookie** (never returned in the body — XSS protection). The browser sends it automatically with every request. On 401: redirect `/login`. Logout revokes `jti` in the Redis denylist and clears the cookie.

**Data:** all Zustand stores are API-backed with optimistic UI + rollback. PostgreSQL queries are scoped to `organization_id` from the JWT — no tenant leakage possible.

---

## Monorepo Structure

```
velo-crm/
├── frontend/                  # React 18 SPA
│   ├── src/
│   │   ├── components/        # UI primitives, layout, feature components
│   │   ├── pages/             # Route containers
│   │   ├── store/             # Zustand stores
│   │   ├── hooks/             # useLocalStorage, useSearch, useFilters
│   │   ├── lib/               # api.ts fetch client, env, schemas
│   │   ├── i18n/              # Translation catalogs (6 locales)
│   │   └── utils/             # Formatters, constants, lead scoring
│   ├── nginx.conf.template    # Production nginx (envsubst)
│   ├── Dockerfile
│   └── package.json
│
├── api/                       # Fastify 5 backend
│   ├── src/
│   │   ├── routes/            # 40+ route modules
│   │   ├── plugins/           # JWT, CORS, rate-limit, helmet
│   │   ├── services/          # Business logic
│   │   ├── workers/           # BullMQ job handlers
│   │   └── config/            # env.ts (Zod-validated)
│   ├── migrations/            # 18 SQL migration files (auto-applied on boot)
│   ├── scripts/               # migrate.ts, seed.ts
│   ├── docker-entrypoint.sh   # Runs migrations then starts server
│   ├── Dockerfile
│   └── package.json
│
├── .gitea/workflows/          # Gitea Actions CI/CD
│   ├── ci.yml                 # api job (tsc/eslint/vitest/build/audit) + frontend ci + security
│   ├── build-production.yml   # Frontend Docker image
│   └── build-api.yml          # API Docker image
│
├── docker-compose.yml         # Full-stack local orchestration
└── privateprompt-app.json     # Private Prompt deployment manifest
```

---

## CRM Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | KPI cards, revenue chart, deal funnel, activity heatmap, onboarding checklist |
| **Contacts** | Table/grid view, CSV export, duplicate detection, bulk actions, smart views, distribution lists, LinkedIn enrichment |
| **Companies** | Industry/status/size filters, domain deduplication, revenue tracking |
| **Deals** | Kanban + list view, multi-pipeline, stage auto-resolve, quote builder (save/export/email) |
| **Activities** | Unified feed, overdue highlighting, quick complete/delete |
| **Leads** | Configurable scoring engine, score snapshots, events timeline |
| **Automations** | Rule builder (trigger → condition → action), execution log |
| **Sequences** | Email sequences with A/B variants, enrollment management, step scheduling |
| **Products** | Product catalog for deal line items and quotes |
| **Reports** | Revenue by month, Won/Lost donut, activities by type, conversion funnel, email open/click stats |
| **Forecast** | Weighted pipeline forecast, pipeline health score, best-bet deals |
| **AI Assistant** | Multi-provider (Gemini/OpenAI/Anthropic) — global drawer chat with a tool-using CRM agent, next-best-action on Contact/Deal detail, thread summarize + draft reply in the Inbox; degrades gracefully when no provider key is set |
| **Inbox** | Gmail OAuth, full thread sync, send/reply/compose, attachment download, thread-to-record linking, AI summarize + draft reply |
| **Calendar** | Google Calendar sync, event create/edit, month/week/day view, Meet link display |
| **Custom Fields** | Per-entity definitions (contact/company/deal/lead), values, multilingual labels |
| **Goals** | Sales targets per rep, period tracking, current progress |
| **Audit Log** | Org-scoped activity trail |
| **Settings** | Team management, SMTP, Google OAuth guide, API keys, webhooks, language selection |
| **Notifications** | In-app feed, mark-read, bulk clear |
| **Admin** | Org management, impersonation (full audit log) |
| **Public API** | API key auth, rate-limited, org-scoped |
| **Webhooks** | Configurable event subscriptions with delivery log |

---

## Quick Start — Local Development

**Requirements:** Node 22+, PostgreSQL 16, Redis 7.

```bash
# 1. Start infrastructure
brew services start postgresql@16 redis       # macOS
# or: docker-compose up postgres redis -d     # Docker

# 2. Start the API
cd api
cp .env.example .env                          # fill in DB credentials + JWT_SECRET
npm install
npm run db:migrate
npm run db:seed                               # seeds admin@n0crm.local / Admin1234! (per .env.example)
npm run dev                                   # http://localhost:3001

# 3. Start the frontend (separate terminal)
cd frontend
cp .env.example .env                          # VITE_API_URL=http://localhost:3001
npm install
npm run dev                                   # http://localhost:5173
```

---

## Docker — Full Stack

Spin up everything with a single command:

```bash
# Required secrets
export JWT_SECRET=<min-32-char-secret>
export TOKEN_ENCRYPTION_KEY=<32-char-aes-key>
export POSTGRES_PASSWORD=<db-password>
export INTERNAL_KEY=<min-16-char-internal-secret>
export GRAFANA_PASSWORD=<grafana-admin-password>

docker-compose up -d
docker-compose --profile seed up seed  # Optional: separate seed profile
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| API | http://localhost:3001 |
| PgBouncer | localhost:6432 (API connects here, not directly to postgres) |
| PostgreSQL | localhost:5432 (internal, via PgBouncer) |
| Redis | localhost:6379 (internal) |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3002 (admin / GRAFANA_PASSWORD) |

The API container auto-runs all pending migrations on boot via `docker-entrypoint.sh`. Seed is now a separate profile: run with `--profile seed` to apply initial data.

---

## Deploy — Private Prompt

The `privateprompt-app.json` at the repo root defines the full 4-service stack:

| Service | Image |
|---------|-------|
| `postgres` | postgres:16-alpine |
| `redis` | redis:7-alpine |
| `api` | `gitea.apps.privateprompt.tech/clovrlabs/n0crm-api:latest` |
| `web` | `gitea.apps.privateprompt.tech/clovrlabs/velo-crm:latest` |

`JWT_SECRET` and `TOKEN_ENCRYPTION_KEY` are auto-generated by Private Prompt on first deploy.

CI pipelines (`.gitea/workflows/`) build and push both images automatically on every merge to `main`.

---

## Environment Variables

### API (`api/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | `postgres://user:pass@pgbouncer:6432/db` (connect via PgBouncer, not directly to postgres) |
| `REDIS_URL` | yes | `redis://localhost:6379` |
| `JWT_SECRET` | yes | HS256 signing secret (min 32 chars) |
| `TOKEN_ENCRYPTION_KEY` | yes | AES-256-GCM key (exactly 32 chars) |
| `CORS_ORIGIN` | yes | Comma-separated allowed origins |
| `INTERNAL_KEY` | yes (prod) | Min 16 chars — protects `/internal/*` routes (sequences/run, etc.) |
| `JWT_EXPIRES_IN` | no | Token TTL — default `7d` |
| `SMTP_HOST/PORT/USER/PASS` | no | Outbound email per org (tenant-scoped) |
| `STRIPE_SECRET_KEY` | no | Stripe integration |
| `GOOGLE_CLIENT_ID/SECRET` | no | Gmail + Calendar OAuth |
| `GRAFANA_PASSWORD` | no | Grafana admin password (default: `admin` if unset) |
| `GEMINI_API_KEY` | no | Google Gemini key — the free default AI provider |
| `OPENAI_API_KEY` | no | OpenAI API key |
| `ANTHROPIC_API_KEY` | no | Anthropic API key |
| `AI_DEFAULT_PROVIDER` | no | `gemini` (default) · `openai` · `anthropic` — provider used when an org hasn't pinned one |
| `AI_GEMINI_MODEL` / `AI_OPENAI_MODEL` / `AI_ANTHROPIC_MODEL` | no | Per-provider model overrides (sensible defaults baked in) |
| `AI_AGENT_MAX_STEPS` | no | Max tool-call rounds in the agent loop — default `8` (1–20) |
| `AI_MONTHLY_TOKEN_CAP` | no | Per-org monthly output-token spend cap; `0` = unlimited (429 when exceeded) |
| `AI_MESSAGE_RETENTION_DAYS` | no | Purge `ai_*` data older than N days; `0` = keep forever |
| `TRUST_PROXY` | no | Trusted reverse-proxy hop count for client-IP resolution — nginx-only `1` (default), privateprompt edge+nginx `2`, direct `0` |
| `ALLOW_OPEN_REGISTRATION` | no | Allow self-service signup — default `true` (first user is always allowed) |
| `REGISTRATION_ALLOWED_DOMAINS` | no | Comma-separated email-domain allow-list for self-registration |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | API base URL. Local dev: `http://localhost:3001` |
| `VITE_APP_CHANNEL` | `development` | `production` or `staging` for deployed builds |
| `VITE_GOOGLE_CLIENT_ID` | — | Gmail OAuth (optional) |

---

## API Overview

All routes are prefixed `/api/v1` and require `Authorization: Bearer <jwt>` unless noted.

| Prefix | Description |
|--------|-------------|
| `POST /auth/login` | Authenticate, returns JWT |
| `POST /auth/register` | Create account |
| `POST /auth/logout` | Revoke token (jti denylist) |
| `POST /auth/forgot-password` | Send reset email |
| `POST /auth/reset-password` | Consume reset token |
| `/contacts` | CRUD + bulk actions + smart views |
| `/companies` | CRUD + filters |
| `/deals` | CRUD + pipeline management |
| `/activities` | CRUD + feed |
| `/leads` | CRUD + scoring |
| `/automations` | Rule CRUD + execution log |
| `/sequences` | Sequence + step + enrollment management |
| `/products` | Product catalog |
| `/reports` | Aggregated analytics |
| `/forecast` | Pipeline forecast + health |
| `/inbox` | Gmail threads + send/reply |
| `/ai` | AI features — `status`, `summarize`, `draft-reply`, `next-best-action`, `search`, and a tool-using `agent` with persisted conversations |
| `/calendar` | Google Calendar events |
| `/custom-fields` | Field definitions + values |
| `/goals` | Sales targets |
| `/audit` | Org audit log |
| `/webhooks` | Webhook CRUD + delivery log |
| `/notifications` | In-app notifications |
| `/admin` | Org management (admin role) |
| `/public-api` | API key management |

Full API documentation: see [`api/README.md`](api/README.md).

---

## Webhooks

Configure webhook endpoints in Settings → Webhooks. Events are delivered as `POST` requests with:

```json
{
  "event": "contact.created",
  "organization_id": "uuid",
  "timestamp": "2026-05-18T12:00:00Z",
  "data": { ... }
}
```

Available events: `contact.*`, `company.*`, `deal.*`, `activity.*`, `lead.*`.

---

| Concern | Implementation |
|---------|---------------|
| Authentication | JWT HS256, algorithm pinned at sign + verify |
| Session revocation | `jti` denylist in Redis on logout |
| Password hashing | bcrypt rounds 12, constant-time comparison |
| Password reset tokens | SHA-256 hashed before DB storage |
| Rate limiting | Auth routes: 10 req / 15 min; per-org: 500 req/min (Redis-backed); internal routes: protected by `x-internal-key` |
| Account lockout | 10 failed logins / 15 min on an account → `429`, regardless of correctness (brute-force / credential-stuffing guard) |
| Registration policy | `ALLOW_OPEN_REGISTRATION` toggle + `REGISTRATION_ALLOWED_DOMAINS` allow-list; first user is always permitted |
| Proxy / IP spoofing | `TRUST_PROXY` hop-count resolves the real `req.ip` from `X-Forwarded-For`; the auth limiter keys on it so XFF rotation can't bypass it |
| `/metrics` gating | Restricted to the raw-socket peer plus an `x-internal-key` header — not publicly scrapeable |
| `/_debug/sql` | Runs in a `READ ONLY` transaction, gated behind `DEBUG_TOKEN` |
| AI governance | Per-org kill switch (`settings.ai.enabled=false`), monthly output-token spend cap (`429` over budget), and retention purge of `ai_*` data |
| Sequence runner | Claims due rows `FOR UPDATE SKIP LOCKED` — no double-send across concurrent workers |
| Field encryption | AES-256-GCM for sensitive values |
| Row-level security | RLS enabled on 21 tables, org isolation enforced via `set_current_org()` function |
| Transport | HTTPS enforced in production (nginx) |
| Containers | Non-root `node` user, `.dockerignore` excludes .env, resource limits on all services |
| Secrets | `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `INTERNAL_KEY` enforced as required |
| DB isolation | Every query scoped to `organization_id` from JWT; RLS double-enforces at DB layer |
| Impersonation | Full audit log entry required — failure blocks token issuance |
| CORS | Strict origin allowlist, wildcards blocked in production |
| Connection pooling | PgBouncer in transaction mode; API pool reduced to 10 (outer multiplexer) |

---

## Quality Gates

Run before every merge:

```bash
# Frontend
cd frontend
npm run ui:lint          # design token / color guardrails
npm run i18n:lint        # no bare strings
npm run i18n:coverage    # all 6 locales match en key paths
npm run lint:ci          # ESLint
npx tsc --noEmit
npm run test:run         # Vitest
npm run build

# API
cd api
npx tsc --noEmit         # type check
npm run lint             # ESLint (flat config)
npx vitest run           # Vitest suite
npm run build
npm audit --audit-level=critical
```

The API now has a real CI gate (tsc → ESLint → Vitest → build → npm audit); previously the backend had no lint/type/test enforcement.

---

## CI / CD

| Workflow | Job | Trigger | Action |
|----------|-----|---------|--------|
| `ci.yml` | `api` | Push to `master` / PR | `npm ci` → tsc → ESLint → Vitest → build → npm audit (critical) |
| `ci.yml` | `ci` | Push to `master` / PR | UI guardrails, i18n lint + coverage, ESLint, tsc, Vitest, build, bundle budget (≤250 KB gzip) |
| `ci.yml` | `security` | After `ci` | `npm audit --audit-level=critical` |
| `build-production.yml` | — | Push to `master` | Build + push frontend image to Gitea |
| `build-api.yml` | — | Push to `master` | Build + push API image to Gitea |

Images: `gitea.apps.privateprompt.tech/clovrlabs/velo-crm:latest` and `n0crm-api:latest`.

---

## Internationalization

UI is fully translated in 6 locales. Language selector in Settings.

| Code | Language |
|------|----------|
| `en` | English |
| `es` | Spanish |
| `pt` | Portuguese |
| `fr` | French |
| `de` | German |
| `it` | Italian |

Translation catalogs: `frontend/src/i18n/`.

---

*Internal tool — Clovr Labs — Last updated: 2026-06-10*
