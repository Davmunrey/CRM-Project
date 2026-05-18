# Velo CRM

Internal B2B CRM — React 18 SPA backed by `api/` (Fastify + PostgreSQL). Part of the velo-crm monorepo.

## Monorepo structure

```
velo-crm/
  frontend/     ← This directory (React 18 + TypeScript + Vite SPA)
  api/          ← Fastify 5 + Node.js 22 + PostgreSQL + Redis + Socket.io
  docker-compose.yml   ← Full-stack orchestration
```

## Architecture

```
Browser (React SPA)
  └─ api  (Fastify 5, Node 22, PostgreSQL 16, Redis, Socket.io)
       ├─ REST API  — /auth /contacts /deals /companies /activities ...
       ├─ Realtime  — Socket.io, org-scoped rooms, JWT-verified middleware
       └─ Background — BullMQ jobs on Redis
```

Auth: HS256 JWT (`sub/org/role/jti`). Every request carries `Authorization: Bearer <token>`. On 401: clear token, redirect `/login`.

Data: all Zustand stores are API-backed (optimistic UI + rollback). No Supabase PostgREST — direct Fastify routes scope every query by `organization_id` from JWT.

Realtime: Socket.io from the same `api/` process; frontend subscribes to `__veloDbChange(table)` events for contacts, deals, activities, notifications.

---

## Modules

| Module | Key features |
|--------|-------------|
| Dashboard | KPI cards, revenue chart, deal funnel, top deals, activity heatmap, onboarding checklist |
| Contacts | Table/grid, CSV export, duplicate detection, bulk actions, smart views, distribution lists, LinkedIn URL enrichment |
| Companies | Industry/status/size filters, domain dedup, revenue tracking |
| Deals | Kanban + list, multi-pipeline, stage auto-resolve, quote builder (save/export/email) |
| Activities | Unified feed, overdue highlighting, quick complete/delete |
| Leads | Scoring engine (configurable rules), score snapshots, events timeline |
| Automations | Rule builder (trigger/condition/action), execution log |
| Sequences | Email sequences with A/B variants, enrollment management, step scheduling |
| Products | Product catalog for deal line items and quotes |
| Reports | Revenue by month, Won/Lost donut, activities by type, conversion funnel, email open/click stats |
| Forecast | Weighted pipeline forecast, pipeline health score, best-bet deals |
| Inbox | Gmail OAuth, full thread sync, send/reply/compose, attachment download, thread-to-record linking |
| Calendar | Google Calendar sync, event create/edit, month/week/day view, Meet link display |
| Custom Fields | Per-entity (contact/company/deal/lead) definitions, values, multilingual labels |
| Goals | Sales targets per rep, period tracking, current progress |
| Audit Log | Org activity trail |
| Settings | Team management, SMTP, Google OAuth integration guide, API keys, webhooks, language (en/es/pt/fr/de/it) |
| Notifications | In-app feed, mark-read, bulk clear |

---

## Dev Setup

Requires: **Node 22+**, **`api/` backend running** at `http://localhost:3001` (see `../api/README.md`).

```bash
cd frontend
cp .env.example .env
# VITE_API_URL defaults to http://localhost:3001
npm install
npm run dev   # http://localhost:5173
```

Start the full stack first (Homebrew):

```bash
brew services start postgresql@16 redis

cd api
npm run db:migrate && npm run db:seed
npm run dev
# admin@velo.local / Admin1234!
```

Or with Docker (Postgres + Redis only):

```bash
cd ..
docker-compose up postgres redis -d

cd api
npm run db:migrate && npm run db:seed
npm run dev
```

Full Docker stack (frontend + API + Postgres + Redis):

```bash
# From repo root
docker-compose up -d

# Frontend: http://localhost
# API: http://localhost:3001
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | API base URL. Local dev: `http://localhost:3001`. Docker: omit (nginx proxies `/api/*`) |
| `VITE_APP_CHANNEL` | `development` | Build channel — `production` or `staging` for deployed builds |
| `VITE_GOOGLE_CLIENT_ID` | — | Gmail OAuth (optional) |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite |
| Styling | Tailwind CSS 3 (dark theme) |
| Routing | React Router v6 |
| State | Zustand 5 — all stores backed by velo-api |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Drag & Drop | @hello-pangea/dnd |
| Icons | lucide-react |
| Dates | date-fns |
| Tests | Vitest + Testing Library + Playwright (e2e) |

---

## Project Structure

```
src/
├── components/
│   ├── layout/       # Sidebar, Topbar, Layout, ErrorBoundary
│   ├── ui/           # Button, Input, Select, Badge, Avatar, Modal, Toast
│   ├── contacts/     # ContactForm, ContactStatusBadge
│   ├── companies/    # CompanyForm
│   ├── deals/        # DealCard, DealForm, KanbanColumn
│   ├── activities/   # ActivityForm, ActivityItem
│   └── shared/       # SearchBar, EmptyState, SmartViewBar, EntityListsToolbar
├── pages/            # Route containers
├── store/            # Zustand stores (API-backed, optimistic)
├── types/            # TypeScript interfaces
├── hooks/            # useLocalStorage, useSearch, useFilters
├── lib/              # api.ts (fetch client), envChannel, schemas
├── i18n/             # en/es/pt/fr/de/it translation catalogs
└── utils/            # formatters, constants, lead scoring, health engine
```

---

## Auth Flow

| Step | What happens |
|------|-------------|
| Login | `POST /auth/login` → JWT (`sub/org/role/jti`) stored in `localStorage` |
| Register | `POST /auth/register` → JWT with `org: null` → redirect `/org-setup` |
| Org setup | `POST /orgs` → new JWT with `org` claim |
| Invite accept | `GET + POST /invitations/:token` → new JWT |
| Session restore | On load: read token → `GET /auth/me` → hydrate store |
| Expiry guard | `enforceTokenExpiry()` runs before every API call — clears token + redirects on expiry |
| 401 | `clearToken()` + redirect `/login` |
| Logout | `POST /auth/logout` (revokes `jti` in Redis) + `clearToken()` + reset stores |
| Password reset | `POST /auth/forgot-password` → DB token (1h TTL) → `POST /auth/reset-password` |

---

## Quality Gates

Run before pushing:

```bash
npm run ui:lint          # design token / color guardrails
npm run i18n:lint        # no bare strings in error handling
npm run i18n:coverage    # all locales match en key paths
npm run lint:ci          # ESLint on src/
npx tsc --noEmit
npm run test:run         # Vitest
npm run build
```

## Scripts

```bash
npm run dev              # Vite dev server
npm run build            # Production build → dist/
npm run test             # Vitest watch
npm run test:run         # Vitest single run
npm run test:coverage    # Coverage report
npm run test:e2e         # Playwright e2e
npm run audit:unused     # Knip unused code check
```

---

## Docs

Internal engineering docs under `docs/` — see [`docs/README.md`](docs/README.md).
Planning, phases, and requirement checkboxes under `.planning/`.

---

*Last updated: 2026-05-18*
