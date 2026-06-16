# n0CRM

n0CRM — the connected, AI-native B2B CRM. React 18 SPA backed by `api/` (Fastify + PostgreSQL), part of the n0CRM monorepo.

## Monorepo structure

```
n0crm/
  frontend/     ← This directory (React 18 + TypeScript + Vite SPA)
  api/          ← Fastify 5 + Node.js 22 + PostgreSQL + Redis + Socket.io
  docker-compose.yml   ← Full-stack orchestration
```

## Architecture

```
Browser (React SPA)
  └─ api  (Fastify 5, Node 22, PostgreSQL 16 via PgBouncer, Redis, Socket.io)
       ├─ REST API  — /auth /contacts /deals /companies /activities /ai ...
       ├─ Realtime  — Socket.io, org-scoped rooms, JWT-verified handshake
       └─ AI         — multi-provider (Gemini / OpenAI / Anthropic) + tool-using agent
```

Auth: HS256 JWT carried in an **HttpOnly `auth_token` cookie** — the SPA never reads the token. Every API call sets `credentials: 'include'`; the Socket.io handshake uses `withCredentials`. On 401 the store resets and the app redirects to `/login`.

Data: all Zustand stores are API-backed (optimistic UI + rollback). There is **no Supabase** — the app talks only to the Fastify API at `/api`, and every route scopes its query by `organization_id` from the JWT. (`src/lib/supabaseHelpers.ts` is a legacy-named thin wrapper over the API client — kept for its `getErrorMessage` helper.)

Realtime: Socket.io from the same `api/` process; frontend subscribes to `__n0crmDbChange(table)` events for contacts, deals, activities, notifications.

---

## Modules

| Module | Key features |
|--------|-------------|
| Dashboard | KPI cards, revenue chart, deal funnel, top deals, activity heatmap, onboarding checklist, composable drag-and-drop widgets |
| Contacts | Table/grid, CSV export, duplicate detection, bulk actions, smart views, distribution lists, LinkedIn URL enrichment |
| Companies | Industry/status/size filters, domain dedup, revenue tracking |
| Deals | Kanban + list + Calendar + Timeline (Gantt) board views, multi-pipeline, stage auto-resolve, quote builder (save/export/email), deal-rotting flags + activity reminders |
| Activities | Unified feed, overdue highlighting, quick complete/delete |
| Leads | Scoring engine (configurable rules), score snapshots, events timeline |
| Automations | Rule builder (trigger/condition/action), execution log, no-code automation recipe center |
| Sequences | Email sequences with A/B variants, enrollment management, step scheduling |
| Products | Product catalog for deal line items and quotes |
| Reports | Revenue by month, Won/Lost donut, activities by type, conversion funnel, email open/click stats |
| Forecast | Weighted pipeline forecast, pipeline health score, best-bet deals |
| Inbox | Gmail OAuth, full thread sync, send/reply/compose, attachment download, thread-to-record linking |
| Calendar | Google Calendar sync, event create/edit, month/week/day view, Meet link display |
| Custom Fields | Per-entity (contact/company/deal/lead) definitions, values, multilingual labels |
| Goals | Sales targets per rep, period tracking, current progress |
| Audit Log | Org activity trail (`security_events`-backed, owner/admin gated) |
| Settings — General/Email/Data | Team management, SMTP, Google OAuth, API keys (scoped: `leads:write`, `scim`), webhooks, language (en/es/pt/fr/de/it) |
| Settings — Security | **MFA** (TOTP enroll/disable); **OIDC SSO** (SSO button shown only when provider configured, PKCE S256); **SCIM 2.0** token management; permission profiles per role (owner/admin/manager/sales_rep/viewer) |
| Settings — Integrations | Google Gmail + Contacts + Calendar OAuth cards; **Zoom** integration card; **Slack** integration card |
| Admin | Super-admin panel: org/user listing, impersonation, org-level AI kill switch, export (orgs + users) |
| Notifications | In-app feed, mark-read, bulk clear |
| Updates | Threaded activity updates, @mentions, teammate notifications on contacts/companies/deals/leads |
| Tickets | Help-desk ticket queue (status/priority/assignee, contact/company links), status-filtered view |
| Booking Links | Calendly-style meeting scheduler, public `/book/:token` page, per-user calendar availability |
| Lead Forms | Web-to-lead form builder, public `/forms/:token` capture page (honeypot + rate-limited) |
| AI Assistant | Global drawer + floating launcher (tool-using agent); inline AI actions — next-best-action on Contact/Deal detail, thread summarize + draft-reply in the Inbox |

---

## AI Assistant

The AI features activate automatically when the API has at least one provider key configured (Gemini is the free default; OpenAI and Anthropic are also supported). When no provider is available — or the org has AI disabled — every AI surface hides itself, so the UI degrades gracefully.

| Surface | What it does |
|---------|-------------|
| AI drawer (`AiAssistant`) | Mounted once in the app shell; a tool-using chat backed by `/ai/agent` with persisted conversations. An `allowWrites` toggle lets the agent create activities / move deal stages (org-scoped, audit-logged). |
| Floating launcher | A `Sparkles` button in the layout that opens the drawer (`aiStore.openAssistant`). |
| `AiInsight` button | A self-contained "run an AI action and render the result inline" control with copy / use / dismiss. Renders nothing when AI is disabled, so callers drop it in unconditionally. |
| Next-best-action | `AiInsight` on Contact detail and the Deal panel → `/ai/next-best-action`. |
| Summarize / Draft reply | Two `AiInsight` buttons in the Inbox thread view → `/ai/summarize` and `/ai/draft-reply`. |

State lives in `src/store/aiStore.ts`; all labels are fully translated across the six locales.

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
# admin@n0crm.local / Admin1234!
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

The frontend needs only two env vars (everything else — Google OAuth, AI keys, SMTP — lives on the API).

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | API base URL. Local dev: `http://localhost:3001`. Docker: omit (nginx proxies `/api/*`) |
| `VITE_APP_CHANNEL` | `development` | Build channel — `production` or `staging` for deployed builds |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite |
| Styling | Tailwind CSS 3 (dark theme) |
| Routing | React Router v6 |
| State | Zustand 5 — all stores backed by n0crm-api |
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
│   ├── ai/           # AiAssistant (drawer), AiInsight (inline action)
│   └── shared/       # SearchBar, EmptyState, SmartViewBar, EntityListsToolbar
├── pages/            # Route containers
├── store/            # Zustand stores (API-backed, optimistic) — incl. aiStore
├── types/            # TypeScript interfaces
├── hooks/            # useLocalStorage, useSearch, useFilters
├── lib/              # api.ts (cookie-auth fetch client), supabaseHelpers (legacy wrapper), schemas
├── i18n/             # en/es/pt/fr/de/it translation catalogs
└── utils/            # formatters, constants, lead scoring, health engine
```

---

## Auth Flow

The JWT lives in an HttpOnly `auth_token` cookie set by the API — the SPA never touches the raw token; the browser sends it automatically because every request uses `credentials: 'include'`.

| Step | What happens |
|------|-------------|
| Login | `POST /auth/login` → API sets the HttpOnly `auth_token` cookie (`sub/org/role/jti`) |
| MFA challenge | If MFA is enrolled, login returns `mfa_required: true`; the Login page prompts for a 6-digit TOTP code → `POST /auth/mfa/verify` |
| OIDC SSO | SSO button (gated by `GET /auth/sso/status`) → `POST /auth/sso/start` (PKCE S256) → `GET /auth/sso/callback` → cookie issued (JIT provisioning) |
| Register | `POST /auth/register` → cookie with `org: null` → redirect `/org-setup` |
| Org setup | `POST /orgs` → API re-issues the cookie with the `org` claim |
| Invite accept | `GET + POST /invitations/:token` → cookie issued |
| Session restore | On load: `GET /auth/me` (cookie sent automatically) → hydrate store |
| 401 | reset stores + redirect `/login` (no client-side token to clear) |
| Logout | `POST /auth/logout` (revokes `jti` in Redis, clears the cookie) + reset stores |
| Password reset | `POST /auth/forgot-password` → DB token (1h TTL) → `POST /auth/reset-password` |

---

## Quality Gates

The CI `ci` job (`.gitea/workflows/ci.yml`) runs these in order — run them before pushing. Current counts: **273 frontend tests** and **105 API tests** (0 audit vulnerabilities).

```bash
npm run ui:lint          # design token / color guardrails
npm run i18n:lint        # no bare user-facing strings in error handling
npm run i18n:coverage    # all locales match en key paths
npm run lint:ci          # ESLint on src/ (lint policy: 0 new warnings)
npx tsc --noEmit         # strict type check
npm run test:run         # Vitest
npm run build            # production build
npm run bundle:check     # bundle budget — largest gzip JS chunk ≤ 250 KB
```

The same workflow also has a dedicated **`api` job** (the backend now has its own gate: `tsc` → `eslint` → `vitest` → `build` → `npm audit`) and a **`security`** job (`npm audit --audit-level=critical`).

## Scripts

```bash
npm run dev              # Vite dev server
npm run build            # Production build → dist/
npm run build:analyze    # Build + bundle stats in dist/stats.html
npm run bundle:check     # Enforce gzip bundle budget
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

*Last updated: 2026-06-11*
