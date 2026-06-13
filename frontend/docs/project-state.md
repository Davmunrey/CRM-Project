# Project state: two layers of truth

This file **bridges** the long-form product/engineering docs in `docs/master-*.md` and the **milestone tracker** under [`.planning/`](../.planning/) (phases, `DEPLOY-*` requirements, `STATE.md`).

## When to read what

| Need | Primary source | Notes |
|------|----------------|--------|
| **Who owns each open `[ ]` cluster** (code vs ops vs legal vs evidence) | [Checkbox ownership matrix](#checkbox-ownership) (this file) | Matrix for masters, REQUIREMENTS, and phase validations. |
| v1.0 phase completion, next phase gate, session notes | [`.planning/STATE.md`](../.planning/STATE.md), [`.planning/ROADMAP.md`](../.planning/ROADMAP.md) | Engineering milestone view (Phases 1–10). |
| Checked requirements IDs (`AUTH-*`, `DEPLOY-*`, …) | [`.planning/REQUIREMENTS.md`](../.planning/REQUIREMENTS.md) | Single checklist for v1 scope. |
| **Pro** roadmap (30/60/90), execution backlog, GTM matrix | [`master-roadmap-backlog.md`](./master-roadmap-backlog.md) | Product horizon beyond the v1 phase list. |
| Pipedrive parity, webhooks/API spec, group killer gaps | [`master-pipedrive-velo-comparison.md`](./master-pipedrive-velo-comparison.md) | Benchmark + v1 webhook acceptance criteria + interview template. |
| What shipped, in narrative form (Parts A + B) | [`master-implementation-history.md`](./master-implementation-history.md) | Archive-stable Part A; active Part B (sections 13–35). |
| Go-live, QA matrices, production handoff | [`master-release-qa.md`](./master-release-qa.md) | Especially [Production handoff checklist](master-release-qa.md#production-handoff-checklist). |
| Auth/SSO contracts, evidence index, production hardening checklist | [`master-security-compliance.md`](./master-security-compliance.md) | Includes OAuth redirect / CORS reminders; AI governance + security controls. |
| Lead maintenance jobs, retention, ops | [`master-lead-management.md`](./master-lead-management.md) | Lead-score maintenance runs in the `api/` background queue; runbooks. |
| Resend/DNS, mailbox privacy, email smoke | [`master-email-operations.md`](./master-email-operations.md) | Deliverability + release gates for mail. |
| Layout shells, navigation, profile display names | [`master-design-ui.md`](./master-design-ui.md) | UI conventions for new screens. |

**Rule of thumb:** if the question is *“is v1 Phase 10 done?”* start in **`.planning/`**. If it is *“what do we build next for Pro?”* start in **`master-roadmap-backlog`**.

---

## v1 release / hosting (vendor-neutral)

`.planning/REQUIREMENTS.md` still lists `DEPLOY-01`–`DEPLOY-05` with example filenames from one host; the **intent** is:

1. **SPA routing** — every client-side route must resolve to the built `index.html` on cold load (configure the static host or reverse proxy accordingly). **Repo examples:** [`vercel.json`](../vercel.json), [`public/_redirects`](../public/_redirects) — explained in [`docs/deployment-spa-and-env.md`](./deployment-spa-and-env.md).
2. **Build-time env** — `VITE_APP_CHANNEL` when set is **`production`** or **`staging`** (otherwise inferred from Vite `MODE`; local dev → `development`); `VITE_API_URL` points to n0crm-api. See [`src/lib/envChannel.ts`](../src/lib/envChannel.ts) and [`vite.config.ts`](../vite.config.ts). Canonical copy: [`docs/deployment-spa-and-env.md`](./deployment-spa-and-env.md) and [`.env.example`](../.env.example).
3. **Preview ↔ API** — set **`VITE_APP_CHANNEL=staging`** on preview builds and point `VITE_API_URL` at a staging n0crm-api instance; set the API's **`CORS_ORIGIN`** (comma-separated exact origins) so the Fastify CORS guard matches those preview/prod origins (see [`deployment-spa-and-env.md`](./deployment-spa-and-env.md) · [`master-security-compliance.md`](./master-security-compliance.md#external-hardening-checklist)).
4. **Production pipeline** — deploy from protected `main` (or your release branch) with a recorded smoke pass — [`docs/smoke-checklist-production.md`](./smoke-checklist-production.md).
5. **Custom domain + TLS** — DNS and certificate as required by your provider.

**Google (Gmail/Calendar) operator setup + verification:** [`docs/google-gmail-oauth-verification.md`](./google-gmail-oauth-verification.md#operator-setup-google-oauth).

Operational detail for env vars and schedulers overlaps [`master-release-qa.md` — Production handoff](./master-release-qa.md#production-handoff-checklist).

---

## System context (high level)

```mermaid
flowchart LR
  Browser[Browser / SPA]
  Nginx[nginx / SPA host]
  API[api/ - Fastify]
  PgBouncer[PgBouncer]
  Postgres[PostgreSQL 16]
  Redis[Redis]
  AI[AI providers - Gemini / OpenAI / Anthropic]
  Browser --> Nginx
  Nginx -->|/api/*| API
  API --> PgBouncer
  PgBouncer --> Postgres
  API --> Redis
  API -.optional.-> AI
```

- **Frontend:** `frontend/` — React 18 + Vite + React Router + Zustand + Tailwind; hosted as a static SPA (rewrites to `index.html`). Talks **only** to the Fastify API at `/api` with HttpOnly-cookie JWT auth. nginx proxies `/api/*` to the API in Docker. **Supabase has been fully removed** — there is no `@supabase/supabase-js`, no `frontend/supabase/` tree, and no Supabase env. (`src/lib/supabaseHelpers.ts` is a legacy-named thin wrapper over the API client and is still in use — that is fine.)
- **Backend:** `api/` — Fastify 5, Node.js 22, PostgreSQL 16 via `postgres.js` (through PgBouncer), Redis 7, Socket.io realtime. (BullMQ is declared but **not yet** wired to a real job queue — background work runs on in-process pollers, e.g. the sequence runner; see Enterprise gaps.)
- **AI / agentic layer:** `api/src/services/ai/*` — multi-provider (Google **Gemini = free default**, OpenAI, Anthropic) behind routes under `/ai`: `status`, `summarize`, `draft-reply`, `next-best-action`, `search`, and a tool-using `agent` with persisted conversations. The agent calls org-scoped CRM tools (search/get contacts, companies, deals; `create_activity`, `update_deal_stage`) gated by `allowWrites` and audit-logged. Migration `018_ai.sql` adds `ai_conversations` / `ai_messages` / `ai_usage_log`. Activates when **any** provider key is set; degrades gracefully (UI hides AI) otherwise.
- **Auth:** HS256 JWT (`sub/org/role/jti` claims), `@fastify/jwt`, delivered as an HttpOnly cookie. `isLoadingAuth` starts `true` — prevents /login flash on cold load. All org-scoped routes check `req.user.org`.
- **Monorepo:** root contains `docker-compose.yml` (orchestrates postgres, pgbouncer, redis, api, web) and `privateprompt-app.json` (full-stack deployment manifest).

---

## Key decisions (rolled up; Jun 2026)

- **AI assistant (shipped):** multi-provider AI in `api/src/services/ai/*` (Gemini free default, OpenAI, Anthropic) behind `/ai` routes. Frontend: a global AI Assistant drawer + floating launcher, `AiInsight` buttons (next-best-action on Contact/Deal detail; summarize + draft reply in the Inbox), `aiStore`, full i18n across all 6 locales. Gated by provider keys.
- **AI governance (shipped):** per-org kill switch (`organizations.settings.ai.enabled=false`), monthly output-token spend cap (`AI_MONTHLY_TOKEN_CAP` env + per-org `settings.ai.monthlyTokenCap`; returns 429 when exceeded), and retention purge of `ai_*` data (`AI_MESSAGE_RETENTION_DAYS`, `0` = keep).
- **Observability (browser):** Sentry initializes when `VITE_SENTRY_DSN` is set; UI error boundary captures exceptions (`src/lib/sentry.ts`). Backend observability is shipped — `x-request-id` correlation, `captureException` / optional `SENTRY_DSN`, `/health` · `/health/ready` · `/health/live`, and `/metrics` + Prometheus/Grafana (see Production hardening and the Enterprise readiness section).
- **MFA (shipped):** TOTP (RFC 6238) end-to-end. Backend routes `POST /auth/mfa/setup·enable·disable` (AES-256-GCM secret at rest; migration `019_mfa.sql`); enrollment UI in Settings → Security (`src/components/settings/SettingsMfaPanel.tsx`); login prompts for a code when MFA is enabled (`src/pages/Login.tsx`).
- **SSO / SCIM (shipped):** OIDC SSO (`/auth/sso` status·start·callback; PKCE S256, JWKS RS256 verify, JIT provisioning, `OIDC_DEFAULT_ROLE`; the SSO button in `src/pages/Login.tsx` is gated by `/auth/sso/status`). SCIM 2.0 user provisioning (`/scim/v2` Users CRUD + ServiceProviderConfig; Bearer api-key scoped `scim`; soft-deprovision + session revoke, last-active-owner protected, audit-logged). Setup: [`docs/sso-and-scim.md`](../../docs/sso-and-scim.md). SAML federation remains roadmap.
- **GDPR data-subject requests (shipped):** `/privacy` routes — full org export (Art. 20), single-subject export (Art. 15), and subject erasure/anonymize (Art. 17); owner/admin gated (`api/src/routes/dataPrivacy.ts`).
- **Security-event audit log (shipped):** `security_events` table + `recordSecurityEvent` (migration `020_security_events.sql`) records auth/SSO/admin-sensitive events.
- **Soft delete + retention:** core tables carry `deleted_at`; retention/purge work (including AI data) runs in the `api/` background processing path.
- **Outbound webhooks:** stored in `webhook_subscriptions` table; deliveries are outboxed in `webhook_events` with max retry limit before reaching terminal state.
- **Public API + key scopes (shipped):** lead-capture endpoint `POST /api/public/v1/leads`, authenticated by an `x-api-key: <key>` header (key prefix `n0crm_`, minted in Settings → Integrations) and requiring the `leads:write` scope (`403 {error:"Insufficient API key scope", required:"leads:write"}` otherwise). The Settings → Integrations UI shows per-key scopes (`leads:write`, `scim`) via a scope selector. See `api/README.md` and `docs/public-api-phase1.md`.
- **Org roles / RBAC (server-side enforced):** roles `owner / admin / manager / sales_rep / viewer` (`api/src/services/permissions.ts`). `requirePermission` / `requireCrudPermission` (`api/src/middleware/rbac.ts`) gate CRM CRUD and member / API-key / webhook management server-side — the granular permission set is enforced in the API, not just surfaced in the UI. Member lifecycle: `PATCH /orgs/me/members/:userId/role·status` with safety rules (e.g. last-active-owner protection).
- **Email:** SMTP credentials encrypted at rest (AES-256-GCM); Resend integration optional. All sends routed through `api/` for security.

<a id="gaps-not-fully-owned-by-a-single-master-today"></a>
## Gaps (not fully owned by a single master today)

Track these explicitly until each is either implemented or moved into the right master.

| Gap | Why it matters | Where to track / fix |
|-----|----------------|----------------------|
| **Google Cloud: restricted-scope verification** (Gmail APIs for production users) | Long lead time (weeks); blocks trustworthy Gmail outside test users. **Incremental OAuth (Gmail then Calendar)** is implemented in `api/` routes; remaining work is mostly **Console + verification + product features** that use Calendar after scopes are granted. **Infrastructure stable as of 2026-04-29:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` configured in `api/.env`; OAuth flow fully routed through `api/src/routes/gmail.ts` and `api/src/routes/calendar.ts`. | [`.planning/STATE.md`](../.planning/STATE.md) Notes; operator + engineering backlog: [`google-gmail-oauth-verification.md` — Outstanding work](./google-gmail-oauth-verification.md#outstanding-google-integration); redirect URIs per environment; align Google Cloud OAuth client secrets + API routes. |
| **Org-wide member identity in UI** (email/name for peers) | Team pages and assignee pickers need an RLS-safe source beyond `organization_members` alone | **Shipped:** RPC `list_organization_members_with_identity` (migration `20260415120000_*`) + [`authStore.fetchOrgUsers`](../src/store/authStore.ts). Planning context: [`.planning/CODEBASE.md` (Concerns)](../.planning/CODEBASE.md#codebase-concerns). UX: [`master-design-ui.md` — User profile](./master-design-ui.md#user-profile-display-names). |
| **Email open/click “truth” for analytics** | Server path: `api/` `POST /email-tracking/*` → `email_tracking_events` table. **Reports** surfaces server counts for the signed-in user; org-wide manager rollups via aggregation queries. | [`master-implementation-history.md`](./master-implementation-history.md) Part B §15–17; Reports UI + [`master-email-operations.md`](./master-email-operations.md). |
| **Monorepo adoption documentation** | Migrated from separate `velo-crm` and `n0crm-api` repos to single monorepo on 2026-05-18. Paths, references, and deployment docs updated. | [`../README.md`](../README.md) · [`../api/README.md`](../api/README.md) · [`./deployment-spa-and-env.md`](./deployment-spa-and-env.md) · [`docker-compose.yml`](../docker-compose.yml). |
| **Pipedrive / group integration parity** (outbound webhooks shipped; public REST phase 1 + Settings UI completion in flight) | Outbound webhooks + replay in `api/webhook_subscriptions` tables; public API keys / read API / lead capture via `/public/v1/leads` and `/integrations/` routes — see [`public-api-phase1.md`](./public-api-phase1.md), [`lead-capture-public-endpoint.md`](./lead-capture-public-endpoint.md), [`master-pipedrive-velo-comparison.md`](./master-pipedrive-velo-comparison.md), [`api/README.md`](../../api/README.md). |
| **Open checklists without a clear owner** | Same `[ ]` interpreted as “dev debt” when it is ops or legal | **Matrix:** [Checkbox ownership](#checkbox-ownership) (below) |

---

<a id="checkbox-ownership"></a>
## Checkbox ownership matrix

This section maps **unchecked `- [ ]` clusters** across `docs/master-*.md`, `.planning/ROADMAP.md` (phase “Done when”), and `.planning/REQUIREMENTS.md` to **who closes them** and **what kind of work** is required (code, dashboard, evidence, or legal). Use it so engineering does not chase ops-only rows, and ops does not wait on code for human evidence.

| Cluster / document | Typical IDs or rows | Owner | Close requires |
|--------------------|---------------------|-------|----------------|
| `.planning/REQUIREMENTS.md` — `AUTH-*`, `SEC-*`, product features | Auth flows, RLS, UI gates | Engineering | Code + tests; auth settings live in `api/` env + migrations (no external Auth dashboard) |
| `.planning/REQUIREMENTS.md` — `DEPLOY-01`–`DEPLOY-05` | Static host, SPA rewrites, TLS, preview vs prod | Ops + Engineering | **Evidence** (host, channel, API endpoint, smoke result, commit) pasted per REQUIREMENTS template; not `[x]` without human sign-off |
| `docs/smoke-checklist-production.md` | Post-deploy smoke | Ops / release | **Manual run** + note in STATE or release ticket |
| `docs/master-release-qa.md` — Production handoff | Go/no-go matrices | PM + Ops + Eng | Mixed: code fixes vs **human QA** sign-off |
| `docs/master-security-compliance.md` | DSAR, SOC mapping, buyer checklist | Security / Legal + Ops | **Runbooks + evidence**; many rows are not repo code |
| `docs/master-email-operations.md` | DNS, Resend, deliverability | Ops | **Dashboard + DNS**; link evidence in masters when done |
| `docs/google-gmail-oauth-verification.md` | Google Cloud verification | Product + Ops + Eng | **Google Cloud / OAuth** console work + app updates |
| `.planning/ROADMAP.md` — “Done when” blocks | Manual SQL / verification expectations | Engineering + DBA | One-time **verify** then tick or mark **archived / not blocking** |
| `docs/master-roadmap-backlog.md` | SSO, webhooks v1, DSR, enterprise | Product | **Roadmap slices**; do not flatten into one sprint |

### FR / DE / IT locales

The app ships **EN** (source), **ES**, and **PT** with full catalogs. **FR, DE, IT** (when present) intentionally **spread English** keys until native strings are added: parity is enforced by `npm run i18n:lint` on changed files; do not block releases on FR/DE/IT native copy unless product prioritizes those locales.

### Related links

- Deploy intent (vendor-neutral): [`deployment-spa-and-env.md`](./deployment-spa-and-env.md)
- Milestones: [`.planning/ROADMAP.md`](../.planning/ROADMAP.md) · [`.planning/STATE.md`](../.planning/STATE.md) · [`.planning/REQUIREMENTS.md`](../.planning/REQUIREMENTS.md)
- **Internal security audit snapshots** (optional, **gitignored** — do not publish): filename pattern `docs/security-audit-*.md` (see `.gitignore`). Latest example generated in-repo: `docs/security-audit-2026-04.md` — keep on disk for operators or store outside git if policy requires.

---

## Codebase map (for doc authors)

- App entry, lazy routes, and Suspense: `src/App.tsx`.
- Data bootstrap, visibility-aware polling, and realtime: `src/hooks/useDataInit.ts`, `src/lib/realtimeSubscriptions.ts`.
- `date-fns` locale loading: `src/lib/dateFnsLocale.ts`, `src/hooks/useDateLocale.ts`.
- Chart theming (CSS variables → Recharts): `src/lib/chartTheme.ts`.
- Deploy channel: `src/lib/envChannel.ts`. API client: `src/lib/api.ts`; `src/lib/supabaseHelpers.ts` is a legacy-named thin wrapper over the API client (no Supabase — the file `src/lib/supabase.ts` was removed with the migration).
- AI assistant UI: `src/store/aiStore.ts`, the global Assistant drawer + floating launcher, and `AiInsight` buttons on Contact/Deal detail and the Inbox.
- Build splitting: `vite.config.ts` (`manualChunks` for heavy chart/date libraries).
- Planning artifacts: `.planning/PROJECT.md`, `.planning/CODEBASE.md` (structure + conventions; UI canon points at `master-design-ui`).
- Automations: `src/pages/Automations.tsx`, `src/store/automationsStore.ts`, canonical English seed rules `src/i18n/seed/automationSeedRulesEn.ts` (runtime labels via `getTranslations()`).
- Entity lists (saved filters + distribution lists): `src/components/shared/EntityListsToolbar.tsx`, `src/store/distributionListsStore.ts`, merge helpers `src/lib/entityListFilters.ts`; `SmartViewBar` + `viewsStore` on Contacts, Companies, Deals.
- Company duplicate detection: `findDuplicateCompanies` in `src/utils/duplicateDetection.ts`.
- Lead UI delete: `src/store/leadsStore.ts` `deleteLead` calls n0crm-api and refetches on failure (see [`master-implementation-history.md` §25](./master-implementation-history.md#implementation-history-section-25)).
- Dead-code drift: `npm run audit:unused` (Knip) — `knip.json`.

---

## Production hardening (2026-05-25)

Major infrastructure and database layer hardening for 500-tenant scale:

### Infrastructure
- **PgBouncer**: Transaction pool mode, 25 server connections, 500 max clients. API connects via `pgbouncer:6432` (not directly to postgres).
- **Prometheus + Grafana**: Scrapes API metrics (`/metrics`), postgres-exporter, and node-exporter every 15s. Auto-provisioned Prometheus datasource in Grafana.
- **Backup automation**: `pg_dump` every 6h with gzip compression; 7-day retention in `./backups/`.
- **Health checks**: All Docker services (30s interval, 10s timeout, 3 retries).
- **Resource limits**: CPU and memory limits on all services (postgres 2g/2cpu, api 1g/1cpu, redis 512m, etc.).

### Database layer
- **RLS**: Row-level security enabled on 21 tables with `set_current_org()` SECURITY DEFINER function.
- **Indexes**: 40+ indexes added (pg_trgm trigram indexes for full-text search, B-tree indexes on FK hot paths like `(organization_id, assigned_to)`, composite list-query indexes on `(organization_id, created_at DESC)`).
- **Seed profile**: Separate Docker Compose profile for initial data population (run with `--profile seed`).

### API improvements
- **Socket.io Redis adapter**: Multi-node WebSocket support without in-memory state leakage.
- **Per-tenant rate limiting**: 500 req/min per org (Redis-backed), 20 req/min per IP on auth routes.
- **Internal routes**: `POST /internal/sequences/run` protected by `x-internal-key` header for manual sequence runner triggers.
- **Sequence runner worker**: Auto-starts on API boot, polls every 60s, processes up to 50 enrollments per tick, sends emails via org SMTP, handles errors per-enrollment.
- **Metrics endpoint**: `GET /metrics` (Prometheus format), restricted to localhost by default.
- **Health endpoint**: `GET /health` returns `{ status, db, redis, uptime }`.

### New environment variables
- `INTERNAL_KEY` (min 16 chars) — protects internal routes.
- `GRAFANA_PASSWORD` — Grafana admin password (default: `admin`).
- `DATABASE_URL` updated to use PgBouncer: `postgres://user:pass@pgbouncer:6432/db`.

### Dependencies added
- `@socket.io/redis-adapter: ^8.3.0`
- `prom-client: ^15.1.3`

---

*Production hardening (2026-05-25): Monorepo consolidation (2026-05-18) paired with infrastructure and database hardening for 500-tenant deployments. Migrations auto-applied via `docker-entrypoint.sh`. RLS, Socket.io Redis adapter, Prometheus/Grafana, backup automation, and per-tenant rate limiting fully operational.*

---

## AI assistant + security hardening + backend CI (2026-06-10)

### AI / agentic feature (headline)
- **Multi-provider AI** in `api/src/services/ai/*`: Google **Gemini (free default)**, OpenAI, Anthropic. Routes under `/ai`: `status`, `summarize`, `draft-reply`, `next-best-action`, `search`, and a tool-using **`agent`** with persisted conversations.
- **Org-scoped CRM tools** (`api/src/services/ai/tools.ts`): search/get contacts, companies, deals; `create_activity` and `update_deal_stage` (writes) gated by `allowWrites` and written to `audit_log`.
- **Schema:** migration `018_ai.sql` adds `ai_conversations`, `ai_messages`, `ai_usage_log`.
- **Frontend:** global AI Assistant drawer + floating launcher, `AiInsight` buttons (next-best-action on Contact/Deal detail; summarize + draft reply in the Inbox), `aiStore`, full i18n across all 6 locales. The UI activates when any provider key is set and hides gracefully otherwise.

### AI governance
- Per-org **kill switch** (`organizations.settings.ai.enabled=false`).
- Monthly **output-token spend cap** (`AI_MONTHLY_TOKEN_CAP` env + per-org `settings.ai.monthlyTokenCap`; **429** when exceeded).
- **Retention purge** of `ai_*` data (`AI_MESSAGE_RETENTION_DAYS`, `0` = keep).

### Security hardening (shipped)
- **trustProxy hop-count** (`TRUST_PROXY` env) with rate-limit keyed on the resolved `req.ip` — XFF can no longer be spoofed on auth routes.
- **Account lockout** — 10 failed logins / 15 min → 429 (`api/src/db/redis.ts`).
- **Self-registration policy** — `ALLOW_OPEN_REGISTRATION` (default `true`), `REGISTRATION_ALLOWED_DOMAINS` allow-list; first user is always allowed.
- `/metrics` gated on the raw socket peer + `x-internal-key`; `/_debug/sql` runs inside a **READ ONLY** transaction.
- Socket.io handshake re-checks `users.is_active` + org; Slack outbound re-asserts the `hooks.slack.com` allow-list at send time; cross-org FK ownership checks on deals.
- Sequence runner claims rows **`FOR UPDATE SKIP LOCKED`** (no double-send); billing free-tier caps for churned orgs when Stripe is configured; impersonation exit sets `ended_at`.
- Removed an orphan passwordless DB-trust entrypoint and a public Adminer service. `npm audit` reports **0 vulnerabilities** on api and frontend.

### Backend CI gate + tests
- A new **`api`** job in [`.gitea/workflows/ci.yml`](../../.gitea/workflows/ci.yml) runs `npm ci → tsc → eslint → vitest → build → npm audit` (the backend previously had **no** lint/type/test gate).
- The API now ships an eslint flat config and a **26-test vitest suite** (was 0 tests).
- Frontend gates unchanged: `ui:lint`, `i18n:lint`, `i18n:coverage`, eslint (0 warnings), tsc, vitest, build, bundle budget (≤250 KB gzip largest chunk), `npm audit`.

### New env vars (API `.env`)
`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AI_DEFAULT_PROVIDER`, `AI_GEMINI_MODEL` / `AI_OPENAI_MODEL` / `AI_ANTHROPIC_MODEL`, `AI_AGENT_MAX_STEPS`, `AI_MONTHLY_TOKEN_CAP`, `AI_MESSAGE_RETENTION_DAYS`, `TRUST_PROXY` (nginx = 1; privateprompt edge + nginx = 2), `ALLOW_OPEN_REGISTRATION`, `REGISTRATION_ALLOWED_DOMAINS`. Frontend env is just `VITE_API_URL` (+ `VITE_APP_CHANNEL`); no Supabase env remains.

### Enterprise readiness — shipped vs still ROADMAP
**Shipped (do not list as roadmap):** MFA (TOTP), OIDC SSO, SCIM 2.0 provisioning, **server-side** RBAC enforcement (`requirePermission` / `requireCrudPermission` across CRM CRUD + member / API-key / webhook management; roles owner/admin/manager/sales_rep/viewer) with member lifecycle controls, GDPR data-subject export/erasure (DSAR — Art. 15/17/20), security-event audit log, API-key scopes, and backend observability (x-request-id correlation, `captureException` / optional `SENTRY_DSN`, `/health` · `/health/ready` · `/health/live`, `/metrics` + Prometheus/Grafana). **Also shipped (Monday-style + CRM-competitive wave, June 2026):** Updates & @mentions (collaboration), Calendar + Timeline board views, composable dashboard widgets, no-code automation recipe center, web-to-lead form builder (public `/forms/:token`), deal rotting + activity reminders, tickets / help desk, and meeting scheduler / booking links (public `/book/:token`).

**Still ROADMAP (do not claim as shipped):** SAML federation; HA/DR automated failover (single Postgres/Redis today — restore runbook at [`docs/disaster-recovery.md`](../../docs/disaster-recovery.md)); broader SSO provider testing/diagnostics; field-level security; forecasting v2; AI v2; industry pipeline templates; formal certifications (SOC 2 / ISO audits); and a real background job queue (BullMQ present but unused). See [`master-security-compliance.md`](./master-security-compliance.md).

---

*Last updated (git): **2026-06-11***
