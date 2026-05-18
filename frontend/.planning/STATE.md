---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Monorepo Complete — Infra Hardened — Ready for Deploy
last_updated: "2026-05-18T00:00:00.000Z"
progress:
  total_phases: 10
  completed_phases: 10
  total_plans: 48
  completed_plans: 48
---

# Velo — Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** A sales team can sign up, invite their colleagues, and manage their entire pipeline in real-time, with data persisted in PostgreSQL via self-hosted Fastify API (`velo-api`) in a monorepo alongside the React frontend.
**Current focus:** Monorepo complete, infra hardened (Docker, JWT, Socket.io, encryption), security audited, ready for production deploy.

## Current Status

**Milestone:** v1.0 — Monorepo Complete & Infra Hardened
**Phase:** 10 of 10 — COMPLETE
**Next:** Production deploy (operator tasks: DEPLOY-01–05)

## Completed Phases

| Phase | Description | Completed |
|-------|-------------|-----------|
| 01 | Schema & Multi-Tenancy | 2026-03-31 |
| 02 | Auth (originally Supabase, now velo-api JWT) | 2026-04-05 |
| 03 | Organization Onboarding | 2026-04-06 |
| 04 | Security Fixes | 2026-04-07 |
| 05 | Core Data Stores + Real-Time | 2026-04-07 |
| 06 | Secondary Stores & Real Users | 2026-04-08 |
| 07 | Gmail Integration | 2026-04-09 |
| 08 | i18n English | 2026-04-09 |
| 09 | Test Suite + i18n completo | 2026-04-10 |
| 09b | Post-Phase hardening (Gmail + UX + Quotes) | 2026-04-10 |
| 10 | Supabase → velo-api migration (all auth flows) | 2026-05-13 |

## Key Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Auth Code + PKCE for Gmail OAuth | initTokenClient cannot obtain refresh tokens | 2026-03-31 |
| Edge Functions for API key proxying | Anthropic + Gmail secrets must never reach the browser | 2026-03-31 |
| Free beta (no Stripe in v1.0) | Validate product before billing complexity | 2026-03-31 |
| isLoadingAuth default is true (02.4) | Cold render holds at null until auth/me resolves — prevents /login flash on hard refresh | 2026-03-31 |
| JWT claim for RLS (not JOIN subquery) | Performance critical — O(1) vs per-row subquery at scale | 2026-03-31 |
| Per-file vi.mock() for Supabase (02.0) | Inline mocking gives explicit control over each test file vs auto-hoisting | 2026-03-31 |
| ProtectedRoute returns null while loading (02.4) | No layout shift; loading is invisible until auth resolves | 2026-03-31 |
| react-markdown + rehype-sanitize | Replace dangerouslySetInnerHTML in AIAgent — live XSS vector | 2026-03-31 |
| Static frontend hosting (provider TBD) | Ship Vite `dist/` to a static host or CDN (any vendor with SPA rewrites + preview envs); keeps client-only architecture | 2026-03-31 |
| Supabase for backend | Schema already written, RLS built-in for multi-tenancy, SDK installed | 2026-03-31 |
| vi.hoisted() for test mock factories (02.1–02.3) | vi.mock() is hoisted above const declarations — vi.hoisted() evaluates at hoist time | 2026-03-31 |
| Anthropic SDK removed entirely (04.3) | dangerouslyAllowBrowser is a security anti-pattern; all AI calls go through OpenRouter fetch | 2026-04-05 |
| openRouterKey replaces apiKey as the single AI key guard (04.1) | Anthropic key never stored in browser | 2026-04-05 |
| Fallback chain for role: app_metadata first, then user_metadata (03.4) | app_metadata is server-controlled (DB trigger); user_metadata fallback preserves backwards-compat with existing mock flow | 2026-04-06 |
| normalizeRole co-located in authStore.ts (03.4) | Avoids circular dependency with permissions.ts; keeps JWT parsing self-contained in the auth layer | 2026-04-06 |
| Activity logging in EmailComposer (07-5) | Single source of truth — avoids duplicating logic across ContactDetail, Deals, Inbox | 2026-04-09 |
| GmailTokenContext for in-memory access token (07-1) | Access token never persisted to localStorage — only email address stored in Zustand | 2026-04-09 |
| Phase 08 i18n was pre-implemented | en.ts already had full key parity with es.ts; language switcher + persistence already in Settings | 2026-04-09 |
| supabase! non-null assertion inside isSupabaseConfigured guards (07) | isSupabaseConfigured is a boolean flag, not a TypeScript type guard | 2026-04-09 |
| create-org Edge Function bypasses RLS (09) | Supabase project uses ECC P-256 JWT signing — PostgREST can't verify with legacy anon key; service role in Edge Function is the correct pattern | 2026-04-10 |
| Deal/activity creation must map UUID fields correctly | Sending display names to UUID columns (`assigned_to`, `created_by`) caused inserts to fail and optimistic records to roll back | 2026-04-10 |
| Demo email seeds linked to deals/contacts | Improves first-run demo quality for Inbox, follow-ups, and quote-email scenarios | 2026-04-10 |
| Gmail redirect URI uses dynamic origin | Prevents OAuth callback failures when running on non-5173 local ports and preview URLs | 2026-04-10 |
| Gmail thread links persisted (`gmail_thread_links`) | Enables pin/unpin of thread-to-CRM relationships and stable context across sessions | 2026-04-10 |
| Gmail token refresh is on-demand in Inbox + composer | Avoids false disconnected states when in-memory token expires but server refresh token is valid | 2026-04-10 |
| Lazy-loaded chart-heavy pages (`Dashboard`, `Reports`, `Forecast`) | Reduces initial bundle pressure and keeps build chunk-size warnings under control | 2026-04-10 |
| Org creation validates session via `supabase.auth.getUser()` in page flow | Avoids false "not authenticated" errors caused by stale local Zustand user during org bootstrap | 2026-04-10 |
| Per-file vi.mock() without vi.hoisted() for store tests (09-2) | Mock data defined inside factory body avoids hoisting issues with top-level variable references | 2026-04-10 |
| Quote builder supports export/email actions | Reduces workflow friction by enabling immediate sharing from deal detail | 2026-04-10 |
| Supabase mode must never rehydrate demo users (post-Phase 09 fix) | `persist.merge` was re-injecting `SEED_USERS` and leaked demo users into real org sessions | 2026-04-10 |
| Zod schemas extracted to src/lib/schemas/ (09-3) | Unexported schemas inside .tsx files are untestable; extraction enables isolated unit tests | 2026-04-10 |

## Blockers

- Google OAuth app verification (restricted Gmail scopes) takes 4-6 weeks for production approval — dev/test mode works for approved test accounts only.
- Production deploy not yet executed (DEPLOY-01 through DEPLOY-05 remain operator tasks)

## Notes (Monorepo + Infra Hardening — 2026-05-18)

**Monorepo structure:**
- `frontend/` — React 18 SPA (Vite, Tailwind, Zustand, React Router)
- `api/` — Fastify 5 backend (Node.js 22, PostgreSQL 16, Redis, Socket.io, BullMQ)
- `docker-compose.yml` — Orchestrates postgres + redis + api + web (nginx) for local development and portable deployment
- `.gitea/workflows/` — CI: `ci.yml` (frontend tests + type check), `build-production.yml` (frontend Docker), `build-api.yml` (api Docker)

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
- `useDataInit` guards on both `currentUserId` and `organizationId` — prevents 14 parallel 401s before org exists
- `POST /orgs` returns new JWT with org claim — frontend calls `setToken(res.token)` immediately
- `POST /invitations/:token/accept` validates email match before assigning user to org
- `POST /auth/forgot-password` always returns 200 (prevents email enumeration)
- `password_reset_tokens` table: migration `002` — 1-hour TTL, unique token per user

**Frontend + API contract:**
- All Supabase Edge Function calls removed from frontend — replaced with `/api/*` routes via velo-api
- `supabase` stub: `null as unknown as SupabaseClient | null` — all `!supabase` guards fire correctly
- Store responses unwrap `{ data: [] }` shape; JSON-string columns parsed via Zod `.safeParse()`
- Socket.io realtime via `window.__veloDbChange(table)` global bridge

**Deployment ready:**
- Google OAuth verification (restricted scopes) pending: 4-6 week Google review for production users (dev/test mode works for approved test accounts)
- Build: `npm run build` + `npm run test:run` green (218 tests passing)
- Docker images: `docker build` for frontend (nginx), `docker build` for api (Node.js)

---
*Initialized: 2026-03-31*
*Last session: 2026-04-10 — Gmail hardening shipped (dynamic redirect URI, refresh+retry, persisted thread links + migration + function deploy, plus `gmail_thread_workspace` migration), Quote Builder extended with export/email actions, demo inbox seeded with linked deal emails, and chart-heavy routes lazy-loaded to keep production bundles healthy. Test/build were green (**105** tests at that milestone; suite has grown since — see 2026-04-21 session note).*

*Session 2026-04-16 — `VITE_APP_CHANNEL` (production / staging / demo / local development), build-time Supabase validation in `vite.config.ts`, runtime alignment in `src/lib/envChannel.ts` + `src/lib/supabase.ts`, shell `EnvironmentBanner`, README + canonical docs + `.planning` requirements/stack/research updates.*

*Session 2026-04-21 — Documentation sweep: root `README` + `docs/project-state` codebase map + design-system doc control aligned with current tree (Automations, `src/i18n/seed/` automation rules, Knip `audit:unused`, Companies empty-state pattern, store/page counts). Vitest baseline: **36** files / **183** tests (`npm run test:run`).*

*Session 2026-04-21 (later) — Engineering closure batch: checkbox ownership matrix merged into `docs/project-state.md` + `docs/README` links; ROADMAP Phase 9 CI wording aligned with Gitea Actions; Automations/Sequences polish + shared **template library** dialog (`WorkflowTemplateLibraryDialog`, `workflowTemplateCatalog`); `fetchOrgUsers` after **OrgSetup** and **AcceptInvite**; `npm run build`, `npm run i18n:lint`, `npm run ui:lint` green on this snapshot. **`DEPLOY-01`–`DEPLOY-05` and production smoke** remain operator-owned: attach host, channel, Supabase project, smoke outcome, and commit per `.planning/REQUIREMENTS.md` before ticking `[x]` there.*

*Session 2026-04-22 — Canonical docs + planning aligned with **Supabase-only** runtime: removed `demo` / offline-mock narrative from `docs/deployment-spa-and-env.md`, root `README.md`, `supabase/README.md`, masters, `project-state`, Gitea CI `vite build --mode development`; `REQUIREMENTS` DEPLOY-02, `STACK`, `ROADMAP` 10.2; `STRUCTURE.md` map (`SecurePasswordField`, `defaultAppSettings`, `securePassword`, `workflowLibrary`).*

*Session 2026-05-13 — Documentation audit post velo-api migration: deleted `.planning/research/supabase-multitenant.md` (44KB pre-migration archive) and `.planning/research/deploy-testing.md` (content in canonical docs); deleted `supabase/auth-email-templates/README.md` (Supabase Auth gone); stripped Supabase-auth sections from `supabase/README.md`, `master-security-compliance.md` (Auth/SSO handoff + external hardening checklist), `master-email-operations.md` (Supabase auth emails branding → transactional auth emails pending velo-api SMTP), `master-release-qa.md` (env vars + blocker notes), `docs/README.md`, `project-state.md`, `REQUIREMENTS.md`. All remaining Supabase references are for Edge Functions (Gmail, tracking, webhooks, public API) which remain deployed.*

*Session 2026-05-13 (continued) — Runtime bug fixes post-migration: contacts/companies/deals stores now unwrap `{ data: [] }` API response shape; automationsStore/sequencesStore/leadsStore/customFieldsStore/templateStore parse JSON-string columns (`actions`, `trigger`, `steps`, `flowDefinition`, `tags`, `metadata`, `options`, `variables`) returned as text from PostgreSQL; 5x `?.startsWith` guards (Notifications, AttachmentsList, Sidebar, Automations); Zod `.parse()` → `.safeParse()` in companies + deals routes; deleted 4 obsolete GitHub Actions workflows (supabase-remote-deploy, webhook-worker, types-drift, data-retention-purge); wired transactional emails (password reset + invitations) via velo-api `sendEmail`; lead score recompute triggered on new activity for linked contact. Build clean. 218 tests passing.*

*Session 2026-05-13 (API completion) — Implemented all missing velo-api endpoints to reach 100% functional parity: `GET/PATCH /:id` on companies, deals, activities, products, templates, quick-replies; `PATCH /auth/me`, `PATCH /auth/password`, `POST /auth/admin/reset-password`; full SMTP config CRUD (`GET/POST/DELETE /smtp`, `POST /smtp/test` via nodemailer with AES-256-GCM password encryption); webhook test delivery with HMAC-SHA256 signing (`POST /webhook-subscriptions/:id/test`); API keys + lead capture tokens CRUD (`/integrations/*`); migrations 003 (gmail_tokens), 004 (api_keys, lead_capture_tokens), 005 (users.phone, org_smtp_settings). Frontend: SettingsSmtpPanel fully wired (was throwing on every action); SettingsIntegrationsPanel migrated off Supabase Edge Functions; SettingsWebhooksPanel test delivery wired; authStore.changePassword/resetPassword made async + wired to velo-api; SettingsSsoScimPanel → static enterprise-only placeholder; SequenceMetricsPanel → static placeholder (table not in velo-api schema); enqueueBulkSends wired to /email/send. Gmail OAuth now fully self-hosted via velo-api /gmail/* — no longer blocked on Supabase Edge Functions.*

*Session 2026-05-14 (security hardening) — Full cybersecurity audit across both repos. velo-api: Socket.io JWT verification (was a comment/stub — rewrote with fast-jwt createVerifier); Redis JWT denylist (jwt:deny:{jti} with TTL) checked on every authenticated request; all JWT sign calls include `jti: randomBytes(16).toString('hex')`; logout now requires auth + revokes token; refresh rotates jti; bcrypt cost constant (`BCRYPT_ROUNDS=12`); JWT_SECRET min raised to 64 chars; auth routes rate-limited (10/15min); input validation hardened across sequences, customFields, audit, invitations, publicApi, emailTracking, smtp, apiKeys; open redirect guard on email tracking click; webhook inbound HMAC via timingSafeEqual; webhook custom-header SSRF blocklist; AES-256-GCM encryption for webhook signing secrets and inbound secrets; API key rotation endpoint (`POST /integrations/api-keys/:id/rotate`); webhook secret rotation (`POST /webhook-subscriptions/:id/rotate-secret`); global 500 error scrubber in production; CSP `default-src 'none'; frame-ancestors 'none'`; production CORS wildcard guard; Redis connect/close lifecycle. velo-crm: client-side session timeout enforcement (`enforceTokenExpiry()` before every API request); DOMPurify hardened (restricted URI schemes, forbidden tags/attrs); i18n stale Supabase strings updated (9+ keys per locale); `supabaseSession` dead field removed from authStore; `requireSupabase.ts` stub deleted. Docs updated: velo-api README (routes, migrations, env), master-security-compliance.md (auth table, JWT payload, ASVS, hardening checklist), REQUIREMENTS.md AI-02 marked done. Both repos build clean.*

*Session 2026-05-15 (quality audit + LinkedIn enrichment + documentation sweep) — 35-page frontend audit: confirmed 95%+ route alignment between velo-crm pages and velo-api routes. Critical bugs fixed: contactsStore/companiesStore `sbDelete`/`sbBulkDelete` (Supabase bypass) replaced with `api.delete()` REST calls; authStore double-invite (createInvitation fired API call AND TeamManagement.tsx also fired it — removed duplicate from createInvitation); CSVImport `assignedTo` hardcoded `'u1'` replaced with `currentUser?.id`. LinkedIn enrichment: migration 012 (`contacts.linkedin_url text`), backend (Zod schema + GET/POST/PATCH), frontend (`Contact.linkedinUrl`, ContactForm input, ContactDetail display with icon, contactsStore mapping). Documentation sweep: all .md files in both repos updated to reflect current state — Gmail no longer blocked, integrations complete, security hardened, LinkedIn enrichment documented. Both repos built clean and pushed to GitHub.*

*Session 2026-05-18 (monorepo structure + documentation sweep) — Moved velo-api from separate repo into monorepo under `api/` subdirectory. Updated all planning docs: CODEBASE.md (monorepo layout + api/ reference), PROJECT.md (monorepo intro, Git URLs), STATE.md (infra notes, CI workflows, Docker), ROADMAP.md (Phase 10 marked complete, monorepo notes), REQUIREMENTS.md (deployment model clarified), gmail-ai-features.md (archive notice updated), supabase/README.md (legacy notice). Confirmed: docker-compose.yml starts postgres + redis + api:3001 + web (nginx) proxies /api/* to api:3001. CI: 3 Gitea workflows (.gitea/workflows/ci.yml, build-production.yml, build-api.yml). Readiness: 218 tests passing, build clean, all DEPLOY-01–05 tasks remain operator-owned.*
