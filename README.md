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
| Cache / Queue | Redis 7 + BullMQ (ioredis) |
| Realtime | Socket.io 4 (org-scoped rooms) |
| Auth | JWT HS256 — jti denylist in Redis |
| Encryption | AES-256-GCM (field-level) |
| Payments | Stripe |
| Email | Nodemailer (SMTP) |
| Validation | Zod (API + frontend) |

---

## Architecture

```
Browser (React SPA)
  │
  ├── REST API   ──→  Fastify 5  (Node 22)
  │                     ├─ /auth /contacts /deals /companies /activities
  │                     ├─ /leads /sequences /automations /products
  │                     ├─ /reports /forecast /inbox /calendar
  │                     ├─ /custom-fields /goals /audit /webhooks
  │                     └─ /admin  /public-api
  │
  ├── Realtime   ──→  Socket.io 4
  │                     └─ __n0crmDbChange(table) — org-scoped rooms, JWT-verified
  │
  └── Background ──→  BullMQ on Redis
                        └─ email sends, sequence scheduling, enrichment jobs
```

**Auth flow:** `POST /auth/login` → HS256 JWT (`sub / org / role / jti`) in `localStorage`. Every request carries `Authorization: Bearer <token>`. On 401: clear token, redirect `/login`. Logout revokes `jti` in Redis.

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
│   ├── migrations/            # 16 SQL migration files (auto-applied on boot)
│   ├── scripts/               # migrate.ts, seed.ts
│   ├── docker-entrypoint.sh   # Runs migrations then starts server
│   ├── Dockerfile
│   └── package.json
│
├── .gitea/workflows/          # Gitea Actions CI/CD
│   ├── ci.yml                 # Frontend tests + security audit
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
| **Inbox** | Gmail OAuth, full thread sync, send/reply/compose, attachment download, thread-to-record linking |
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
npm run db:seed                               # seeds admin@n0crm.local / Admin1234!
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

docker-compose up -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| API | http://localhost:3001 |
| PostgreSQL | localhost:5432 (bound to 127.0.0.1) |
| Redis | localhost:6379 (bound to 127.0.0.1) |

The API container auto-runs all pending migrations on boot via `docker-entrypoint.sh`. No separate migration step needed.

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
| `DATABASE_URL` | yes | `postgres://user:pass@host:5432/db` |
| `REDIS_URL` | yes | `redis://localhost:6379` |
| `JWT_SECRET` | yes | HS256 signing secret (min 32 chars) |
| `TOKEN_ENCRYPTION_KEY` | yes | AES-256-GCM key (exactly 32 chars) |
| `CORS_ORIGIN` | yes | Comma-separated allowed origins |
| `JWT_EXPIRES_IN` | no | Token TTL — default `7d` |
| `SMTP_HOST/PORT/USER/PASS` | no | Outbound email |
| `STRIPE_SECRET_KEY` | no | Stripe integration |
| `GOOGLE_CLIENT_ID/SECRET` | no | Gmail + Calendar OAuth |

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

## Security

| Concern | Implementation |
|---------|---------------|
| Authentication | JWT HS256, algorithm pinned at sign + verify |
| Session revocation | `jti` denylist in Redis on logout |
| Password hashing | bcrypt rounds 12, constant-time comparison |
| Password reset tokens | SHA-256 hashed before DB storage |
| Rate limiting | Auth routes: 10 req / 15 min |
| Field encryption | AES-256-GCM for sensitive values |
| Transport | HTTPS enforced in production (nginx) |
| Containers | Non-root `node` user, `.dockerignore` excludes .env |
| Secrets | `JWT_SECRET` and `TOKEN_ENCRYPTION_KEY` enforced as required in compose |
| DB isolation | Every query scoped to `organization_id` from JWT |
| Impersonation | Full audit log entry required — failure blocks token issuance |
| CORS | Strict origin allowlist, wildcards blocked in production |

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
npm run lint
npx tsc --noEmit
npm run test
npm run build
```

---

## CI / CD

| Workflow | Trigger | Action |
|----------|---------|--------|
| `ci.yml` | Push / PR on `frontend/**` | ESLint, TypeScript, Vitest, npm audit |
| `build-production.yml` | Push to `main` on `frontend/**` | Build + push frontend image to Gitea |
| `build-api.yml` | Push to `main` on `api/**` | Build + push API image to Gitea |

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

*Internal tool — Clovr Labs — Last updated: 2026-05-18*
