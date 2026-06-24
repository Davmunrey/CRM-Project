# n0CRM

## What This Is

n0CRM is a full-featured B2B CRM for sales teams, covering the full sales lifecycle — contacts, companies, deals pipeline, activities, sequences, forecasting, rule-based lead scoring, Gmail integration, multi-provider AI assistance, and enterprise identity/compliance controls. Multi-tenant organization isolation means each tenant operates independently within the same deployment.

The product is **self-hosted**: a monorepo comprising a React 18 SPA frontend (`frontend/`) and a Fastify 5 REST API (`api/`) backed by PostgreSQL 16 (via postgres.js, camel-transform) behind PgBouncer, and Redis 7. Auth is JWT-based (HS256, claims `{ sub, org, role, jti }`). All CRM data persists in PostgreSQL; real-time updates via Socket.io 4 (org-scoped rooms, Redis-backed broadcast). Deployed via `docker-compose up` from the repo root; in production the SPA is served by nginx and the API is proxied under `/api`.

There is **no Supabase dependency** anywhere in the production stack. No Edge Functions, no Supabase Auth, no supabase client at runtime.

**Git:** Gitea (authoritative): `https://gitea-clovrlabs.apps.privateprompt.tech/clovrlabs/n0CRM` — CI: `.gitea/workflows/ci.yml`

**Documentation language:** `.planning/` and engineering master documents under `docs/` are maintained in **English**.

## Core Value

A sales team can be onboarded, invite colleagues, and manage their entire pipeline in real-time from day one — with lead scoring, reporting, Gmail-backed workflows, in-app AI assistance (Gemini / OpenAI / Anthropic), and enterprise-grade identity controls (MFA, OIDC SSO, SCIM provisioning, server-side RBAC, GDPR tooling) required for mid-market and enterprise deals.

## Requirements

### Validated

#### CRM Core
- ✓ Contacts CRUD with filters, bulk actions, CSV export, and slide-over form — existing
- ✓ Companies CRUD with industry/status/size filters and detail page — existing
- ✓ Deals Kanban + list view with drag & drop, mark Won/Lost — existing
- ✓ Activities feed with overdue highlighting and quick complete — existing
- ✓ Dashboard with KPI cards, revenue bar chart, deal funnel, recent activity — existing
- ✓ Reports: revenue forecast, won/lost donut, activities by type, conversion funnel — existing
- ✓ Calendar view for scheduled activities — existing
- ✓ Email sequences builder (Sequences page) with 60s polling worker advancing email + wait steps — existing
- ✓ Automation rules engine (Automations page) — existing
- ✓ Gmail Inbox integrated view (PKCE OAuth + server refresh + persisted thread links) — existing
- ✓ Forecast page with revenue projections — existing
- ✓ Leaderboard and team performance metrics — existing
- ✓ Sales Goals tracking — existing
- ✓ Pipeline Timeline view — existing
- ✓ Calendar + Timeline board views (Deals) — existing
- ✓ Updates & @mentions (collaboration) — existing
- ✓ Composable dashboard widgets — existing
- ✓ No-code automation recipe center — existing
- ✓ Web-to-lead form builder (public /forms/:token) — existing
- ✓ Deal rotting + activity reminders — existing
- ✓ Tickets / help desk — existing
- ✓ Meeting scheduler / booking links (public /book/:token) — existing
- ✓ Email Templates library — existing
- ✓ Products catalog — existing
- ✓ Notifications system — existing
- ✓ i18n infrastructure ready (en/es/pt/fr/de/it) — existing
- ✓ Settings: tags, pipeline stages, users, JSON export/import, data reset — existing
- ✓ TypeScript strict mode throughout — existing

#### Multi-Provider AI (migration 018)
- ✓ Gemini (free default) / OpenAI / Anthropic — drop-in provider abstraction — existing
- ✓ Tool-using CRM agent with persisted conversations — existing
- ✓ In-app AI assistant drawer — existing
- ✓ Next-best-action suggestions, Inbox summarize + draft-reply — existing
- ✓ Per-org kill switch (`settings.ai.enabled`), `AI_MONTHLY_TOKEN_CAP`, `AI_MESSAGE_RETENTION_DAYS` purge — existing

#### Enterprise Identity & Compliance
- ✓ MFA (TOTP, RFC 6238) — `/auth/mfa/setup·enable·disable`; AES-256-GCM secret; login code prompt; Settings > Security enroll UI (migration 019) — existing
- ✓ OIDC SSO — `/auth/sso/status·start·callback`; PKCE S256; JWKS RS256 verify; JIT provisioning; `OIDC_DEFAULT_ROLE`; frontend SSO button gated by `/auth/sso/status` — existing
- ✓ SCIM 2.0 — `/scim/v2/Users` CRUD + ServiceProviderConfig; Bearer API-key scoped `scim`; soft-deprovision + session revoke; last-active-owner protection; audit-logged — existing
- ✓ Server-side RBAC (`requirePermission` / `requireCrudPermission`) across CRM CRUD, member, API-key, and webhook management; roles: owner / admin / manager / sales_rep / viewer — existing
- ✓ Member lifecycle — `PATCH /orgs/me/members/:id/role·status` with owner-safety rules — existing
- ✓ GDPR — `/privacy/export` (Art. 20 org portability), `/privacy/subject/:id/export` (Art. 15), `/privacy/subject/:id/erase` (Art. 17 anonymise); owner/admin gated — existing
- ✓ Security-event audit log — `security_events` table + `recordSecurityEvent`; logged on auth, MFA, SSO, SCIM, erasure (migration 020) — existing

#### Platform
- ✓ Public API — `POST /api/public/v1/leads` authenticated by `x-api-key: <key>` (prefix `n0crm_`, minted in Settings > Integrations); requires scope `leads:write` — existing
- ✓ API-key scopes (`leads:write`, `scim`) + Settings > Integrations scope-selector UI — existing
- ✓ Team Management (roles, invitations, org-scoped users) — existing
- ✓ Audit Log page — existing
- ✓ Observability: `x-request-id` correlation, `/health`, `/health/ready`, `/health/live`, `/metrics` (Prometheus, loopback/internal-key gated), optional `SENTRY_DSN` — existing
- ✓ Gmail OAuth callback as frontend route `{origin}/auth/gmail/callback` (GmailCallback.tsx) — existing

### Active

- [ ] Phase 10 production deployment and release checklist (DEPLOY-01–05)
- [ ] Production environment validation (`VITE_API_URL`, `JWT_SECRET`, `RESEND_API_KEY` or SMTP, `REDIS_URL`)
- [ ] End-to-end UAT: org bootstrap, team invitations, password reset email, quote export/email
- [x] Gmail fully self-hosted — no Supabase Edge Function dependency (2026-05-13)
- [x] Transactional emails wired: password reset + invitation accept links via `sendEmail` (nodemailer)
- [x] Org directory hydration: `fetchOrgUsers` populates `authStore.users` from `GET /users` on login/org-create/invite-accept

### Out of Scope

- Stripe billing / paid plans — free beta first; monetization after product-market fit
- Native mobile app — responsive web is sufficient for v1.0
- Third-party CRM import (Salesforce, HubSpot) — manual CSV import covers v1.0
- Video call integration — outside core sales workflow for now
- SAML federation — OIDC SSO covers current requirement; SAML deferred
- HA/DR automated failover — restore runbook exists at `docs/disaster-recovery.md`; automated failover not yet implemented
- Formal certifications (SOC 2 / ISO 27001 audits) — controls are in place; audit engagement not yet scheduled
- Sequence runner: A/B variants, call/linkedin task steps, `sequence_step_events`, Prometheus sequence metrics — deferred to v2
- Real background job queue (BullMQ present but unused in production)

## Context

**Current state (2026-06-14):** Monorepo complete (`frontend/` + `api/` + `docker-compose.yml` at root). 29 migrations. All CRM modules backed by n0crm-api (Fastify 5, Node.js 22, PostgreSQL 16). Auth: JWT HS256, no Supabase Auth. Real-time via Socket.io. Gmail fully self-hosted via `/gmail/*`. Enterprise controls shipped: MFA (TOTP), OIDC SSO, SCIM 2.0, server-side RBAC, GDPR privacy endpoints, security-event audit log, multi-provider AI (Gemini/OpenAI/Anthropic) with governance. CRM-competitive + Monday-style features shipped: Updates & @mentions, Calendar + Timeline board views, composable dashboard widgets, no-code automation recipe center, web-to-lead forms, deal rotting + activity reminders, tickets / help desk, meeting scheduler / booking links. API: 105 tests across 16 files; frontend: 273 tests; npm audit: 0 vulnerabilities. A full end-to-end product audit (2026-06-14) fixed ~41 issues across 7 commits (migrations 026–029): tickets-auth, deal stage-id alignment, the owner-name model (`assigned_to` is now a display-name string, not a user-id FK), server-side bulk email, an admin create-member endpoint, transport-independent sequence reply-detection, MFA QR, per-day booking availability, + store-rollback/UI-crash/contract fixes. CI on Gitea (`.gitea/workflows/ci.yml`). Seed admin: `admin@n0crm.local`.

**Known issues (current):**
- Production deploy not yet executed (DEPLOY-01–05 operator tasks)
- Google OAuth app verification for restricted Gmail scopes takes 4–6 weeks (blocks production Gmail for non-test users)

**Tech stack:**
- **Frontend:** React 18, TypeScript (strict), Vite, Tailwind CSS 3, Zustand, React Router v6, React Hook Form + Zod, Recharts, @hello-pangea/dnd, date-fns, lucide-react
- **Backend:** Fastify 5, Node 22, postgres.js (camel-transform), PgBouncer (transaction pooling), Redis 7 (ioredis), Socket.io 4, BullMQ (present; unused)

**Target market:** Spanish and European B2B sales teams. UI is multilingual (en/es/pt/fr/de/it).

## Constraints

- **Deployment model**: Self-hosted monorepo; Docker Compose orchestrates postgres + pgbouncer + redis + api + frontend (nginx); API on port 3001 (127.0.0.1 bound); frontend dev on 5173; production SPA via nginx proxied under `/api`
- **Auth**: JWT HS256, claims `{ sub, org, role, jti }`; Redis JWT denylist (`jti` tracking) for logout + refresh rotation
- **Multi-tenancy**: App-layer org scoping via `req.user.org` on every query is the authoritative control; RLS is opt-in defense-in-depth (see `docs/adr/0001-tenant-isolation-and-rls.md`)
- **No Supabase**: No Supabase Auth, no Edge Functions, no Supabase client at runtime — fully removed
- **AI providers**: Gemini (free default, no API-key needed for flash tier); OpenAI and Anthropic require `AI_OPENAI_KEY` / `AI_ANTHROPIC_KEY` env vars; provider selection is per-org at runtime
- **Naming**: Display name `n0CRM`; package slug `n0crm`

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Self-hosted monorepo (frontend/ + api/) | Full control over auth, schema, data layer, realtime, and compliance posture; no vendor lock-in | Adopted 2026-05 |
| Fastify 5 + PostgreSQL 16 + Redis 7 | Performance, type-safety, proven multi-tenant data layer | Adopted 2026-05 |
| Gmail fully self-hosted in `/gmail/*` | Eliminates Supabase Edge Function dependency; JWT + PKCE in n0crm-api | Adopted 2026-05-13 |
| Docker Compose for development + deployment | Orchestrates all services portably; single `docker-compose up` from repo root | Adopted 2026-05-18 |
| JWT org + jti claims for tenant isolation + revocation | O(1) tenant resolution; Redis JWT denylist for logout + refresh rotation | Adopted 2026-05 |
| Socket.io org-scoped rooms, Redis-backed broadcast | Synchronizes data across browser tabs and clients per org in real-time | Adopted 2026-04 |
| i18n 6-language baseline (en/es/pt/fr/de/it) | Reduces UX fragmentation for international teams; 1603 keys each | Adopted |
| Multi-provider AI (Gemini/OpenAI/Anthropic) | Avoids single-vendor AI lock-in; Gemini free tier lowers cost floor | Adopted 2026-05 |
| AI governance: per-org kill switch + token cap + retention purge | Keeps enterprise customers able to disable or scope AI spend | Adopted 2026-05 |
| MFA TOTP (RFC 6238, AES-256-GCM secret) | Security baseline for enterprise accounts; no dependency on SMS/carrier | Adopted 2026-05 |
| OIDC SSO with PKCE S256 + JWKS verify + JIT provisioning | Covers enterprise IdP requirements (Okta, Azure AD, etc.) without SAML complexity | Adopted 2026-05 |
| SCIM 2.0 user provisioning | Enables IdP-driven user lifecycle management; required for enterprise deals | Adopted 2026-05 |
| Server-side RBAC (requirePermission) | Consistent, auditable permission enforcement independent of client state | Adopted 2026-05 |
| GDPR endpoints (export/erasure Art. 15/17/20) | Regulatory requirement for EU customers; owner/admin gated | Adopted 2026-05 |
| Security-event audit log (security_events) | SOC 2-aligned evidence trail for auth, MFA, SCIM, and erasure events | Adopted 2026-05 |
| Public API key scopes (leads:write, scim) | Least-privilege API access; scope mismatch returns 403 with required-scope payload | Adopted 2026-05 |
| Gitea as authoritative remote | Private Prompt infrastructure; GitHub is a mirror only | Adopted 2026-05 |
| Persisted Gmail thread links (gmail_thread_links) | Enables explicit CRM linkage and avoids re-matching drift across sessions | Adopted 2026-04 |
| Quote actions inside deal detail (export/email) | Keeps quoting workflow inside one screen with fewer context switches | Adopted 2026-04 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-11 — Corrected inverted facts: product is self-hosted (not Supabase-cloud-only) and ships multi-provider AI (Gemini/OpenAI/Anthropic). Removed all Supabase and velo-crm references. Added enterprise features to Validated: MFA (TOTP), OIDC SSO, SCIM 2.0, server-side RBAC, GDPR privacy endpoints, security-event audit log, AI governance. Updated Key Decisions, Constraints, Out-of-Scope, Context, and Git remote to current state.*
---
