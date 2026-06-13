# Codebase overview

Internal technical reference for the n0CRM monorepo. Covers architecture,
directory layout, backend surface, and frontend structure at a high level.

For a full file-by-file structural map see **`../../docs/CODEBASE-MAP.md`**.

---

## Architecture

n0CRM is a self-hosted monorepo: a Fastify 5 / Node 22 API (`api/`) and a
React 18 SPA (`frontend/`) sharing a PostgreSQL 16 database and a Redis 7
cache. There is no Supabase runtime dependency — all data, auth, and
real-time traffic flows through `n0crm-api`.

**Overall data flow:**

```
Browser (React 18 SPA)
  │  REST / JSON  (VITE_API_URL → api:3001)
  │  Socket.io    (org-scoped rooms, Redis-backed db:change broadcast)
  ▼
Fastify 5 API  (api/)
  │  postgres.js (transform: postgres.camel) + PgBouncer (transaction pooling)
  │  ioredis
  ▼
PostgreSQL 16 / Redis 7
```

Key characteristics:

- All mutations go through `frontend/src/lib/api.ts`; no client-side SQL.
- Auth: HS256 JWT (`{ sub, org, role, jti }`). `GET /auth/me` restores session
  on mount; `isLoadingAuth` prevents login flash.
- Route-level protection: `ProtectedRoute` + `RequirePermission` gate components.
- Real-time: Socket.io events → `window.__n0crmDbChange(table)` global →
  affected stores refetch.
- i18n: localised UI strings live in `src/i18n/`; catalogs are not mirrored
  in Markdown.
- RBAC: server-side `requirePermission` / `requireCrudPermission` enforced
  across all CRM CRUD, member, API-key, and webhook management routes.
  Roles: `owner`, `admin`, `manager`, `sales_rep`, `viewer`.
- Tenant isolation: application-layer `WHERE organization_id = $org` is the
  authoritative control; PostgreSQL RLS is opt-in defense-in-depth (see
  `docs/adr/0001-tenant-isolation-and-rls.md`).

---

## Monorepo layout

```
n0CRM/
├── frontend/                   # React 18 SPA (this tree)
│   ├── .planning/              # Planning docs (including this file)
│   ├── public/                 # Static assets served by Vite as-is
│   ├── src/
│   │   ├── components/         # Domain + shared + UI components (see below)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── i18n/               # Translation catalogs and language store
│   │   ├── lib/                # Client utilities: api.ts, realtime, sentry, etc.
│   │   ├── pages/              # One file/subdir per route (route containers)
│   │   ├── services/           # Stateless integration adapters
│   │   ├── store/              # Zustand domain stores
│   │   ├── types/              # TypeScript interfaces and union types
│   │   ├── utils/              # Pure helpers and constants
│   │   ├── App.tsx             # Router definition, app-level effects
│   │   ├── main.tsx            # React DOM entry point
│   │   └── index.css           # Tailwind CSS global entry
│   ├── index.html
│   └── package.json
│
├── api/                        # Fastify 5 backend (Node.js 22)
│   ├── migrations/             # Sequential PostgreSQL schema migrations (001–020)
│   ├── src/
│   │   ├── config/env.ts       # Env validation (zod)
│   │   ├── db/                 # postgres.js client + ioredis client
│   │   ├── middleware/         # auth.ts, rbac.ts
│   │   ├── routes/             # One file per feature area (see below)
│   │   ├── services/           # Business logic + external integrations
│   │   ├── types/              # Shared TS types
│   │   └── workers/            # sequenceRunner.ts (60 s polling)
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml          # Postgres 16, PgBouncer, Redis 7, api, nginx/SPA
├── docs/
│   ├── CODEBASE-MAP.md         # Authoritative file-by-file structural map
│   ├── adr/                    # Architecture decision records
│   ├── sso-and-scim.md         # OIDC SSO + SCIM operator guide
│   └── disaster-recovery.md    # Restore runbook
└── .gitea/
    └── workflows/
        ├── ci.yml              # Canonical CI pipeline (type-check + tests)
        ├── build-production.yml
        └── build-api.yml
```

---

## Backend surface (`api/src/`)

### Routes (`api/src/routes/`)

| File | Area |
|---|---|
| `auth.ts` | Login, register, password reset, MFA (TOTP), OIDC SSO |
| `scim.ts` | SCIM 2.0 Users CRUD + ServiceProviderConfig |
| `contacts.ts` | Contacts CRUD |
| `companies.ts` | Companies CRUD |
| `deals.ts` | Deals CRUD |
| `leads.ts` | Leads CRUD |
| `activities.ts` | Activities CRUD |
| `publicApi.ts` | `POST /api/public/v1/leads` (x-api-key, scope `leads:write`) |
| `apiKeys.ts` | API key management; scope selector |
| `gmail.ts` | `POST /gmail/oauth-start`, `POST /gmail/oauth-exchange`, thread sync |
| `email.ts` | SMTP-based send, templates |
| `sequences.ts` | Email sequences + wait steps |
| `automations.ts` | Workflow automations |
| `webhooks.ts` / `webhookSubscriptions.ts` | Outgoing webhook delivery |
| `ai.ts` | AI agent, conversations, next-best-action, inbox summarize/draft |
| `dataPrivacy.ts` | GDPR Art.15 export, Art.17 erasure/anonymize, Art.20 org export |
| `audit.ts` | Security-event audit log |
| `sso.ts` | OIDC SSO status · start · callback (PKCE S256, JWKS RS256, JIT) |
| `orgs.ts` | Org settings, member lifecycle (`PATCH …/members/:id/role·status`) |
| `pipelines.ts` | Pipeline configuration |
| `analytics.ts` · `goals.ts` · `billing.ts` | Analytics, sales goals, billing |
| `health.ts` | `/health`, `/health/ready`, `/health/live` |
| `internal.ts` | `/metrics` (Prometheus, loopback / internal-key gated) |
| `admin.ts` · `debug.ts` | Super-admin and debug endpoints |
| Other | `calendar`, `products`, `customFields`, `slack`, `zoom`, `smtp`, `invitations`, `notifications`, `userPreferences`, `views`, `distributionLists`, `emailTracking`, `uxMetrics` |

### Services (`api/src/services/`)

| File / dir | Responsibility |
|---|---|
| `ai/providers.ts` | Multi-provider AI client (Gemini default / OpenAI / Anthropic) |
| `ai/agent.ts` | Tool-using CRM agent loop |
| `ai/tools.ts` | CRM tool definitions for the agent |
| `ai/retention.ts` | `AI_MESSAGE_RETENTION_DAYS` purge job |
| `permissions.ts` | `requirePermission` / `requireCrudPermission` RBAC helpers |
| `oidc.ts` | OIDC discovery, JWKS fetch, token verification |
| `totp.ts` | TOTP secret gen, AES-256-GCM encrypt/decrypt, RFC 6238 verify |
| `securityEvents.ts` | `recordSecurityEvent` → `security_events` table |
| `observability.ts` | `x-request-id` correlation, `captureException`, Sentry wiring |
| `realtime.ts` | Socket.io org-scoped room broadcast via Redis |
| `email.ts` | SMTP send abstraction |
| `tokenCipher.ts` | AES-256-GCM token encryption (Gmail refresh tokens, etc.) |
| `ssrfGuard.ts` | SSRF mitigation for outgoing HTTP |
| `cookieAuth.ts` | Secure cookie helpers |
| `metrics.ts` | Prometheus metric registration |

### Migrations (`api/migrations/`)

20 sequential SQL files (001–020). Selected highlights:

- `001_schema.sql` — base schema (all core tables)
- `010_webhooks.sql` — webhook_outbox, webhook_subscriptions
- `013_org_branding_billing.sql` — org branding + billing fields
- `018_ai.sql` — ai_conversations, ai_messages, org AI settings
- `019_mfa.sql` — MFA TOTP secrets (AES-256-GCM encrypted)
- `020_security_events.sql` — security_events audit table

### Workers (`api/src/workers/`)

`sequenceRunner.ts` — a 60-second polling loop that advances email sequences
and wait steps via a `current_step` index. Scope is limited to those step
types; it does not resolve flow_definition graphs, A/B variants,
call/LinkedIn tasks, or expose Prometheus metrics.

---

## Frontend surface (`frontend/src/`)

### Stores (`src/store/`)

One Zustand store per domain. All mutations go through `src/lib/api.ts` REST
calls to n0crm-api; optimistic updates where implemented.

`activitiesStore`, `aiStore`, `attachmentsStore`, `auditStore`, `authStore`,
`automationsStore`, `companiesStore`, `contactsStore`, `customFieldsStore`,
`dealsStore`, `distributionListsStore`, `emailStore`, `goalsStore`,
`leadsStore`, `navigationPrefsStore`, `notificationsStore`, `onboardingStore`,
`pipelinesStore`, `productsStore`, `sequencesStore`, `settingsStore`,
`templateStore`, `toastStore`, `viewsStore`

### Pages (`src/pages/`)

Route containers composing stores + domain components.

| Page | Route area |
|---|---|
| `Login`, `Register`, `ForgotPassword`, `ResetPassword`, `AcceptInvite` | Auth |
| `GmailCallback.tsx` | `{origin}/auth/gmail/callback` — postMessages to opener |
| `Dashboard`, `ManagerDashboard`, `Forecast`, `Reports`, `SalesGoals` | Analytics & reporting |
| `Contacts`, `ContactDetail`, `Companies`, `CompanyDetail` | CRM core |
| `Deals` (subdir: kanban, list, filters, toolbar, quote builder) | Deals |
| `Leads` | Lead capture |
| `Activities`, `Calendar`, `FollowUps` | Activity management |
| `Inbox` (subdir: thread list, reading pane, thread view, local email) | Gmail inbox |
| `Sequences`, `EmailTemplates`, `Automations` | Sequences + email |
| `Products` | Product catalog |
| `Notifications` | Notification centre |
| `Settings` (subdir: general, pipeline, email, branding, advanced, data, permissions, onboarding, navigation) | Org settings |
| `SettingsIntegrations` | API keys + scope selector |
| `TeamManagement` | Member lifecycle |
| `AuditLog` | Security-event audit log viewer |
| `Admin` | Super-admin panel |
| `Landing`, `OrgSetup`, `OrgAccessRequired`, `UserProfile` | Onboarding + profile |
| `PipelineTimeline` | Timeline view |

### Components (`src/components/`)

Subdirectory per domain:

`activities`, `ai` (AiAssistant, AiInsight), `auth`, `brand`, `companies`,
`contacts`, `deals`, `email`, `import`, `integrations`,
`layout` (Sidebar, Topbar, Layout, ErrorBoundary, CommandPalette, EnvironmentBanner),
`settings` (MFA, SSO/SCIM, integrations, webhooks, SMTP, pipelines panels),
`shared`, `ui` (design-system primitives), `workflows`

### Services (`src/services/`)

Stateless integration adapters:

- `googleIntegrationService.ts` — Google OAuth popup orchestration
- `gmailService.ts` — Gmail thread fetch, sync
- `gmailTokenRefresh.ts` — Access token refresh via `POST /gmail/oauth-exchange`
- `calendarService.ts` — Calendar event operations
- `emailProviders/` — SMTP provider adapters

### Lib (`src/lib/`)

`api.ts` (typed fetch wrapper, VITE_API_URL), `realtimeSubscriptions.ts`
(Socket.io org room wiring → `__n0crmDbChange`), `sentry.ts`, `traceFetch.ts`,
`routePreload.ts`, `uxMetrics.ts`, `emailTracking.ts`, `entityListFilters.ts`,
`workflowTemplateCatalog.ts`, schema validators, theming helpers.

### Hooks (`src/hooks/`)

`useDataInit`, `useDateLocale`, `useGoogleOAuthPopup`, `useLocalStorage`,
`usePresence`, `useSearch`

---

## Technology stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5.9 |
| Backend runtime | Node.js 22 |
| Backend framework | Fastify 5 |
| Database | PostgreSQL 16 via postgres.js (`transform: postgres.camel`), PgBouncer (transaction pooling) |
| Cache / pub-sub | Redis 7 (ioredis) |
| Real-time | Socket.io 4 (org-scoped rooms, Redis adapter) |
| Frontend framework | React 18 + React Router |
| Build tool | Vite |
| State management | Zustand |
| Styling | Tailwind CSS + Lucide icons |
| Forms / validation | React Hook Form + Zod |
| Testing | Vitest + jsdom + Testing Library |
| Observability | x-request-id correlation, Sentry (optional `SENTRY_DSN`), Prometheus + Grafana |
| Package manager | npm (lockfile present) |

Test counts (from vitest run): API = **105 tests** across **16 files**;
frontend = **273 tests** across **44 files**. `npm audit` = **0 vulnerabilities**.

---

## Core flows

### Auth + org scope

1. `POST /auth/login` → HS256 JWT `{ sub, org, role, jti }`.
2. `GET /auth/me` on mount restores session.
3. Every API route scopes queries `WHERE organization_id = $org`.
4. MFA: optional TOTP second factor; setup via `POST /auth/mfa/setup·enable·disable`; login prompt on next `POST /auth/login` once enrolled.
5. OIDC SSO: `GET /auth/sso/status` gates frontend SSO button; PKCE S256 flow; JIT user provisioning; `OIDC_DEFAULT_ROLE` env.

### CRM CRUD

1. UI dispatches store action.
2. Store optimistically updates local state.
3. `api.post/patch/delete` persists to n0crm-api.
4. Socket.io `__n0crmDbChange` broadcasts table changes to other connected clients.

### Gmail

1. User connects via Google OAuth popup (`useGoogleOAuthPopup`).
2. Code exchanged via `POST /gmail/oauth-exchange`; refresh token stored AES-256-GCM encrypted in `gmail_tokens`.
3. Short-lived access tokens used client-side; inbox loads/syncs via `GET /gmail/threads`.
4. Thread links persisted in `gmail_thread_links`. Callback is frontend route `{origin}/auth/gmail/callback` (`GmailCallback.tsx`), which postMessages to the opener.

### Public API

`POST /api/public/v1/leads` authenticated by header `x-api-key: <key>` (key
prefix `n0crm_`, minted in Settings > Integrations with optional scopes).
Requires scope `leads:write`; returns 403 `{error:"Insufficient API key scope", required:"leads:write"}` otherwise.

---

## Coding conventions

### Naming patterns

- Components: PascalCase `.tsx`
- Stores: camelCase `*Store.ts`
- Hooks: `useXxx`
- Utilities: camelCase
- Constants: `SCREAMING_SNAKE_CASE`
- Types/interfaces: PascalCase

### TypeScript configuration

- Strict mode enabled
- Module resolution: `bundler`
- Path alias `@/*` configured; relative imports dominate in practice

### UI/layout conventions

- Canonical reference: `docs/master-design-ui.md`
- Page layout class: `crm-page` / `crm-page-full`
- Lucide icon sizes: prefer **13 · 14 · 16 · 18 · 22**

---

## Testing and quality gates

- Vitest + jsdom + Testing Library
- Source of truth: `npm run test:run`
- Release / merge gates: `npm run test:run` + `npm run build` must both pass
- CI: `.gitea/workflows/ci.yml` (Gitea is the authoritative remote)

---

## Cross-cutting concerns

- **Security:** No browser-side refresh token storage. API keys are hash-only
  server-side; scopes enforced via `requirePermission`.
- **RBAC:** `requirePermission` / `requireCrudPermission` across all CRM,
  member, API-key, and webhook routes. Roles: `owner`, `admin`, `manager`,
  `sales_rep`, `viewer`.
- **GDPR:** `/privacy` endpoints cover org export (Art. 20), subject export
  (Art. 15), erasure / anonymize (Art. 17); owner/admin gated.
- **Observability:** `x-request-id` correlation, `captureException`, `/health`
  liveness/readiness probes, `/metrics` (Prometheus, internal-key gated).
- **AI governance:** per-org kill switch (`settings.ai.enabled`),
  `AI_MONTHLY_TOKEN_CAP`, `AI_MESSAGE_RETENTION_DAYS` purge, multi-provider
  (Gemini free default / OpenAI / Anthropic).
- **Accessibility:** icon-only controls require `aria-label` / `title`.

---

## Document control

- **Status:** Active
- **Owner:** Engineering
- **Last updated:** 2026-06-11
- **Authoritative file map:** `../../docs/CODEBASE-MAP.md`
