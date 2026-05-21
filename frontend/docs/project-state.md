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
| What shipped, in narrative form (Parts A + B) | [`master-implementation-history.md`](./master-implementation-history.md) | Archive-stable Part A; active Part B (sections 13–28). |
| Go-live, QA matrices, production handoff | [`master-release-qa.md`](./master-release-qa.md) | Especially [Production handoff checklist](master-release-qa.md#production-handoff-checklist). |
| Auth/SSO contracts, evidence index, Supabase external checklist | [`master-security-compliance.md`](./master-security-compliance.md) | Includes OAuth redirect / CORS reminders. |
| Lead maintenance jobs, retention, ops | [`master-lead-management.md`](./master-lead-management.md) | Edge function `lead-score-maintenance`, runbooks. |
| Resend/DNS, mailbox privacy, email smoke | [`master-email-operations.md`](./master-email-operations.md) | Deliverability + release gates for mail. |
| Layout shells, navigation, profile display names | [`master-design-ui.md`](./master-design-ui.md) | UI conventions for new screens. |

**Rule of thumb:** if the question is *“is v1 Phase 10 done?”* start in **`.planning/`**. If it is *“what do we build next for Pro?”* start in **`master-roadmap-backlog`**.

---

## v1 release / hosting (vendor-neutral)

`.planning/REQUIREMENTS.md` still lists `DEPLOY-01`–`DEPLOY-05` with example filenames from one host; the **intent** is:

1. **SPA routing** — every client-side route must resolve to the built `index.html` on cold load (configure the static host or reverse proxy accordingly). **Repo examples:** [`vercel.json`](../vercel.json), [`public/_redirects`](../public/_redirects) — explained in [`docs/deployment-spa-and-env.md`](./deployment-spa-and-env.md).
2. **Build-time env** — `VITE_APP_CHANNEL` when set is **`production`** or **`staging`** (otherwise inferred from Vite `MODE`; local dev → `development`); `VITE_API_URL` points to n0crm-api. See [`src/lib/envChannel.ts`](../src/lib/envChannel.ts) and [`vite.config.ts`](../vite.config.ts). Canonical copy: [`docs/deployment-spa-and-env.md`](./deployment-spa-and-env.md) and [`.env.example`](../.env.example).
3. **Preview ↔ API** — set **`VITE_APP_CHANNEL=staging`** on preview builds and point `VITE_API_URL` at a staging n0crm-api instance; optionally set Edge secret **`EDGE_CORS_ORIGINS`** so Supabase Edge Function CORS matches those origins (see [`deployment-spa-and-env.md`](./deployment-spa-and-env.md) · [`master-security-compliance.md` §3](./master-security-compliance.md#supabase-external-hardening-checklist)).
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
  Postgres[PostgreSQL 16]
  Redis[Redis / BullMQ]
  Browser --> Nginx
  Nginx -->|/api/*| API
  API --> Postgres
  API --> Redis
```

- **Frontend:** `frontend/` — React 18 + Vite + React Router + Zustand; hosted as a static SPA (rewrites to `index.html`). nginx proxies `/api/*` to the API in Docker.
- **Backend:** `api/` — Fastify 5, Node.js 22, PostgreSQL 16 via `postgres.js`, BullMQ + Redis, Socket.io realtime.
- **Auth:** HS256 JWT (`sub/org/role` claims), `@fastify/jwt`. `isLoadingAuth` starts `true` — prevents /login flash on cold load. All org-scoped routes check `req.user.org`.
- **Monorepo:** `velo-crm/` root contains `docker-compose.yml` (orchestrates postgres, redis, api, web) and `privateprompt-app.json` (full-stack deployment manifest).

---

## Key decisions (rolled up; Apr 2026)

- **Observability (browser):** Sentry initializes when `VITE_SENTRY_DSN` is set; UI error boundary captures exceptions (`src/lib/sentry.ts`).
- **MFA:** TOTP UI exists in Settings → Security (`src/components/settings/SettingsMfaPanel.tsx`); backend MFA enforcement via `api/` is future work.
- **Soft delete + retention:** core tables carry `deleted_at`; purge jobs run via BullMQ workers in the `api/` background queue.
- **Outbound webhooks:** stored in `webhook_subscriptions` table; deliveries are outboxed in `webhook_events` with max retry limit before reaching terminal state.
- **Public API versioning:** REST public API (`/public/v1/`) with API key auth; see `api/README.md` for endpoints and `docs/public-api-phase1.md` for design.
- **Org roles:** custom roles logic can be extended via `api/src/routes/` — RLS is applied at the SQL migration layer.
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
| `.planning/REQUIREMENTS.md` — `AUTH-*`, `SEC-*`, product features | Auth flows, RLS, UI gates | Engineering | Code + tests; some rows need **Supabase dashboard** (Auth settings, URLs) |
| `.planning/REQUIREMENTS.md` — `DEPLOY-01`–`DEPLOY-05` | Static host, SPA rewrites, TLS, preview vs prod | Ops + Engineering | **Evidence** (host, channel, Supabase project, smoke result, commit) pasted per REQUIREMENTS template; not `[x]` without human sign-off |
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
- Deploy channel: `src/lib/envChannel.ts`; Supabase stub (for edge functions only): `src/lib/supabase.ts`.
- Build splitting: `vite.config.ts` (`manualChunks` for heavy chart/date libraries).
- Planning artifacts: `.planning/PROJECT.md`, `.planning/CODEBASE.md` (structure + conventions; UI canon points at `master-design-ui`).
- Automations: `src/pages/Automations.tsx`, `src/store/automationsStore.ts`, canonical English seed rules `src/i18n/seed/automationSeedRulesEn.ts` (runtime labels via `getTranslations()`).
- Entity lists (saved filters + distribution lists): `src/components/shared/EntityListsToolbar.tsx`, `src/store/distributionListsStore.ts`, merge helpers `src/lib/entityListFilters.ts`; `SmartViewBar` + `viewsStore` on Contacts, Companies, Deals.
- Company duplicate detection: `findDuplicateCompanies` in `src/utils/duplicateDetection.ts`.
- Lead UI delete: `src/store/leadsStore.ts` `deleteLead` calls n0crm-api and refetches on failure (see [`master-implementation-history.md` §25](./master-implementation-history.md#implementation-history-section-25)).
- Dead-code drift: `npm run audit:unused` (Knip) — `knip.json`.

---

*Last updated: 2026-05-18 — Monorepo consolidation. Migrated from separate `velo-crm` and `n0crm-api` repos into single monorepo structure: `frontend/` and `api/` subdirectories with root `docker-compose.yml` and `privateprompt-app.json`. All path references, deployment docs, and architecture descriptions updated to reflect monorepo topology. Gmail + Calendar OAuth fully routed through `api/` self-hosted routes. PostgreSQL migrations auto-applied via `docker-entrypoint.sh` on container startup. Socket.io realtime, JWT denylist, and webhook subscriptions fully operational.*

---

*Last updated (git): **2026-05-18***
