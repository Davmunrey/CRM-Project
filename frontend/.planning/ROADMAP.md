# n0CRM — Roadmap

**Milestone:** v1.0 — Full SaaS Upgrade
**Status:** Phase 10 Pending Deploy (Monorepo Complete)
**Phases:** 10
**Last updated:** 2026-05-18
**Architecture note:** Monorepo: frontend/ (React 18 + Vite) + api/ (Fastify 5 + PostgreSQL 16 + Redis) + docker-compose.yml at root. Auth via n0crm-api JWT (HS256, claims `{ sub, org, role, jti }`). All data via n0crm-api REST. Supabase client is `null` at runtime. Gmail fully self-hosted via n0crm-api `/gmail/*`. CI: Gitea Actions (ci.yml, build-production.yml, build-api.yml).

---

## Phases

- [x] **Phase 1: Schema & Multi-Tenancy** — Add `organization_id` + RLS to all tables; create organizations, members, invitations, and gmail_tokens tables (completed 2026-03-31)
- [x] **Phase 2: n0crm-api Auth** — Replace Supabase Auth with n0crm-api JWT (HS256, signup, login, session, password reset, logout) (completed 2026-05-13)
- [x] **Phase 3: Organization Onboarding** — First-login org creation, member invitations, roles, and org-scoped JWT claims (completed 2026-04-06)
- [x] **Phase 4: Security Fixes** — Remove API keys from localStorage, fix XSS, remove dangerouslyAllowBrowser, add dev warning for missing env vars (completed 2026-04-07)
- [x] **Phase 5: Core Data Stores + Real-Time** — Migrate contacts, companies, deals, activities, notifications to n0crm-api with Socket.io real-time (completed 2026-04-07)
- [x] **Phase 6: Secondary Stores & Real Users** — Migrate remaining stores; replace MOCK_USERS; remove AI features and Leaderboard; unify Lead=Contact (completed 2026-04-08)
- [x] **Phase 7: Gmail Integration** — Auth Code + PKCE OAuth flow; n0crm-api `/gmail/*` routes for token exchange and refresh; inbox, send, and contact linking (completed 2026-05-13)
- [x] **Phase 8: i18n English** — English translation file and language switcher persistence (completed 2026-04-09)
- [x] **Phase 9: Test Suite** — Vitest setup; unit tests for stores, Zod schemas, and **Gitea Actions** CI (`.gitea/workflows/ci.yml`, `build-production.yml`, `build-api.yml`) (completed 2026-04-10)
- [x] **Phase 10: Monorepo + Infra Hardening** — Migrate api/ into monorepo; Docker Compose orchestration; JWT denylist (Redis), Socket.io JWT verification, AES-256-GCM encryption, rate limiting, CORS/CSP (completed 2026-05-18)
- [ ] **Phase 11: Production deployment** — SPA routing for `dist/`, Docker image deployment, env vars per environment (production vs staging), custom domain + HTTPS (operator tasks DEPLOY-01–05)

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema & Multi-Tenancy | 5/5 | ✅ Complete | 2026-03-31 |
| 2. n0crm-api Auth (was Supabase) | 5/5 | ✅ Complete | 2026-05-13 |
| 3. Organization Onboarding | 4/4 | ✅ Complete | 2026-04-06 |
| 4. Security Fixes | 4/4 | ✅ Complete | 2026-04-07 |
| 5. Core Data Stores + Real-Time | 4/4 | ✅ Complete | 2026-04-07 |
| 6. Secondary Stores & Real Users | 5/5 | ✅ Complete | 2026-04-08 |
| 7. Gmail Integration (n0crm-api) | 5/5 | ✅ Complete | 2026-05-13 |
| 8. i18n English | 3/3 | ✅ Complete | 2026-04-09 |
| 9. Test Suite | 6/6 | ✅ Complete | 2026-04-10 |
| 10. Monorepo + Infra Hardening | 5/5 | ✅ Complete | 2026-05-18 |
| 11. Production deployment | 0/5 | Pending Deploy | - |

---

## Phase Details

---

## Phase 1: Schema & Multi-Tenancy

**Goal:** Every table has `organization_id` + RLS enforced via JWT claims; all new tables (organizations, members, invitations, gmail_tokens) are created and indexed.
**Dependencies:** None

### Plans

- 1.1: Add `organization_id` to core tables — ALTER existing contacts, companies, deals, activities, notifications tables to add `organization_id uuid NOT NULL REFERENCES organizations(id)`
- 1.2: Create organizations and organization_members tables — SQL migration for organizations, organization_members, and invitations with correct FK structure and unique constraints
- 1.3: Create gmail_tokens table — SQL migration for server-side refresh token storage (user_id, organization_id, encrypted tokens, scopes, expiry)
- 1.4: Write RLS policies on all tables — JWT claim check `(auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid` on every tenant-scoped table; replace the current auth-only blind policies
- 1.5: Add JWT claim trigger — PostgreSQL function `handle_new_member` + trigger to write `organization_id` and `role` into `auth.users.raw_app_meta_data` on organization_members insert/update

### Requirements Covered

SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05

### Done When

- [x] n0crm-api scopes all queries by `organization_id` from JWT `org` claim — org A data never crosses to org B
- [x] JWT claim `org` is set after org creation and carried through all subsequent tokens
- [x] `gmail_tokens` table exists with correct columns; access gated by `user_id` check in n0crm-api
- [x] All 5 SCHEMA requirements verified against PostgreSQL schema in n0crm-api
- [x] TypeScript types defined inline in n0crm-api (no Supabase CLI needed)

---

## Phase 2: n0crm-api Auth (was Supabase Auth)

**Goal:** Users can register, log in, reset their password, and have their session persist across page refreshes — via n0crm-api JWT (not Supabase Auth).
**Dependencies:** Phase 1
**Status:** Completed 2026-05-13

### Plans (completed)

- [x] 2.1: Wire n0crm-api signup — `POST /auth/register` returns JWT; authStore sets token in localStorage
- [x] 2.2: Wire n0crm-api login and session — `POST /auth/login` returns JWT; `GET /auth/me` on mount restores session from JWT
- [x] 2.3: Implement password reset flow — `POST /auth/forgot-password` → email link with token; `POST /auth/reset-password` with token + new password
- [x] 2.4: Session persistence and race condition guard — `isLoadingAuth: true` initial state in authStore; prevents redirect until `GET /auth/me` completes
- [x] 2.5: Implement logout — `POST /auth/logout` revokes JWT via Redis denylist; localStorage JWT cleared; no state restoration on Back

### Requirements Covered

AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, SEC-01, SEC-06

### Done When

- [x] New user can register with email/password via `POST /auth/register` (direct JWT issuance, no email verification step)
- [x] Logged-in user survives page refresh (JWT in localStorage via `GET /auth/me` on mount)
- [x] User who requests password reset via `POST /auth/forgot-password` receives email with reset link; can set password via `POST /auth/reset-password`
- [x] Logging out via `POST /auth/logout` clears JWT and adds jti to Redis denylist; pressing Back does not restore state
- [x] Cold-open while unauthenticated shows login page; `isLoadingAuth` guard prevents flash

---

## Phase 3: Organization Onboarding

**Goal:** A newly authenticated user can create or join an organization, invite teammates by email, and have their role enforced throughout the app.
**Dependencies:** Phase 2

### Plans

- 3.1: First-login org creation flow — detect new users with no `organization_id` in JWT claims; render an onboarding screen to collect org name and slug; insert into `organizations` and `organization_members`
- 3.2: Member invitation Edge Function — Supabase Edge Function `invite-member` using service role key to call `supabase.auth.admin.inviteUserByEmail()` with org metadata; write pending row to `invitations` table
- 3.3: Invitation acceptance flow — handle invited user's first login; read `invitations` row by token; insert into `organization_members`; fire JWT claim trigger
- 3.4: Role enforcement in UI — map org member roles (owner, admin, member) to the existing `UserRole` permission system; `PermissionGate` and `ProtectedRoute` driven by real role from Supabase, not hardcoded mock

### Requirements Covered

AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10

### Done When

- [x] New user (no `org` in JWT) is redirected to org creation screen; dashboard gated until `org` claim present
- [x] After creating org, new JWT with `org` claim is issued; user reaches dashboard immediately
- [x] Admin can invite via `POST /invitations`; invitee now receives email with accept link (wired 2026-05-13)
- [x] Invited user calls `POST /invitations/:token/accept`; receives new JWT with org + role; lands on dashboard
- [x] Role enforcement via PermissionGate driven by `role` in JWT; viewer/sales_rep cannot access admin-only actions

---

## Phase 4: Security Fixes

**Goal:** All API keys are off the browser, the XSS vector in AIAgent is closed, and developers get a visible warning when Supabase is not configured.
**Dependencies:** Phase 2

### Plans

- 4.1: Remove Anthropic key from localStorage — delete `apiKey` from `aiStore` persist partialize; remove the Settings UI field that saves it; key will live exclusively in Edge Function env vars after Phase 7
- 4.2: Fix XSS in AIAgent — replace `dangerouslySetInnerHTML` + hand-rolled `renderMarkdown()` with `react-markdown` + `rehype-sanitize`; audit all other `dangerouslySetInnerHTML` usages in the codebase
- 4.3: Remove `dangerouslyAllowBrowser` from aiService — delete the `new Anthropic({ dangerouslyAllowBrowser: true })` instantiation; stub all AI service calls to throw until the Edge Function proxy is wired in Phase 7
- 4.4: Dev-mode Supabase warning — in `src/lib/supabase.ts`, add `console.warn` (dev only, `import.meta.env.DEV`) when `!isSupabaseConfigured`; optionally surface a UI banner in Settings

### Requirements Covered

SEC-02, SEC-03, SEC-04, SEC-06

### Done When

- [x] **`crm_ai` / Anthropic in browser:** `aiStore` and related persist keys were removed with the client AI stack (Phase 06.5). Legacy `localStorage` keys may linger until a user clears site data — no active writer.
- [x] **AIAgent XSS class:** `AIAgent` and hand-rolled markdown rendering were **removed** with the client AI feature set; any future rich AI UI must use `react-markdown` + `rehype-sanitize` (policy retained in SEC-03 narrative).
- [x] **`dangerouslyAllowBrowser`:** `aiService.ts` deleted — no browser Anthropic SDK path remains.
- [x] **Missing Supabase hint:** `src/lib/supabase.ts` emits `devConsole.warn` in dev when env is absent (`dataRuntime === 'unconfigured'`), pointing engineers to set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## Phase 5: Core Data Stores + Real-Time

**Goal:** Contacts, companies, deals, activities, and notifications are fully persisted in Supabase with optimistic updates, loading states, and real-time sync across browser tabs.
**Dependencies:** Phase 3 (org context in JWT required for RLS to pass)

### Plans

- 5.1: Migrate contactsStore to Supabase — replace `persist` middleware with async Supabase CRUD calls; add `isLoading`/`error` state; implement optimistic updates with `updated_at` guard; remove `onRehydrateStorage` seed hook
- 5.2: Migrate companiesStore and activitiesStore to Supabase — same migration pattern as contacts; wire `organization_id` on all inserts
- 5.3: Migrate dealsStore to Supabase — migrate deal CRUD; preserve cross-store side effects (audit log, notifications, automations trigger) after each Supabase mutation
- 5.4: Migrate notificationsStore to Supabase — migrate notifications CRUD; ensure in-app notification bell reads from Supabase, not localStorage
- 5.5: Add Realtime subscriptions to contacts, deals, activities, notifications — `supabase.channel().on('postgres_changes', ...)` for each table; merge incoming events with optimistic state using `updated_at` guard to prevent double-apply
- 5.6: Remove seed data hooks and localStorage fallbacks — delete all `onRehydrateStorage` seed callbacks from migrated stores; remove `LS_KEYS` references for migrated entities; add `DATA-06` / `DATA-07` / `DATA-08` compliance to each store

### Requirements Covered

DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, REALTIME-01, REALTIME-02, REALTIME-03, REALTIME-04

### Done When

- [x] Realtime via Socket.io (`window.__n0crmDbChange(table)`); new contacts/deals broadcast to all connected tabs
- [x] Refreshing after creating a deal shows the deal (persisted in PostgreSQL via n0crm-api, no localStorage)
- [x] Network error during contact save sets `error` state in store; UI shows error message
- [x] No `crm_contacts` key in localStorage; all data fetched from n0crm-api on mount
- [x] All n0crm-api queries include `WHERE organization_id = $orgId` from JWT `org` claim; cross-org data access blocked

---

## Phase 6: Secondary Stores & Real Users

**Goal:** All remaining stores are migrated to Supabase, MOCK_USERS is eliminated everywhere, and analytics reflect real org members.
**Dependencies:** Phase 5

### Plans

- 6.1: Migrate goalsStore, sequencesStore, automationsStore to Supabase — write SQL migrations for missing tables; replace localStorage persist with Supabase CRUD in each store
- 6.2: Migrate templateStore, productsStore to Supabase — SQL migrations + store migration; these are simpler read-heavy stores with no cross-store side effects
- 6.3: Migrate auditStore and customFieldsStore to Supabase — SQL migrations for audit_log and custom_fields tables; remove 500-entry localStorage cap; preserve audit log calls from all CRUD stores
- 6.4: Replace MOCK_USERS in all 9 files — swap `MOCK_USERS` import with `useAuthStore((s) => s.users)` selector mapped to `{ value, label }` in ContactForm, DealForm, ActivityForm, Contacts, Deals, Dashboard, Leaderboard, Reports, PipelineTimeline
- 6.5: Fix analytics for real users — Leaderboard and Reports computed metrics must iterate over real `organization_members` fetched from Supabase, not the hardcoded array; `USERS-02` and `USERS-03` compliance

### Requirements Covered

DATA-09, DATA-10, DATA-11, DATA-12, DATA-13, DATA-14, DATA-15, USERS-01, USERS-02, USERS-03

### Done When

- [x] Sales goals persist across refreshes (stored in PostgreSQL via `POST /goals`; fetched on mount)
- [x] Invited member appears in "Assigned to" dropdowns (authStore.users fetched from `GET /users` on mount)
- [x] Leaderboard computes stats from real activities per org member
- [x] No `crm_audit` in localStorage; audit log stored in PostgreSQL `audit_log` table via n0crm-api
- [x] Reports page uses real org members from authStore.users; no hardcoded mock users remain

---

## Phase 7: Gmail Integration (n0crm-api, no Supabase)

**Goal:** Users can connect Gmail via Auth Code + PKCE, and the CRM can read their inbox, send emails from contact/deal pages, and link incoming emails to contacts automatically — fully hosted in n0crm-api.
**Dependencies:** Phase 5 (contacts via n0crm-api for email linking)
**Status:** Completed 2026-05-13

**Plans:** 5/5 plans executed (all migrated to n0crm-api)

Plans:
- [x] 07-1-PLAN.md — PKCE OAuth initiation + GmailTokenContext + emailStore cleanup (Wave 1)
- [x] 07-2-PLAN.md — gmail_tokens schema + `/gmail/oauth-exchange` + `/gmail/refresh` n0crm-api routes (was Edge Functions)
- [x] 07-3-PLAN.md — GmailCallback page + App.tsx route + useDataInit silent refresh (Wave 2)
- [x] 07-4-PLAN.md — Inbox wired to real Gmail threads + contact email matching chips (Wave 3)
- [x] 07-5-PLAN.md — Send email from ContactDetail/Deals + activity logging on send (Wave 4)
- [x] 07-HARDENING — Dynamic redirect URI, refresh/retry in Inbox+Composer, persisted `gmail_thread_links`, pin/unpin links, fixture-linked deal emails for inbox QA

### Requirements Covered

GMAIL-01, GMAIL-02, GMAIL-03, GMAIL-04, GMAIL-05, GMAIL-06, SEC-05

### Done When

- [x] Clicking "Connect Gmail" initiates OAuth flow via `POST /gmail/oauth-start` (PKCE, n0crm-api — no Supabase dependency)
- [x] After granting consent, callback exchanges code via `POST /gmail/oauth-exchange`; refresh token stored AES-256-GCM encrypted in `gmail_tokens` table
- [x] Silently refreshes Gmail access token on app open via `POST /gmail/refresh` using stored refresh token
- [x] `localStorage.getItem('crm_emails*')` contains no persisted Gmail access token field
- [x] Receiving an email from a known contact's email address shows a contact chip in the inbox thread list
- [x] Sending an email from a deal detail page logs it as an activity on that deal
- [x] User can pin/unpin thread-to-CRM linkage and keep it stable across sessions
- [ ] Google OAuth app passes Google verification for restricted scopes (operator task — 4-6 week review for production users)

---

## Phase 8: i18n English

**Goal:** A complete English translation file exists and users can switch language preference from Settings with the choice persisting across sessions.
**Dependencies:** Phase 2 (user session for preference persistence)

### Plans

- 8.1: Audit all Spanish keys in `es.ts` — enumerate every key in the existing Spanish translation file; identify any keys referenced in components but missing from the file (gaps)
- 8.2: Complete `en.ts` with full English translations — ensure parity (same key count, no missing keys that would fall back to raw key strings)
- 8.3: Language switcher and persistence — add language selector to Settings; confirm `useI18nStore` persists the selection; verify all pages re-render in English when the switcher is toggled

### Requirements Covered

I18N-01, I18N-02

### Done When

- [x] Switching to English in Settings causes every UI string to switch with no raw keys visible (1603 keys, verified)
- [x] Refreshing after switching keeps English (persisted in useI18nStore)
- [x] EN and ES translation files have identical key count (1603 keys each, verified by npm run i18n:lint)

---

## Phase 9: Test Suite

**Goal:** Vitest is configured and running in CI; store actions and form validation schemas all have unit test coverage.
**Dependencies:** None

### Plans

- 9.1: Configure Vitest + testing libraries — install `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`; create `vitest.config.ts` with jsdom env, path alias, coverage config; create `src/test/setup.ts`
- 9.2: Write Zustand store tests — `contactsStore.test.ts` and `dealsStore.test.ts`; mock Supabase client; test add/update/delete actions; test `getFilteredContacts` / `getFilteredDeals` selectors; reset store state in `beforeEach`
- 9.3: Write Zod schema tests — test form validation schemas for ContactForm, DealForm, ActivityForm; assert required field errors, type coercion, and valid payloads pass without ceremony
- 9.4: Write utility tests — followUpEngine, formatters, permissions
- 9.5: CI workflow on the repository forge — primary: **Gitea Actions** `.gitea/workflows/ci.yml` running `tsc --noEmit` and `vitest run` on push to `main` and on merge requests; fail if either exits non-zero. Optional: keep `.github/workflows/ci.yml` for mirrors or forks.

### Requirements Covered

TEST-01, TEST-02, TEST-03, TEST-04, TEST-05

### Done When

- [x] `npm test` exits 0 — 218 passing, 1 skipped (42 test files)
- [x] `npm run test:coverage` shows coverage report
- [ ] Gitea CI triggers on MR and shows test + type check results (operator task — requires Gitea runner setup)
- [ ] Deliberate type error causes CI `tsc --noEmit` to fail (operator task)
- [ ] Deliberate logic error causes at least one test to fail (operator task)

---

## Phase 10: Monorepo + Infra Hardening (formerly Phase 10)

**Goal:** Migrate n0crm-api into monorepo (frontend/ + api/ + docker-compose.yml at root); harden security (JWT denylist, Socket.io verification, encryption, rate limiting, CORS/CSP); confirm all services deployable as single Docker Compose unit.
**Dependencies:** Phase 9 (CI green)
**Status:** Completed 2026-05-18

### Plans (completed)

- [x] 10.1: Monorepo structure — move n0crm-api into `api/` subdirectory; update docker-compose.yml to orchestrate postgres + redis + api:3001 + web (nginx)
- [x] 10.2: Security audit — implement Socket.io JWT verification, Redis JWT denylist (jti tracking), AES-256-GCM encryption for secrets, auth rate limiting (10/15min), CSP headers
- [x] 10.3: CI workflows — 3 Gitea Actions: `ci.yml` (frontend type + tests), `build-production.yml` (frontend Docker), `build-api.yml` (api Docker)
- [x] 10.4: Deployment manifest — add `privateprompt-app.json` for Private Prompt deployment; document `docker-compose up` local development flow
- [x] 10.5: Documentation — update `.planning/` and canonical docs to reflect monorepo, n0crm-api migrations, security hardening

### Requirements Covered

(Restructuring + hardening; Phase 10 DEPLOY-01–05 moved to Phase 11)

### Done When

- [x] Monorepo structure: frontend/ + api/ + docker-compose.yml at root; both subdirectories have independent package.json
- [x] `docker-compose up` starts postgres + redis + api:3001 + web (nginx:80) with correct networking
- [x] Frontend nginx configuration: requests to `/api/*` proxied to api:3001; all other routes serve `index.html` (SPA routing)
- [x] Socket.io JWT verified on connect; every authenticated request checks Redis JWT denylist
- [x] All secrets (Gmail refresh tokens, SMTP passwords, webhook signing keys) encrypted with AES-256-GCM
- [x] `POST /auth/logout` revokes token + adds jti to Redis denylist; refresh token rotation via jti
- [x] Tests passing (218 passing, 1 skipped); build clean

---

## Phase 11: Production deployment (new Phase 11)

**Goal:** The built SPA (`dist/`) is served from a static host or CDN with correct client-side routing; n0crm-api deployed with PostgreSQL + Redis; production served on a custom domain over HTTPS.
**Dependencies:** Phase 10 (monorepo + CI passing)

### Plans

- 11.1: SPA catch-all routing — on **private** static hosting, configure nginx `try_files` or CDN so unknown paths serve `index.html`; verify React Router deep links on direct load. Monorepo `docker-compose.yml` includes nginx frontend service as reference.
- 11.2: Connect the repository to **your** deploy pipeline and set build-time env vars — `VITE_API_URL` pointing to production n0crm-api; `VITE_APP_CHANNEL` (`production` vs `staging`); set n0crm-api env vars (`DATABASE_URL`, `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- 11.3: Verify **staging** deployments — build from a non-production branch; confirm the **staging** URL hits the staging n0crm-api instance; confirm data isolation (separate DB)
- 11.4: Production deploy — merge to `main`; confirm production URL serves the expected build; smoke test: signup, login, create contact, log activity
- 11.5: Custom domain — add DNS records per your host; confirm HTTPS/TLS is valid

### Requirements Covered

DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05

### Done When

- [ ] Navigating directly to `/contacts` returns the Contacts page, not a 404
- [ ] A **staging** build is reachable at its staging URL and hits staging n0crm-api (verified in DevTools network tab)
- [ ] Merging to `main` (or your protected branch) triggers a **production** deployment on your infrastructure that completes successfully
- [ ] The production custom domain serves the app over HTTPS with a valid TLS certificate
- [ ] Smoke test: signup → create org → invite member → create contact → log activity → all persist across refresh

---

## Phase 11: Realtime + UX Metrics + Tracking

**Goal:** Socket.io realtime subscription wired; UX events flushed to server; email tracking metrics refreshed per-email.
**Dependencies:** Phase 10 (API must be deployed and reachable)

### Plans

- 11.1: Wire Socket.io client in `realtimeSubscriptions.ts` — connect to n0crm-api Socket.io, map `db-change` events to `window.__n0crmDbChange(table)` bridge; existing TABLE_HANDLERS already complete
- 11.2: Implement `flushUxMetricsToServer` — add `POST /ux-metrics-ingest` to n0crm-api; drain `crm_ux_metrics_v1` localStorage queue, batch POST, clear on success
- 11.3: Wire `refreshTrackingMetrics` in emailStore — call `GET /email-tracking/metrics/:trackingId` (or equivalent) per tracked email; update open/click counts in store state

### Done When

- [ ] Creating a contact in tab A causes tab B to refresh contact list without manual reload (Socket.io realtime)
- [ ] UX events (button clicks, page views) stored in localStorage are flushed to n0crm-api on `flushUxMetricsToServer()` call
- [ ] Email tracking panel shows updated open/click counts after `refreshTrackingMetrics()` call

---

## Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 | Phase 1 | ✅ Complete |
| SCHEMA-02 | Phase 1 | ✅ Complete |
| SCHEMA-03 | Phase 1 | ✅ Complete |
| SCHEMA-04 | Phase 1 | ✅ Complete |
| SCHEMA-05 | Phase 1 | ✅ Complete |
| AUTH-01 | Phase 2 | ✅ Complete |
| AUTH-02 | Phase 2 | ✅ Complete |
| AUTH-03 | Phase 2 | ✅ Complete |
| AUTH-04 | Phase 2 | ✅ Complete |
| AUTH-05 | Phase 2 | ✅ Complete |
| SEC-01 | Phase 2 | ✅ Complete |
| SEC-06 | Phase 2 | ✅ Complete |
| AUTH-06 | Phase 3 | ✅ Complete |
| AUTH-07 | Phase 3 | ✅ Complete |
| AUTH-08 | Phase 3 | ✅ Complete |
| AUTH-09 | Phase 3 | ✅ Complete |
| AUTH-10 | Phase 3 | ✅ Complete |
| SEC-02 | Phase 4 | ✅ Complete |
| SEC-03 | Phase 4 | ✅ Complete |
| SEC-04 | Phase 4 | ✅ Complete |
| DATA-01 | Phase 5 | ✅ Complete |
| DATA-02 | Phase 5 | ✅ Complete |
| DATA-03 | Phase 5 | ✅ Complete |
| DATA-04 | Phase 5 | ✅ Complete |
| DATA-05 | Phase 5 | ✅ Complete |
| DATA-06 | Phase 5 | ✅ Complete |
| DATA-07 | Phase 5 | ✅ Complete |
| DATA-08 | Phase 5 | ✅ Complete |
| REALTIME-01 | Phase 5 | ✅ Complete |
| REALTIME-02 | Phase 5 | ✅ Complete |
| REALTIME-03 | Phase 5 | ✅ Complete |
| REALTIME-04 | Phase 5 | ✅ Complete |
| DATA-09 | Phase 6 | ✅ Complete |
| DATA-10 | Phase 6 | ✅ Complete |
| DATA-11 | Phase 6 | ✅ Complete |
| DATA-12 | Phase 6 | ✅ Complete |
| DATA-13 | Phase 6 | ✅ Complete |
| DATA-14 | Phase 6 | ✅ Complete |
| DATA-15 | Phase 6 | ✅ Complete |
| USERS-01 | Phase 6 | ✅ Complete |
| USERS-02 | Phase 6 | ✅ Complete |
| USERS-03 | Phase 6 | ✅ Complete |
| GMAIL-01 | Phase 7 | ✅ Complete |
| GMAIL-02 | Phase 7 | ✅ Complete |
| GMAIL-03 | Phase 7 | ✅ Complete |
| GMAIL-04 | Phase 7 | ✅ Complete |
| GMAIL-05 | Phase 7 | ✅ Complete |
| GMAIL-06 | Phase 7 | ✅ Complete |
| SEC-05 | Phase 7 | ✅ Complete |
| I18N-01 | Phase 8 | ✅ Complete |
| I18N-02 | Phase 8 | ✅ Complete |
| TEST-01 | Phase 9 | ✅ Complete |
| TEST-02 | Phase 9 | ✅ Complete |
| TEST-03 | Phase 9 | ✅ Complete |
| TEST-04 | Phase 9 | ✅ Complete |
| TEST-05 | Phase 9 | ✅ Complete |
| DEPLOY-01 | Phase 11 | Pending Deploy |
| DEPLOY-02 | Phase 11 | Pending Deploy |
| DEPLOY-03 | Phase 11 | Pending Deploy |
| DEPLOY-04 | Phase 11 | Pending Deploy |
| DEPLOY-05 | Phase 11 | Pending Deploy |

**Requirements mapped:** see the table above for per-requirement status; Phase 10 (monorepo + infra hardening) is complete; Phase 11 (production deployment) pending operator action.

---

*Roadmap created: 2026-03-31*
*Last updated: 2026-05-18 — Phase 2 renamed to n0crm-api Auth (from Supabase); Phase 7 updated to note n0crm-api migration (no Supabase Edge Functions); Phase 10 renamed to Monorepo + Infra Hardening (complete 2026-05-18); new Phase 11 created for Production deployment (operator tasks DEPLOY-01–05).*
