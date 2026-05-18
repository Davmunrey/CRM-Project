# Velo

## What This Is

Velo is a full-featured B2B SaaS CRM for Sales teams, built to compete with HubSpot and Pipedrive. It covers the full sales lifecycle — contacts, companies, deals pipeline, activities, sequences, forecasting, rule-based lead scoring, and Gmail integration — with multi-tenant organization isolation so any business can sign up and use it independently.

The product operates as a **monorepo**: React 18 SPA frontend (`frontend/`) + self-hosted Fastify REST API (`api/`) backed by PostgreSQL 16 and Redis. Auth is JWT-based (HS256, claims `{ sub, org, role, jti }`). All CRM data persisted in PostgreSQL; real-time via Socket.io. Gmail integration fully migrated to velo-api (no Supabase dependency). Deployable via `docker-compose up` from repo root or via Private Prompt. Next milestone: production deploy.

**Git:** GitHub: https://github.com/Davmunrey/velo-crm | Gitea: https://gitea.apps.privateprompt.tech/clovrlabs/velo-crm

**Documentation language:** `.planning/` and engineering master documents under `docs/` are maintained in **English**.

## Core Value

A sales team can sign up, invite their colleagues, and manage their entire pipeline in real-time from day one — with lead scoring, reporting, and Gmail-backed workflows (no Anthropic/Claude product stack).

## Requirements

### Validated

- ✓ Contacts CRUD with filters, bulk actions, CSV export, and slide-over form — existing
- ✓ Companies CRUD with industry/status/size filters and detail page — existing
- ✓ Deals Kanban + list view with drag & drop, mark Won/Lost — existing
- ✓ Activities feed with overdue highlighting and quick complete — existing
- ✓ Dashboard with KPI cards, revenue bar chart, deal funnel, recent activity — existing
- ✓ Reports: revenue forecast, won/lost donut, activities by type, conversion funnel — existing
- ✓ Calendar view for scheduled activities — existing
- ✓ Email sequences builder (Sequences page) — existing
- ✓ Automation rules engine (Automations page) — existing
- ✓ No Anthropic/Claude Edge or in-app chat route shipped (see `.planning/REQUIREMENTS.md` **AI Features**); minor settings/i18n cleanup may remain
- ✓ Gmail Inbox integrated view (PKCE OAuth + server refresh + persisted thread links) — existing
- ✓ Forecast page with revenue projections — existing
- ✓ Leaderboard and team performance metrics — existing
- ✓ Sales Goals tracking — existing
- ✓ Pipeline Timeline view — existing
- ✓ Email Templates library — existing
- ✓ Products catalog — existing
- ✓ Team Management (roles, invitations, org-scoped users) — existing
- ✓ Audit Log — existing
- ✓ Notifications system — existing
- ✓ i18n infrastructure ready (en/es/pt/fr/de/it) — existing
- ✓ Settings: tags, pipeline stages, users, JSON export/import, data reset — existing
- ✓ TypeScript strict mode throughout — existing
- ✓ Supabase schema.sql and database.types.ts already written — existing

### Active

- [ ] Phase 10 production deployment and release checklist (DEPLOY-01–05)
- [ ] Production environment validation (`VITE_API_URL`, `JWT_SECRET`, `RESEND_API_KEY` or SMTP, `REDIS_URL`)
- [x] Gmail fully migrated to velo-api `/gmail/*` routes — no longer uses Supabase Edge Functions (2026-05-13)
- [ ] End-to-end UAT: org bootstrap, team invitations, password reset email, quote export/email
- [x] Transactional emails wired: password reset + invitation accept links via `sendEmail` (velo-api nodemailer)
- [x] Org directory hydration: `fetchOrgUsers` populates `authStore.users` from `GET /users` on login/org-create/invite-accept

### Out of Scope

- Stripe billing / paid plans — free beta first; monetization after product-market fit
- Native mobile app — responsive web is sufficient for v1.0
- Self-hosted / on-premise deployment — Supabase cloud only in v1.0
- Third-party CRM import (Salesforce, HubSpot) — manual CSV import covers v1.0
- Video call integration — outside core sales workflow for now

## Context

**Current state (2026-05-18):** Monorepo complete (frontend/ + api/ in single repo). All CRM modules backed by velo-api (Fastify 5, Node.js 22, PostgreSQL 16) with 16 migrations. Auth is velo-api JWT (HS256, no Supabase Auth). Stores fetch from `VITE_API_URL` REST endpoints. Real-time via Socket.io. Gmail fully self-hosted via velo-api `/gmail/*` — no Supabase Edge Function dependency. LinkedIn URL enrichment on contacts (migration 012). Security hardened: Redis JWT denylist (jti tracking), Socket.io JWT verification, AES-256-GCM encryption for OAuth/SMTP/webhook secrets, auth rate limiting (10/15min), CSP headers. All delete operations use REST API (no Supabase bypass). Transactional emails (password reset, invitations) wired via nodemailer/Resend. Deployment: `docker-compose up` from repo root, or via Private Prompt using `privateprompt-app.json`.

**Known issues (current):**
- Production deploy not yet executed (DEPLOY-01–05 operator tasks)
- Google OAuth app verification for restricted Gmail scopes takes 4–6 weeks (blocks production Gmail for non-test users)

**Tech stack:** React 18, TypeScript (strict), Vite 8, Tailwind CSS 3, Zustand 5, React Router v6, React Hook Form + Zod v4, Recharts, @hello-pangea/dnd, date-fns, lucide-react. **Backend:** Fastify 5, postgres.js, BullMQ, Socket.io.

**Target market:** Spanish and European B2B sales teams. UI is multilingual (en/es/pt/fr/de/it).

## Constraints

- **Tech stack**: React 18 SPA + velo-api (Fastify 5 + PostgreSQL 16 + Redis) in monorepo; private static hosting (nginx/Caddy/CDN); Docker Compose for all-in-one deployment
- **Auth**: velo-api JWT (HS256, `{ sub, org, role, jti }`) — no Supabase Auth
- **Multi-tenancy**: API-layer filtering via `req.user.org` JWT claim on every query; no database-level RLS dependency
- **Budget**: Self-hosted stack; Supabase free tier retained only for legacy Edge Functions (email tracking, webhooks, public API)
- **Backwards compatibility**: localStorage no longer used for CRM data — all in PostgreSQL; `supabase` client is `null` at runtime

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Monorepo (frontend/ + api/) | Single repo simplifies CI/CD, deployment, and cross-team coordination | Adopted 2026-05-18 |
| velo-api (Fastify + PostgreSQL) for all backend | Full control over auth, schema, data layer, and realtime; no Supabase vendor lock-in | Adopted 2026-05 |
| Gmail fully self-hosted in velo-api `/gmail/*` | Eliminates dependency on Supabase Edge Functions; JWT + PKCE in velo-api | Adopted 2026-05-13 |
| Docker Compose for development + deployment | Orchestrates postgres + redis + api + frontend (nginx); portable across platforms | Adopted 2026-05-18 |
| JWT org + jti claims for tenant isolation + revocation | O(1) tenant resolution; Redis JWT denylist for logout + refresh rotation | Adopted 2026-05 |
| Socket.io realtime subscriptions | Synchronizes data across browser tabs and clients in real-time | Adopted 2026-04-07 |
| i18n 6-language baseline (en/es/pt/fr/de/it) | Reduces UX fragmentation for international teams and demos; 1603 keys each | Adopted |
| No client AI stack (Anthropic/Claude) | Product decision; AI features deferred to v2+ with non-Anthropic provider | Adopted 2026-04 |
| Persisted Gmail thread links (`gmail_thread_links`) | Enables explicit CRM linkage and avoids re-matching drift across sessions | Adopted 2026-04 |
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
*Last updated: 2026-05-18 — Monorepo structure documented (frontend/ + api/ + docker-compose.yml at root). Current state updated: Gmail fully self-hosted, LinkedIn enrichment complete, security hardened (Redis JWT denylist, Socket.io JWT verification, AES-256-GCM secrets, rate limiting), all Supabase bypass deletes replaced, transactional emails wired. Deployment model: `docker-compose up` or Private Prompt. GitHub/Gitea repos linked.*
---

*Last updated (git): **2026-05-18***
