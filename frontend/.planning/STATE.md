---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Enterprise P0 Complete — Docs Audit In Progress
last_updated: "2026-06-11T00:00:00.000Z"
progress:
  total_phases: 10
  completed_phases: 10
  total_plans: 48
  completed_plans: 48
---

# n0CRM — Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** A sales team can sign up, invite their colleagues, and manage their entire pipeline in real-time, with data persisted in PostgreSQL via self-hosted Fastify API (`n0crm-api`) in a monorepo alongside the React frontend.
**Current focus:** Enterprise P0 hardening complete (MFA, OIDC SSO, SCIM 2.0, RBAC, GDPR, security-event audit log, multi-provider AI). Latest pushed work: docs audit.

## Current Status

**Milestone:** v1.0 — Enterprise P0 Complete
**Phase:** 10 of 10 — COMPLETE
**Next:** Production deploy (operator tasks: DEPLOY-01–05); docs audit ongoing

## Completed Phases

| Phase | Description | Completed |
|-------|-------------|-----------|
| 01 | Schema & Multi-Tenancy | 2026-03-31 |
| 02 | Auth (originally Supabase, migrated to n0crm-api JWT) | 2026-04-05 |
| 03 | Organization Onboarding | 2026-04-06 |
| 04 | Security Fixes | 2026-04-07 |
| 05 | Core Data Stores + Real-Time | 2026-04-07 |
| 06 | Secondary Stores & Real Users | 2026-04-08 |
| 07 | Gmail Integration | 2026-04-09 |
| 08 | i18n English | 2026-04-09 |
| 09 | Test Suite + i18n completo | 2026-04-10 |
| 09b | Post-Phase hardening (Gmail + UX + Quotes) | 2026-04-10 |
| 10 | Supabase → n0crm-api migration (all auth flows) | 2026-05-13 |

## Key Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Auth Code + PKCE for Gmail OAuth | initTokenClient cannot obtain refresh tokens | 2026-03-31 |
| All secrets proxied through n0crm-api | Anthropic / Gmail / AI provider secrets must never reach the browser; all AI calls go through the backend multi-provider service | 2026-03-31 |
| Free beta (no Stripe in v1.0) | Validate product before billing complexity | 2026-03-31 |
| isLoadingAuth default is true (02.4) | Cold render holds at null until auth/me resolves — prevents /login flash on hard refresh | 2026-03-31 |
| App-layer org scoping is the authoritative tenant control | RLS is opt-in defense-in-depth (see docs/adr/0001-tenant-isolation-and-rls.md) | 2026-03-31 |
| Per-file vi.mock() for store tests | Inline mocking gives explicit control per test file; vi.hoisted() used where mocks reference top-level consts | 2026-03-31 |
| ProtectedRoute returns null while loading (02.4) | No layout shift; loading is invisible until auth resolves | 2026-03-31 |
| react-markdown + rehype-sanitize in AI components | Replace dangerouslySetInnerHTML — live XSS vector eliminated | 2026-03-31 |
| nginx serves SPA + proxies /api to n0crm-api:3001 | Single origin for production; docker-compose orchestrates postgres + redis + api + web (nginx) | 2026-03-31 |
| Self-hosted monorepo replaces Supabase entirely | Schema already written; auth, RLS, Edge Functions, and all backend logic moved to n0crm-api (Fastify 5 / Node 22, PostgreSQL 16 via postgres.js, Redis 7, Socket.io 4) | 2026-05-13 |
| normalizeRole co-located in authStore.ts (03.4) | Avoids circular dependency with permissions.ts; keeps JWT parsing self-contained in the auth layer | 2026-04-06 |
| Activity logging in EmailComposer (07-5) | Single source of truth — avoids duplicating logic across ContactDetail, Deals, Inbox | 2026-04-09 |
| GmailTokenContext for in-memory access token (07-1) | Access token never persisted to localStorage — only email address stored in Zustand | 2026-04-09 |
| Deal/activity creation must map UUID fields correctly | Sending display names to UUID columns (assigned_to, created_by) caused inserts to fail and optimistic records to roll back | 2026-04-10 |
| Demo email seeds linked to deals/contacts | Improves first-run demo quality for Inbox, follow-ups, and quote-email scenarios | 2026-04-10 |
| Gmail redirect URI uses dynamic origin | Prevents OAuth callback failures when running on non-5173 local ports and preview URLs | 2026-04-10 |
| Gmail thread links persisted (gmail_thread_links) | Enables pin/unpin of thread-to-CRM relationships and stable context across sessions | 2026-04-10 |
| Gmail token refresh is on-demand in Inbox + composer | Avoids false disconnected states when in-memory token expires but server refresh token is valid | 2026-04-10 |
| Lazy-loaded chart-heavy pages (Dashboard, Reports, Forecast) | Reduces initial bundle pressure and keeps build chunk-size warnings under control | 2026-04-10 |
| Per-file vi.mock() without vi.hoisted() for store tests (09-2) | Mock data defined inside factory body avoids hoisting issues with top-level variable references | 2026-04-10 |
| Quote builder supports export/email actions | Reduces workflow friction by enabling immediate sharing from deal detail | 2026-04-10 |
| Zod schemas extracted to src/lib/schemas/ (09-3) | Unexported schemas inside .tsx files are untestable; extraction enables isolated unit tests | 2026-04-10 |
| TOTP MFA stored with AES-256-GCM cipher (migration 019) | Secret never stored in plaintext; RFC 6238 TOTP enforced server-side on login and enable/disable flows | 2026-05-20 |
| OIDC SSO uses PKCE S256 + JWKS RS256 verify (migration — env config) | Auth code flow with PKCE prevents interception; JWKS fetch validates IdP signatures; JIT provisioning via OIDC_DEFAULT_ROLE | 2026-05-20 |
| SCIM 2.0 authenticated by Bearer API key scoped "scim" | SCIM token maps to org via api_keys table — no separate provisioning credential; soft-deprovision + session revoke on deactivate | 2026-05-25 |
| Server-side RBAC (requirePermission / requireCrudPermission) | Roles owner/admin/manager/sales_rep/viewer enforced in middleware; client-side role gates are UX only — cannot be the security boundary | 2026-05-25 |
| Multi-provider AI: Gemini free default / OpenAI / Anthropic | Single backend service; per-org kill switch (settings.ai.enabled); AI_MONTHLY_TOKEN_CAP + per-org cap; AI_MESSAGE_RETENTION_DAYS purge; migration 018 | 2026-05-28 |
| Security-event audit log (security_events + recordSecurityEvent, migration 020) | Append-only table recording login success/failure, MFA events, password changes, GDPR erasure, SCIM provisioning — foundation for SOC2 evidence | 2026-05-30 |
| Public API key prefix n0crm_; scope leads:write required | POST /api/public/v1/leads returns 403 {error:"Insufficient API key scope", required:"leads:write"} without the scope; Settings > Integrations scope selector UI | 2026-06-01 |

## Blockers

- Google OAuth app verification (restricted Gmail scopes) takes 4–6 weeks for production approval — dev/test mode works for approved test accounts only.
- Production deploy not yet executed (DEPLOY-01 through DEPLOY-05 remain operator tasks).

## Notes (Monorepo + Infra Hardening — 2026-05-18)

**Monorepo structure:**
- `frontend/` — React 18 SPA (Vite, Tailwind, Zustand, React Router)
- `api/` — Fastify 5 backend (Node.js 22, PostgreSQL 16 via postgres.js camel-transform, Redis 7, Socket.io 4, BullMQ present but unused)
- `docker-compose.yml` — Orchestrates postgres + redis + api + web (nginx); API bound to 127.0.0.1:3001 in compose; production nginx proxies /api/* to api:3001
- `.gitea/workflows/` — CI: `ci.yml` (authoritative: frontend tests + type check), `build-production.yml` (frontend Docker), `build-api.yml` (api Docker)

**Infrastructure hardening (2026-05-14 security audit):**
- Socket.io JWT verification (was stub — now verifies with fast-jwt `createVerifier`)
- Redis JWT denylist (key: `jwt:deny:{jti}` with TTL) checked on every authenticated request
- All JWT sign calls include `jti: randomBytes(16).toString('hex')` for token revocation tracking
- Logout requires auth + revokes token via Redis denylist
- Auth routes rate-limited (10/15min) with helmet rate limiter
- Secrets encrypted with AES-256-GCM (OAuth refresh tokens, SMTP password, webhook signing secrets)
- CSP headers: `default-src 'none'; frame-ancestors 'none'`
- CORS: production wildcard guard, staging allows preview URLs

**Auth flow notes:**
- `isLoadingAuth` initializes as `true` — prevents race-condition redirect to /login on cold load
- Auth middleware: IS NULL branch for null-org JWT (PostgreSQL `= null` always false)
- `useDataInit` guards on both `currentUserId` and `organizationId` — prevents parallel 401s before org exists
- `POST /orgs` returns new JWT with org claim — frontend calls `setToken(res.token)` immediately
- `POST /invitations/:token/accept` validates email match before assigning user to org
- `POST /auth/forgot-password` always returns 200 (prevents email enumeration)
- `password_reset_tokens` table: migration `002` — 1-hour TTL, unique token per user

**Frontend + API contract:**
- All Supabase Edge Function calls removed from frontend — replaced with `/api/*` routes via n0crm-api
- Store responses unwrap `{ data: [] }` shape; JSON-string columns parsed via Zod `.safeParse()`
- Socket.io realtime via `window.__n0crmDbChange(table)` global bridge; org-scoped rooms; Redis-backed db:change broadcast

**Deployment ready:**
- Google OAuth verification (restricted scopes) pending: 4–6 week Google review for production users (dev/test mode works for approved test accounts)
- Build: `npm run build` + `npm run test:run` green (API: 85 tests / 12 files; frontend: 263 tests; 0 npm audit vulnerabilities)
- Docker images: `docker build` for frontend (nginx), `docker build` for api (Node.js)

---

## Notes (Enterprise P0 — through 2026-06-11)

**MFA (TOTP) — migration 019, shipped ~2026-05-20:**
- Backend: `POST /auth/mfa/setup` (generate secret + otpauth URI), `POST /auth/mfa/enable` (confirm possession), `POST /auth/mfa/disable` (re-auth password required)
- Login: when `mfa_enabled = true`, server returns `401 { mfaRequired: true }` after password check; client prompts for TOTP code; second `POST /auth/login` call with `mfaCode` field
- Secret stored as AES-256-GCM cipher (`mfa_secret_cipher`); RFC 6238 time-based OTP verified server-side (totp.js)
- Frontend: `SettingsMfaPanel` in Settings > Security (enroll / disable); login form shows TOTP code input on `mfaRequired: true` response
- Security events recorded: `mfa_enabled`, `mfa_disabled`, `login_mfa_required`, `login_mfa_failed`

**OIDC SSO — shipped ~2026-05-20:**
- Backend routes: `GET /auth/sso/status` → `{ enabled, issuer }`; `GET /auth/sso/start` → 302 to IdP with PKCE S256; `GET /auth/sso/callback` → exchange code, verify ID token (JWKS RS256), JIT-provision user, issue n0crm JWT
- PKCE state + nonce stored in Redis; OIDC_DEFAULT_ROLE env var controls provisioned role
- Frontend: Login page fetches `/auth/sso/status` on mount; SSO button rendered only when `enabled: true`
- Reference: `docs/sso-and-scim.md` (operator setup guide)

**SCIM 2.0 — shipped ~2026-05-25:**
- Endpoint prefix: `/scim/v2` — `GET/POST /Users`, `GET/PUT/PATCH/DELETE /Users/:id`, `GET /ServiceProviderConfig`
- Auth: Bearer API key with `scim` scope (minted in Settings > Integrations); key maps to org — no separate token
- Soft-deprovision on deactivate: `is_active = false` + all active sessions revoked
- Last-active-owner protection: cannot deactivate the last owner
- All provisioning events audit-logged
- Reference: `docs/sso-and-scim.md`

**Server-side RBAC + member lifecycle — shipped ~2026-05-25:**
- Roles: `owner`, `admin`, `manager`, `sales_rep`, `viewer`
- `requirePermission(perm)` and `requireCrudPermission(resource)` middleware in `api/src/middleware/rbac.ts` applied across all CRM CRUD routes, member management, API-key management, webhook management
- Member lifecycle: `PATCH /orgs/me/members/:id/role` and `PATCH /orgs/me/members/:id/status` with safety rules (cannot demote last owner, cannot deactivate self)

**GDPR — shipped ~2026-05-28:**
- `GET /privacy/export` — Art. 20 full org data export (portability); owner/admin gated
- `GET /privacy/subject/:contactId/export` — Art. 15 single subject export
- `POST /privacy/subject/:contactId/erase` — Art. 17 erase/anonymize PII; audit-logged as `gdpr_erasure`

**Security-event audit log — migration 020, shipped ~2026-05-30:**
- `security_events` table: append-only; `recordSecurityEvent(req, eventType, context)` called at all sensitive flows
- Events captured: login success/failure, MFA lifecycle, password changes/resets, GDPR erasure, SCIM provisioning, registration, SSO login, account lockout
- `GET /audit` route exposes events to owner/admin; frontend `AuditLog` page

**Multi-provider AI + governance — migration 018, shipped ~2026-05-28:**
- Providers: Gemini (free default), OpenAI, Anthropic — single `services/ai/` service with `availableProviders()`
- Per-org kill switch: `settings.ai.enabled` (org-level) — `GET /ai/status` reports `{ configured, enabled }`
- Spend cap: `AI_MONTHLY_TOKEN_CAP` env + per-org override (min wins); `ai_usage_log` table; 429 on cap exceeded
- Retention purge: `AI_MESSAGE_RETENTION_DAYS` env; background purge of `ai_conversations` rows
- Frontend: assistant drawer, next-best-action, Inbox summarize + draft-reply, AI insight chip
- OpenRouter was an early candidate but was not adopted; all AI calls go through the backend multi-provider service — no AI keys in the browser

**Observability:**
- `x-request-id` correlation header on every request/response
- `captureException` in `services/observability.ts`; optional `SENTRY_DSN`
- `/health`, `/health/ready`, `/health/live` health probes
- `/metrics` Prometheus endpoint gated to loopback / internal key; `Prometheus + Grafana` in docker-compose

**Genuinely open (not shipped):**
- SAML federation
- HA/DR automated failover (restore runbook: `docs/disaster-recovery.md`)
- Broader SSO provider testing/diagnostics
- Field-level security
- Forecasting v2; AI v2
- Industry pipeline templates
- Formal certifications (SOC2/ISO audits not yet conducted)
- Real background job queue (BullMQ present in api/ but unused — all async work is in-process)

---

*Initialized: 2026-03-31*
*Last session: 2026-04-10 — Gmail hardening shipped (dynamic redirect URI, refresh+retry, persisted thread links + migration + function deploy, plus `gmail_thread_workspace` migration), Quote Builder extended with export/email actions, demo inbox seeded with linked deal emails, and chart-heavy routes lazy-loaded to keep production bundles healthy. Test/build were green (**105** tests at that milestone; suite has grown since — see 2026-04-21 session note).*

*Session 2026-04-16 — `VITE_APP_CHANNEL` (production / staging / demo / local development), build-time validation in `vite.config.ts`, runtime alignment in `src/lib/envChannel.ts`, shell `EnvironmentBanner`, README + canonical docs + `.planning` requirements/stack/research updates.*

*Session 2026-04-21 — Documentation sweep: root `README` + `docs/project-state` codebase map + design-system doc control aligned with current tree (Automations, `src/i18n/seed/` automation rules, Knip `audit:unused`, Companies empty-state pattern, store/page counts). Vitest baseline: **36** files / **183** tests (`npm run test:run`).*

*Session 2026-04-21 (later) — Engineering closure batch: checkbox ownership matrix merged into `docs/project-state.md` + `docs/README` links; ROADMAP Phase 9 CI wording aligned with Gitea Actions; Automations/Sequences polish + shared **template library** dialog (`WorkflowTemplateLibraryDialog`, `workflowTemplateCatalog`); `fetchOrgUsers` after **OrgSetup** and **AcceptInvite**; `npm run build`, `npm run i18n:lint`, `npm run ui:lint` green on this snapshot. **`DEPLOY-01`–`DEPLOY-05` and production smoke** remain operator-owned.*

*Session 2026-04-22 — Canonical docs + planning aligned with self-hosted runtime: removed `demo` / offline-mock narrative from `docs/deployment-spa-and-env.md`, root `README.md`, masters, `project-state`, Gitea CI; `REQUIREMENTS` DEPLOY-02, `STACK`, `ROADMAP` 10.2; `STRUCTURE.md` map.*

*Session 2026-05-13 — Documentation audit post n0crm-api migration: deleted `.planning/research/supabase-multitenant.md` (pre-migration archive) and `.planning/research/deploy-testing.md`; stripped Supabase-auth sections from all docs. Runtime bug fixes: contacts/companies/deals stores now unwrap `{ data: [] }` API response shape; automationsStore/sequencesStore and others parse JSON-string columns returned as text from PostgreSQL; 5x `?.startsWith` guards; Zod `.parse()` → `.safeParse()` in companies + deals routes; deleted 4 obsolete GitHub Actions workflows; wired transactional emails via n0crm-api `sendEmail`; lead score recompute triggered on new activity. Build clean. 218 tests passing.*

*Session 2026-05-13 (API completion) — Implemented all missing n0crm-api endpoints for 100% functional parity: `GET/PATCH /:id` on companies, deals, activities, products, templates, quick-replies; `PATCH /auth/me`, `PATCH /auth/password`, `POST /auth/admin/reset-password`; full SMTP config CRUD + `POST /smtp/test`; webhook test delivery with HMAC-SHA256; API keys + lead capture tokens CRUD; migrations 003–005. Frontend: SettingsSmtpPanel, SettingsIntegrationsPanel, SettingsWebhooksPanel fully wired. Gmail OAuth fully self-hosted via n0crm-api /gmail/*.*

*Session 2026-05-14 (security hardening) — Full cybersecurity audit. Socket.io JWT verification; Redis JWT denylist; jti on all tokens; auth rate limiting; AES-256-GCM encryption for webhook secrets; API key rotation + webhook secret rotation endpoints; global 500 error scrubber; CSP `default-src 'none'; frame-ancestors 'none'`; client-side `enforceTokenExpiry()`; DOMPurify hardened; i18n stale strings updated. Both repos build clean.*

*Session 2026-05-15 (quality audit + LinkedIn enrichment + documentation sweep) — 35-page frontend audit: 95%+ route alignment confirmed. Critical bugs fixed: contactsStore/companiesStore `sbDelete`/`sbBulkDelete` replaced with `api.delete()` REST calls; authStore double-invite duplicate removed; CSVImport `assignedTo` hardcoded id replaced with `currentUser?.id`. LinkedIn enrichment: migration 012, backend + frontend (ContactForm input, ContactDetail display, contactsStore mapping). Both repos built clean and pushed.*

*Session 2026-05-18 (monorepo + docs sweep) — Moved n0crm-api from separate repo into monorepo under `api/`. Updated all planning docs. docker-compose.yml starts postgres + redis + api:3001 + web (nginx proxies /api/*). CI: 3 Gitea workflows. 218 tests passing, build clean.*

*Sessions 2026-05-20 through 2026-06-01 (enterprise P0) — MFA (TOTP, migration 019), OIDC SSO (PKCE S256, JWKS RS256, JIT provisioning), SCIM 2.0 (/scim/v2 Users CRUD + ServiceProviderConfig, soft-deprovision, session revoke, last-owner guard), server-side RBAC (requirePermission / requireCrudPermission across all CRM routes, roles owner/admin/manager/sales_rep/viewer), member lifecycle (PATCH role + status with safety rules), GDPR (/privacy export Art.20 + Art.15 + erasure Art.17), security-event audit log (security_events table + recordSecurityEvent, migration 020), multi-provider AI (Gemini/OpenAI/Anthropic, per-org kill switch, AI_MONTHLY_TOKEN_CAP, AI_MESSAGE_RETENTION_DAYS, migration 018), API-key scopes (leads:write, scim, scope selector UI in Settings > Integrations). Test counts: API 85 tests / 12 files; frontend 263 tests; 0 npm audit vulnerabilities. All enterprise P0 features shipped.*

*Session 2026-06-11 — Full .md docs audit: updated all planning + docs files to reflect post-Supabase, enterprise-hardened state. Stale Supabase/Edge-Function/OpenRouter-only-AI claims removed. Enterprise P0 session notes appended. docs/CODEBASE-MAP.md (full 403-file structural map) and docs/sso-and-scim.md added as reference docs.*
