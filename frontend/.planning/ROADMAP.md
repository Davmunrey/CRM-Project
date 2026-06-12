# n0CRM — Roadmap

**Milestone:** v1.0 → v1.1 Enterprise
**Status:** Phase 11 (Enterprise Hardening) complete; Phase 12 (Production Deployment) pending operator action
**Phases:** 13
**Last updated:** 2026-06-11
**Architecture note:** Monorepo: frontend/ (React 18 + Vite + Zustand + Tailwind) + api/ (Fastify 5 / Node 22 + PostgreSQL 16 + Redis 7) + docker-compose.yml at root. Auth via n0crm-api JWT (HS256, claims `{ sub, org, role, jti }`). All data via n0crm-api REST + Socket.io 4. CI: Gitea Actions (`.gitea/workflows/ci.yml`, `build-production.yml`, `build-api.yml`).

---

## Phases

- [x] **Phase 1: Schema & Multi-Tenancy** — Add `organization_id` to all tables; create organizations, members, invitations, and gmail_tokens tables (completed 2026-03-31)
- [x] **Phase 2: n0crm-api Auth** — Replace legacy auth with n0crm-api JWT (HS256, signup, login, session, password reset, logout) (completed 2026-05-13)
- [x] **Phase 3: Organization Onboarding** — First-login org creation, member invitations, roles, and org-scoped JWT claims (completed 2026-04-06)
- [x] **Phase 4: Security Fixes** — Remove API keys from localStorage, fix XSS, remove dangerouslyAllowBrowser, add dev warning for missing env vars (completed 2026-04-07)
- [x] **Phase 5: Core Data Stores + Real-Time** — Migrate contacts, companies, deals, activities, notifications to n0crm-api with Socket.io real-time (completed 2026-04-07)
- [x] **Phase 6: Secondary Stores & Real Users** — Migrate remaining stores; replace MOCK_USERS; unify Lead=Contact (completed 2026-04-08)
- [x] **Phase 7: Gmail Integration** — Auth Code + PKCE OAuth flow; n0crm-api `/gmail/*` routes for token exchange and refresh; inbox, send, and contact linking (completed 2026-05-13)
- [x] **Phase 8: i18n English** — English translation file and language switcher persistence (completed 2026-04-09)
- [x] **Phase 9: Test Suite** — Vitest setup; unit tests for stores, Zod schemas, and Gitea Actions CI (`.gitea/workflows/ci.yml`, `build-production.yml`, `build-api.yml`) (completed 2026-04-10)
- [x] **Phase 10: Monorepo + Infra Hardening** — Migrate api/ into monorepo; Docker Compose orchestration; JWT denylist (Redis), Socket.io JWT verification, AES-256-GCM encryption, rate limiting, CORS/CSP (completed 2026-05-18)
- [x] **Phase 11: Enterprise Hardening** — MFA (TOTP), OIDC SSO, SCIM 2.0, server-side RBAC, GDPR privacy endpoints, multi-provider AI, security-event audit log, observability (completed 2026-06-11)
- [ ] **Phase 12: Production Deployment** — SPA routing for `dist/`, Docker image deployment, env vars per environment (production vs staging), custom domain + HTTPS (operator tasks DEPLOY-01–05)
- [ ] **Phase 13: Future — SAML, HA/DR, Forecasting v2, AI v2, Certifications** — SAML federation; automated HA/DR failover; forecasting v2; AI v2; formal SOC2/ISO audits

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema & Multi-Tenancy | 5/5 | ✅ Complete | 2026-03-31 |
| 2. n0crm-api Auth | 5/5 | ✅ Complete | 2026-05-13 |
| 3. Organization Onboarding | 4/4 | ✅ Complete | 2026-04-06 |
| 4. Security Fixes | 4/4 | ✅ Complete | 2026-04-07 |
| 5. Core Data Stores + Real-Time | 4/4 | ✅ Complete | 2026-04-07 |
| 6. Secondary Stores & Real Users | 5/5 | ✅ Complete | 2026-04-08 |
| 7. Gmail Integration (n0crm-api) | 5/5 | ✅ Complete | 2026-05-13 |
| 8. i18n English | 3/3 | ✅ Complete | 2026-04-09 |
| 9. Test Suite | 6/6 | ✅ Complete | 2026-04-10 |
| 10. Monorepo + Infra Hardening | 5/5 | ✅ Complete | 2026-05-18 |
| 11. Enterprise Hardening | 8/8 | ✅ Complete | 2026-06-11 |
| 12. Production Deployment | 0/5 | Pending Deploy | — |
| 13. Future (SAML / HA-DR / AI v2 / Certs) | — | Open | — |

---

## Phase Details

---

## Phase 1: Schema & Multi-Tenancy

**Goal:** Every table has `organization_id`; all new tables (organizations, members, invitations, gmail_tokens) are created and indexed. App-layer org scoping is the authoritative isolation control; RLS is opt-in defense-in-depth.
**Dependencies:** None

### Plans

- 1.1: Add `organization_id` to core tables — ALTER existing contacts, companies, deals, activities, notifications tables to add `organization_id uuid NOT NULL REFERENCES organizations(id)`
- 1.2: Create organizations and organization_members tables — SQL migration for organizations, organization_members, and invitations with correct FK structure and unique constraints
- 1.3: Create gmail_tokens table — SQL migration for server-side refresh token storage (user_id, organization_id, encrypted tokens, scopes, expiry)
- 1.4: Write RLS policies on tenant-scoped tables — opt-in defense-in-depth; app-layer `WHERE organization_id = $orgId` (from JWT `org` claim) is the authoritative control; see docs/adr/0001-tenant-isolation-and-rls.md
- 1.5: TypeScript types inline in n0crm-api — all schema types defined in api/src; no external client codegen required

### Requirements Covered

SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05

### Done When

- [x] n0crm-api scopes all queries by `organization_id` from JWT `org` claim — org A data never crosses to org B
- [x] JWT claim `org` is set after org creation and carried through all subsequent tokens
- [x] `gmail_tokens` table exists with correct columns; access gated by `user_id` check in n0crm-api
- [x] All 5 SCHEMA requirements verified against PostgreSQL schema in n0crm-api
- [x] TypeScript types defined inline in n0crm-api (no external CLI needed)

---

## Phase 2: n0crm-api Auth

**Goal:** Users can register, log in, reset their password, and have their session persist across page refreshes — via n0crm-api JWT (HS256).
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
- 3.2: Member invitation — `POST /invitations` sends invite email; pending row written to `invitations` table
- 3.3: Invitation acceptance flow — handle invited user's first login; read `invitations` row by token; `POST /invitations/:token/accept`; new JWT with org + role issued
- 3.4: Role enforcement in UI — map org member roles (owner, admin, manager, sales_rep, viewer) to `PermissionGate` and `ProtectedRoute` driven by real role from JWT

### Requirements Covered

AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10

### Done When

- [x] New user (no `org` in JWT) is redirected to org creation screen; dashboard gated until `org` claim present
- [x] After creating org, new JWT with `org` claim is issued; user reaches dashboard immediately
- [x] Admin can invite via `POST /invitations`; invitee receives email with accept link
- [x] Invited user calls `POST /invitations/:token/accept`; receives new JWT with org + role; lands on dashboard
- [x] Role enforcement via PermissionGate driven by `role` in JWT; viewer/sales_rep cannot access admin-only actions

---

## Phase 4: Security Fixes

**Goal:** All API keys are off the browser, the XSS vector in AIAgent is closed, and developers get a visible warning when the API is not configured.
**Dependencies:** Phase 2

### Plans

- 4.1: Remove Anthropic key from localStorage — delete `apiKey` from `aiStore` persist partialize; remove the Settings UI field that saves it; key lives exclusively in server env vars
- 4.2: Fix XSS in AIAgent — replace `dangerouslySetInnerHTML` + hand-rolled `renderMarkdown()` with `react-markdown` + `rehype-sanitize`; audit all other `dangerouslySetInnerHTML` usages in the codebase
- 4.3: Remove `dangerouslyAllowBrowser` from aiService — delete the browser-side AI SDK instantiation; stub all AI service calls to throw until the server proxy is wired
- 4.4: Dev-mode API warning — in the API client module, emit `console.warn` (dev only, `import.meta.env.DEV`) when env vars are absent; surface a UI banner in Settings

### Requirements Covered

SEC-02, SEC-03, SEC-04, SEC-06

### Done When

- [x] **`crm_ai` / AI key in browser:** `aiStore` and related persist keys removed; no active writer remains
- [x] **AIAgent XSS class:** `AIAgent` and hand-rolled markdown rendering removed; policy retained: any future rich AI UI must use `react-markdown` + `rehype-sanitize` (SEC-03)
- [x] **`dangerouslyAllowBrowser`:** `aiService.ts` deleted — no browser-side AI SDK path remains
- [x] **Missing API hint:** dev console warns when env vars are absent

---

## Phase 5: Core Data Stores + Real-Time

**Goal:** Contacts, companies, deals, activities, and notifications are fully persisted in PostgreSQL via n0crm-api with optimistic updates, loading states, and real-time sync across browser tabs via Socket.io.
**Dependencies:** Phase 3 (org context in JWT required)

### Plans

- 5.1: Migrate contactsStore to n0crm-api — replace `persist` middleware with async REST CRUD calls; add `isLoading`/`error` state; implement optimistic updates with `updated_at` guard
- 5.2: Migrate companiesStore and activitiesStore — same migration pattern as contacts; wire `organization_id` on all inserts
- 5.3: Migrate dealsStore — migrate deal CRUD; preserve cross-store side effects (audit log, notifications, automations trigger) after each mutation
- 5.4: Migrate notificationsStore — notifications CRUD via n0crm-api; in-app notification bell reads from PostgreSQL, not localStorage
- 5.5: Add Socket.io real-time — connect to n0crm-api Socket.io, map `db:change` events to store refreshes; org-scoped rooms; `updated_at` guard to prevent double-apply
- 5.6: Remove seed data hooks and localStorage fallbacks — delete all `onRehydrateStorage` seed callbacks from migrated stores; remove stale `LS_KEYS` references for migrated entities

### Requirements Covered

DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, REALTIME-01, REALTIME-02, REALTIME-03, REALTIME-04

### Done When

- [x] Realtime via Socket.io (`db:change` event); new contacts/deals broadcast to all connected tabs within the org
- [x] Refreshing after creating a deal shows the deal (persisted in PostgreSQL via n0crm-api, no localStorage)
- [x] Network error during contact save sets `error` state in store; UI shows error message
- [x] No `crm_contacts` key in localStorage; all data fetched from n0crm-api on mount
- [x] All n0crm-api queries include `WHERE organization_id = $orgId` from JWT `org` claim; cross-org data access blocked

---

## Phase 6: Secondary Stores & Real Users

**Goal:** All remaining stores are migrated to n0crm-api, MOCK_USERS is eliminated everywhere, and analytics reflect real org members.
**Dependencies:** Phase 5

### Plans

- 6.1: Migrate goalsStore, sequencesStore, automationsStore to n0crm-api — SQL migrations for missing tables; replace localStorage persist with REST CRUD in each store
- 6.2: Migrate templateStore, productsStore to n0crm-api — SQL migrations + store migration; read-heavy stores with no cross-store side effects
- 6.3: Migrate auditStore and customFieldsStore to n0crm-api — SQL migrations for audit_log and custom_fields tables; remove 500-entry localStorage cap; preserve audit log calls from all CRUD stores
- 6.4: Replace MOCK_USERS in all files — swap `MOCK_USERS` import with `useAuthStore((s) => s.users)` selector in ContactForm, DealForm, ActivityForm, Contacts, Deals, Dashboard, Reports, PipelineTimeline
- 6.5: Fix analytics for real users — Leaderboard and Reports computed metrics iterate over real `organization_members` fetched from n0crm-api, not a hardcoded array

### Requirements Covered

DATA-09, DATA-10, DATA-11, DATA-12, DATA-13, DATA-14, DATA-15, USERS-01, USERS-02, USERS-03

### Done When

- [x] Sales goals persist across refreshes (stored in PostgreSQL via `POST /goals`; fetched on mount)
- [x] Invited member appears in "Assigned to" dropdowns (authStore.users fetched from `GET /users` on mount)
- [x] Leaderboard computes stats from real activities per org member
- [x] No `crm_audit` in localStorage; audit log stored in PostgreSQL `audit_log` table via n0crm-api
- [x] Reports page uses real org members from authStore.users; no hardcoded mock users remain

---

## Phase 7: Gmail Integration

**Goal:** Users can connect Gmail via Auth Code + PKCE, and the CRM can read their inbox, send emails from contact/deal pages, and link incoming emails to contacts automatically — fully hosted in n0crm-api.
**Dependencies:** Phase 5 (contacts via n0crm-api for email linking)
**Status:** Completed 2026-05-13

**Plans:** 5/5 plans executed

Plans:
- [x] 07-1-PLAN.md — PKCE OAuth initiation + GmailTokenContext + emailStore cleanup (Wave 1)
- [x] 07-2-PLAN.md — gmail_tokens schema + `/gmail/oauth-exchange` + `/gmail/refresh` n0crm-api routes
- [x] 07-3-PLAN.md — GmailCallback page (`frontend/src/pages/GmailCallback.tsx`) + App.tsx route + useDataInit silent refresh (Wave 2)
- [x] 07-4-PLAN.md — Inbox wired to real Gmail threads + contact email matching chips (Wave 3)
- [x] 07-5-PLAN.md — Send email from ContactDetail/Deals + activity logging on send (Wave 4)
- [x] 07-HARDENING — Dynamic redirect URI, refresh/retry in Inbox+Composer, persisted `gmail_thread_links`, pin/unpin links

### Requirements Covered

GMAIL-01, GMAIL-02, GMAIL-03, GMAIL-04, GMAIL-05, GMAIL-06, SEC-05

### Done When

- [x] Clicking "Connect Gmail" initiates OAuth flow via `POST /gmail/oauth-start` (PKCE, n0crm-api)
- [x] After granting consent, frontend route `{origin}/auth/gmail/callback` (`GmailCallback.tsx`) receives the code and postMessages to the opener; backend exchanges code via `POST /gmail/oauth-exchange`; refresh token stored AES-256-GCM encrypted in `gmail_tokens` table
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
- [x] EN and ES translation files have identical key count (1603 keys each, verified by `npm run i18n:lint`)

---

## Phase 9: Test Suite

**Goal:** Vitest is configured and running in CI; store actions and form validation schemas all have unit test coverage.
**Dependencies:** None

### Plans

- 9.1: Configure Vitest + testing libraries — install `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`; create `vitest.config.ts` with jsdom env, path alias, coverage config; create `src/test/setup.ts`
- 9.2: Write Zustand store tests — `contactsStore.test.ts` and `dealsStore.test.ts`; mock REST client; test add/update/delete actions; test `getFilteredContacts` / `getFilteredDeals` selectors; reset store state in `beforeEach`
- 9.3: Write Zod schema tests — test form validation schemas for ContactForm, DealForm, ActivityForm; assert required field errors, type coercion, and valid payloads pass without ceremony
- 9.4: Write utility tests — followUpEngine, formatters, permissions
- 9.5: CI workflow — primary: **Gitea Actions** `.gitea/workflows/ci.yml` running `tsc --noEmit` and `vitest run` on push to `main` and on merge requests; fail if either exits non-zero

### Requirements Covered

TEST-01, TEST-02, TEST-03, TEST-04, TEST-05

### Done When

- [x] `npm test` exits 0 — 263 frontend tests passing (authoritative from vitest run); API suite: 85 tests across 12 files
- [x] `npm run test:coverage` shows coverage report
- [ ] Gitea CI triggers on MR and shows test + type check results (operator task — requires Gitea runner setup)
- [ ] Deliberate type error causes CI `tsc --noEmit` to fail (operator task)
- [ ] Deliberate logic error causes at least one test to fail (operator task)

---

## Phase 10: Monorepo + Infra Hardening

**Goal:** Migrate n0crm-api into monorepo (frontend/ + api/ + docker-compose.yml at root); harden security (JWT denylist, Socket.io verification, encryption, rate limiting, CORS/CSP); confirm all services deployable as single Docker Compose unit.
**Dependencies:** Phase 9 (CI green)
**Status:** Completed 2026-05-18

### Plans (completed)

- [x] 10.1: Monorepo structure — move n0crm-api into `api/` subdirectory; update docker-compose.yml to orchestrate postgres + redis + api:3001 + web (nginx)
- [x] 10.2: Security audit — implement Socket.io JWT verification, Redis JWT denylist (jti tracking), AES-256-GCM encryption for secrets, auth rate limiting (10 attempts/15 min), CSP headers
- [x] 10.3: CI workflows — 3 Gitea Actions: `ci.yml` (frontend type + tests), `build-production.yml` (frontend Docker), `build-api.yml` (api Docker)
- [x] 10.4: Deployment manifest — add `privateprompt-app.json` for Private Prompt deployment; document `docker-compose up` local development flow
- [x] 10.5: Documentation — update `.planning/` and canonical docs to reflect monorepo, n0crm-api migrations, security hardening

### Requirements Covered

(Restructuring + hardening; Phase 10 DEPLOY-01–05 deferred to Phase 12)

### Done When

- [x] Monorepo structure: frontend/ + api/ + docker-compose.yml at root; both subdirectories have independent package.json
- [x] `docker-compose up` starts postgres + redis + api:3001 (bound 127.0.0.1) + web (nginx:80) with correct networking
- [x] Frontend nginx configuration: requests to `/api/*` proxied to api:3001; all other routes serve `index.html` (SPA routing)
- [x] Socket.io JWT verified on connect; every authenticated request checks Redis JWT denylist
- [x] All secrets (Gmail refresh tokens, SMTP passwords, webhook signing keys) encrypted with AES-256-GCM
- [x] `POST /auth/logout` revokes token + adds jti to Redis denylist; refresh token rotation via jti
- [x] Tests passing; build clean

---

## Phase 11: Enterprise Hardening

**Goal:** Ship the full enterprise-grade feature set required for organizational deployments: MFA, OIDC SSO, SCIM 2.0 provisioning, server-side RBAC, GDPR compliance endpoints, multi-provider AI with governance, security-event audit logging, and production observability.
**Dependencies:** Phase 10
**Status:** Completed 2026-06-11

### Features shipped

- [x] **MFA (TOTP, RFC 6238)** — `POST /auth/mfa/setup·enable·disable`; AES-256-GCM encrypted TOTP secret; login code prompt; Settings > Security enroll flow; migration 019
- [x] **OIDC SSO** — `GET /auth/sso/status·start·callback`; PKCE S256; JWKS RS256 token verify; JIT provisioning; `OIDC_DEFAULT_ROLE` env var; frontend SSO button gated by `/auth/sso/status`
- [x] **SCIM 2.0** — `/scim/v2` Users CRUD + ServiceProviderConfig; Bearer API key scoped `scim`; soft-deprovision + session revoke; last-active-owner guard; audit-logged
- [x] **Server-side RBAC** — `requirePermission` / `requireCrudPermission` across all CRM CRUD + member/API-key/webhook management routes; roles: owner, admin, manager, sales_rep, viewer
- [x] **Member lifecycle** — `PATCH /orgs/me/members/:id/role·status` with safety rules (cannot demote last owner, cannot deactivate self, etc.)
- [x] **GDPR privacy** — `POST /privacy/org-export` (Art. 20), `POST /privacy/subject-export/:id` (Art. 15), `POST /privacy/erasure/:id` anonymize (Art. 17); owner/admin gated
- [x] **Multi-provider AI** — Gemini (free default) / OpenAI / Anthropic; tool-using CRM agent; persisted conversations; assistant drawer; next-best-action; Inbox summarize + draft-reply; per-org kill switch `settings.ai.enabled`; `AI_MONTHLY_TOKEN_CAP`; `AI_MESSAGE_RETENTION_DAYS` purge; migration 018
- [x] **API-key scopes** — leads:write, scim; `POST /api/public/v1/leads` authenticated by `x-api-key: n0crm_<key>`; 403 `{error:"Insufficient API key scope", required:"leads:write"}` on scope mismatch; Settings > Integrations scope selector UI
- [x] **Security-event audit log** — `security_events` table + `recordSecurityEvent`; login/MFA/SCIM/SSO events recorded; migration 020
- [x] **Observability** — `x-request-id` correlation; `captureException`; `/health`, `/health/ready`, `/health/live`; optional `SENTRY_DSN`; `/metrics` loopback/internal-key gated; Prometheus + Grafana

### Done When

- [x] User can enroll TOTP in Settings > Security; login code prompt on next sign-in; invalid code rejected
- [x] OIDC SSO button appears on login when `OIDC_ISSUER` is configured; JIT-provisioned user lands on dashboard with correct role
- [x] IdP-provisioned user created/updated/deprovisioned via SCIM 2.0 with audit entries written
- [x] viewer-role user cannot create/edit contacts (RBAC enforced server-side)
- [x] Org export returns NDJSON of all org data; subject erasure anonymizes PII fields; owner receives 403 if not owner/admin
- [x] AI assistant drawer available in contacts/deals; per-org disable switch in admin settings; token usage capped
- [x] Public lead submission `POST /api/public/v1/leads` with `x-api-key: n0crm_<key>` creates lead; missing or wrong-scope key returns 401/403
- [x] Security events written for login, MFA events, SCIM operations visible in audit log
- [x] `/health/live` returns 200; `/metrics` returns Prometheus text format to internal requests

---

## Phase 12: Production Deployment

**Goal:** The built SPA (`dist/`) is served from a static host or CDN with correct client-side routing; n0crm-api deployed with PostgreSQL + Redis; production served on a custom domain over HTTPS.
**Dependencies:** Phase 11 (enterprise features complete + CI green)

### Plans

- 12.1: SPA catch-all routing — on private static hosting, configure nginx `try_files` or CDN so unknown paths serve `index.html`; verify React Router deep links on direct load. Monorepo `docker-compose.yml` includes nginx frontend service as reference.
- 12.2: Connect repository to deploy pipeline and set build-time env vars — `VITE_API_URL` pointing to production n0crm-api; `VITE_APP_CHANNEL` (`production` vs `staging`); set n0crm-api env vars (`DATABASE_URL`, `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- 12.3: Verify staging deployments — build from a non-production branch; confirm the staging URL hits the staging n0crm-api instance; confirm data isolation (separate DB)
- 12.4: Production deploy — merge to `main`; confirm production URL serves the expected build; smoke test: signup, login, create contact, log activity
- 12.5: Custom domain — add DNS records per your host; confirm HTTPS/TLS is valid

### Requirements Covered

DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05

### Done When

- [ ] Navigating directly to `/contacts` returns the Contacts page, not a 404
- [ ] A staging build is reachable at its staging URL and hits staging n0crm-api (verified in DevTools network tab)
- [ ] Merging to `main` triggers a production deployment on your infrastructure that completes successfully
- [ ] The production custom domain serves the app over HTTPS with a valid TLS certificate
- [ ] Smoke test: signup → create org → invite member → create contact → log activity → all persist across refresh

---

## Phase 13: Future Work

**Goal:** Longer-horizon investments that are not yet started. Captured here to keep the backlog honest.
**Dependencies:** Phase 12 (production stable)

### Genuinely open items

- **SAML federation** — SAML 2.0 SP support for enterprises that cannot use OIDC; not designed or started
- **HA/DR automated failover** — restore runbook exists at `docs/disaster-recovery.md`; automated promotion/failover not implemented
- **Broader SSO provider testing/diagnostics** — OIDC is shipped, but only a narrow set of providers has been tested; diagnostics UI not built
- **Field-level security** — per-field visibility/edit restrictions for sensitive PII fields; not designed
- **Forecasting v2** — ML-assisted deal scoring and pipeline forecasting beyond the current heuristic; not started
- **AI v2** — streaming responses, multi-modal context, fine-tuned models, broader tool surface; not started
- **Industry pipeline templates** — sector-specific stage presets; not started
- **Formal certifications** — SOC 2 Type II, ISO 27001 audits; not started
- **Real background job queue** — BullMQ dependency present but unused; sequence runner uses a polling approach

### Done When

Each item will graduate to its own numbered phase when scoped and scheduled.

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
| DEPLOY-01 | Phase 12 | Pending Deploy |
| DEPLOY-02 | Phase 12 | Pending Deploy |
| DEPLOY-03 | Phase 12 | Pending Deploy |
| DEPLOY-04 | Phase 12 | Pending Deploy |
| DEPLOY-05 | Phase 12 | Pending Deploy |

**Requirements mapped:** Phases 1–11 complete; Phase 12 (production deployment) pending operator action; Phase 13 captures future backlog items.

---

*Roadmap created: 2026-03-31*
*Last updated: 2026-06-11 — Restructured phase list to eliminate duplicate Phase 11; renumbered production deployment to Phase 12; added Phase 11 (Enterprise Hardening, completed 2026-06-11) covering MFA/OIDC SSO/SCIM/RBAC/GDPR/AI/security-events/observability; added Phase 13 for genuinely-open future work; removed all Supabase references from plan text; corrected test counts to authoritative figures (263 frontend, 85 API); updated phase count to 13.*
