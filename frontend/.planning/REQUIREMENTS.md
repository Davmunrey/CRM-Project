# Requirements: Velo

**Defined:** 2026-03-31
**Core Value:** A sales team can sign up, invite their colleagues, and manage their entire pipeline in real-time — with lead scoring, reporting, and collaboration (no Anthropic/Claude LLM stack in product scope).

## Current Snapshot (2026-05-18)

- Execution source of truth: `.planning/STATE.md` and `.planning/ROADMAP.md`.
- Phases 1–10 complete (monorepo + infra hardening); Phase 11 (production deploy) pending operator action.
- **Architecture:** Monorepo — frontend/ (React 18 + Vite) + api/ (Fastify 5 + PostgreSQL 16 + Redis) + docker-compose.yml + privateprompt-app.json.
- **Backend:** velo-api (Fastify 5 + Node.js 22). JWT `{ sub, org, role, jti }` (HS256, no Supabase Auth).
- Gmail fully self-hosted via velo-api `/gmail/*` (PKCE + AES-256-GCM refresh token storage) — no Supabase Edge Function dependency.
- LinkedIn URL enrichment on contacts: migration 012, backend Zod schema, frontend form + detail display.
- Security hardened: Redis JWT denylist (jti tracking, revocation on logout), Socket.io JWT verification, AES-256-GCM encryption for secrets, auth rate limiting (10/15min), CSP headers, CORS guards.
- All CRM delete operations use REST API (no Supabase bypass). Team invite de-duplicated.
- Transactional emails (password reset, invitations) wired via nodemailer/Resend in velo-api.
- i18n: 6 languages (`en`, `es`, `pt`, `fr`, `de`, `it`), 1603 keys each, parity verified.
- Test suite: **218 passing, 1 skipped** (42 files). Build clean. CI: 3 Gitea workflows.
- Deployment: `docker-compose up` for local dev; Docker images for production; Private Prompt manifest available.

## v1 Requirements

### Authentication & Organizations

- [x] **AUTH-01**: User can sign up with email and password via velo-api JWT auth
- [x] **AUTH-02**: User receives email verification after signup
- [x] **AUTH-03**: User can reset password via email link
- [x] **AUTH-04**: User session persists across browser refresh (onAuthStateChange + `isLoadingAuth: true` initial state to prevent race condition redirect)
- [x] **AUTH-05**: User can log out and session is fully cleared
- [x] **AUTH-06**: New user creates an organization on first login (org name, slug)
- [x] **AUTH-07**: User can invite team members by email (velo-api `POST /orgs/me/invite`; invitation token stored in DB)
- [x] **AUTH-08**: Invited user receives email and can accept invitation to join organization
- [x] **AUTH-09**: User has a role within organization (owner, admin, member)
- [x] **AUTH-10**: All CRM data is scoped to organization via RLS — no cross-tenant data leakage

### Schema & Multi-Tenancy

- [x] **SCHEMA-01**: All core tables (contacts, companies, deals, activities, notifications, goals, sequences, automations, templates, products) have `organization_id uuid NOT NULL` column
- [x] **SCHEMA-02**: velo-api scopes all queries with `WHERE organization_id = ${req.user.org}` from JWT `org` claim (API-layer isolation, not DB-level RLS)
- [x] **SCHEMA-03**: velo-api issues JWT with `org` claim immediately after org creation or invitation accept — no DB trigger needed
- [x] **SCHEMA-04**: `organizations` and `organization_members` tables created with correct FK structure
- [x] **SCHEMA-05**: `gmail_tokens` table created to store refresh tokens server-side (never in browser)

### Data Migration — Core Stores

- [x] **DATA-01**: `contactsStore` migrated from Zustand `persist` to async velo-api calls (create, read, update, delete)
- [x] **DATA-02**: `companiesStore` migrated to velo-api
- [x] **DATA-03**: `dealsStore` migrated to velo-api
- [x] **DATA-04**: `activitiesStore` migrated to velo-api
- [x] **DATA-05**: `notificationsStore` migrated to velo-api
- [x] **DATA-06**: Seed data `onRehydrateStorage` hooks removed from all migrated stores
- [x] **DATA-07**: Loading states (`isLoading`, `error`) added to all migrated stores
- [x] **DATA-08**: Optimistic updates implemented with rollback on API error

### Data Migration — Secondary Stores

- [x] **DATA-09**: `goalsStore` migrated to velo-api
- [x] **DATA-10**: `sequencesStore` migrated to velo-api
- [x] **DATA-11**: `automationsStore` migrated to velo-api
- [x] **DATA-12**: `templateStore` migrated to velo-api
- [x] **DATA-13**: `productsStore` migrated to velo-api
- [x] **DATA-14**: `auditStore` migrated to velo-api
- [x] **DATA-15**: `customFieldsStore` migrated to velo-api

### Real-Time Sync

- [x] **REALTIME-01**: Contacts: Socket.io `__veloDbChange('contacts')` broadcasts to all connected org clients
- [x] **REALTIME-02**: Deals: Socket.io broadcast on create/update/delete
- [x] **REALTIME-03**: Activities: Socket.io broadcast on create/update/delete
- [x] **REALTIME-04**: Notifications: Socket.io broadcast on create

### Users & Assignment

- [x] **USERS-01**: MOCK_USERS replaced — all "assigned to" dropdowns pull from real org members via `useAuthStore`
- [x] **USERS-02**: Leaderboard analytics computed from real org members, not hardcoded names
- [x] **USERS-03**: Reports module computes performance metrics from real user list

### Security Fixes

- [x] **SEC-01**: `authStore` weak djb2 hash replaced by velo-api bcrypt auth — passwords never stored locally
- [x] **SEC-02**: Third-party LLM API keys are not stored in the browser; sensitive credentials belong only in Edge Function env (if a future non-browser LLM integration is approved)
- [x] **SEC-03**: `dangerouslySetInnerHTML` in `AIAgent.tsx` replaced with `react-markdown` + `rehype-sanitize`
- [x] **SEC-04**: Direct browser LLM SDKs and legacy client AI modules were removed (`aiService.ts`, `aiStore.ts`, `components/ai/*`). Any future assistive model, if approved, must use Edge-only proxies with secrets in function env — **not** Anthropic/Claude (see **AI Features** below).
- [x] **SEC-05**: Gmail access token stored in memory only (not localStorage); refresh token stored in `gmail_tokens` Supabase table
- [x] **SEC-06**: Dev-mode console warning when Supabase env vars are absent (currently silent no-op)

### AI Features

**Product decision:** The CRM does **not** ship Claude, Anthropic, or a `claude-proxy` Edge Function. Generative chat, Anthropic-backed drafting, and related items are **out of scope** unless replanned with an explicit non-Anthropic provider and security review.

- [x] **AI-01**: **Cancelled.** ~~Supabase Edge Function `claude-proxy` for Claude~~ — not pursued (no Anthropic integration).
- [x] **AI-02**: Lead scoring recalculates automatically when activity is logged for a contact — `activitiesStore.ts` calls `useLeadsStore.getState().recomputeLeadScore(lead.id)` on activity create (2026-05-13).
- [x] **AI-03**: **Cancelled.** ~~AI email drafting via generative model~~ — not pursued under current scope.
- [x] **AI-04**: **Cancelled.** ~~Call summary from pasted transcript~~ — not pursued under current scope.
- [x] **AI-05**: **Cancelled.** ~~AIAgent chat via Edge proxy to Anthropic~~ — not pursued (no Claude stack).

### Gmail Integration

- [x] **GMAIL-01**: Gmail OAuth uses Auth Code + PKCE flow (`initCodeClient`) — replaces current implicit token client that cannot obtain refresh tokens
- [x] **GMAIL-02**: Edge Function `gmail-oauth-exchange` exchanges authorization code for access + refresh tokens; stores refresh token in `gmail_tokens` table
- [x] **GMAIL-03**: Edge Function `gmail-refresh-token` refreshes access token when expired; returns short-lived token to browser only
- [x] **GMAIL-04**: Inbox view loads real Gmail threads via API using short-lived access token
- [x] **GMAIL-05**: Emails can be sent from within contact/deal detail pages
- [x] **GMAIL-06**: Incoming emails matched to contacts by sender email address; linked in activity feed

### Internationalization

- [x] **I18N-01**: English translation file `en.json` created covering all existing Spanish strings
- [x] **I18N-02**: Language switcher in Settings (or user profile) persists language preference

### Testing

- [x] **TEST-01**: Vitest configured with `@testing-library/react` and jsdom
- [x] **TEST-02**: Unit tests for `leadScoring.ts` (`computeLeadScore`, `calculateLeadScore`) — pure functions, highest priority
- [x] **TEST-03**: Unit tests for Zustand stores (contact CRUD, deal stage transitions) with Supabase client mocked
- [x] **TEST-04**: Unit tests for Zod schemas in form validation
- [x] **TEST-05**: GitHub Actions CI runs `vitest run` + `tsc --noEmit` on every PR

### Deployment

- [ ] **DEPLOY-01**: Static SPA hosting configured so all client routes resolve to `index.html` on cold load (**primary:** nginx `try_files`, Caddy `file_server` + `try_files`, or CDN/bucket rules on **private** infrastructure). Optional: checked-in `vercel.json` or Netlify `_redirects` for reference only — **not** the required production platform.
- [ ] **DEPLOY-02**: Production and preview/staging environments define `VITE_APP_CHANNEL` (`production` \| `staging`) and `VITE_API_URL` pointing to the correct velo-api instance (secrets never committed); `JWT_SECRET` and `CORS_ORIGIN` set on velo-api.
- [ ] **DEPLOY-03**: Staging builds set `VITE_APP_CHANNEL=staging` and point `VITE_API_URL` at a staging velo-api instance; production uses `VITE_APP_CHANNEL=production` and production-only API. Add every **staging and production origin** to `CORS_ORIGIN` on the API and to `EDGE_CORS_ORIGINS` for Supabase Edge Functions.
- [ ] **DEPLOY-04**: Production deployment on merge to `main` (or your protected release branch) with a recorded smoke pass
- [ ] **DEPLOY-05**: Custom domain + HTTPS (DNS + TLS per your hosting provider)

#### Recording DEPLOY completion (human-owned evidence)

Check **`DEPLOY-*`** only after the work exists on the **target** environment (not when templates or docs are updated alone). Capture evidence in one of: this file (short dated bullet under Traceability), [`.planning/STATE.md`](./STATE.md) Notes, or [`docs/master-release-qa.md`](../docs/master-release-qa.md) — include **deploy URL**, **`VITE_APP_CHANNEL`**, **velo-api URL** (staging vs prod), **smoke outcome** ([`docs/smoke-checklist-production.md`](../docs/smoke-checklist-production.md)), and **commit SHA or tag**.

**Agent / doc-only prep (2026-04-16):** [`docs/smoke-checklist-production.md`](../docs/smoke-checklist-production.md) extended with manager + onboarding steps so Phase 10 evidence has explicit gates when a human runs production smoke — **does not** check `DEPLOY-*` by itself.

## v2 Requirements

### Billing & Monetization

- **BILL-01**: Stripe integration — subscription plans (free tier, pro, enterprise)
- **BILL-02**: Usage limits enforced per plan (contacts limit, users limit, AI calls/month)
- **BILL-03**: Billing portal for plan upgrades, invoice downloads

### Advanced assistive features (v2 — not Anthropic-specific)

- **AI-ADV-01**: Automated email sequences with smart timing based on contact stage (rules/automation first; optional external model only if approved later)
- **AI-ADV-02**: Meeting prep brief from contact + company + deal data before calendar events (optional external summarization only if approved later)
- **AI-ADV-03**: Deal health score with churn risk alerts (rules/heuristics first)

### Integrations

- **INT-01**: Slack notifications for won/lost deals and overdue activities
- **INT-02**: Calendar sync (Google Calendar bidirectional)
- **INT-03**: HubSpot/Pipedrive CSV import wizard

### Mobile

- **MOB-01**: Progressive Web App (PWA) manifest for installable mobile experience

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native iOS/Android app | Responsive web sufficient for v1.0 |
| Self-hosted / on-premise | Supabase cloud only; on-premise adds ops complexity |
| Salesforce / HubSpot API sync | Bidirectional sync is high complexity; CSV import covers v1 |
| Video call integration | Outside core sales workflow |
| Anthropic/Claude LLM features | Product decision: not shipped; see **AI Features** |
| Vercel as production SPA host | Product/ops decision: private static hosting (nginx/Caddy/CDN) |
| AI fine-tuning on own data | Prompt engineering / rules cover v1 needs; fine-tuning is v3+ |
| Schema-per-tenant multi-tenancy | organization_id + RLS is sufficient and simpler to operate |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01–05 | Phase 1 | ✅ Complete |
| AUTH-01–05 | Phase 2 | ✅ Complete |
| AUTH-06–10 | Phase 3 | ✅ Complete |
| SEC-01–06 | Phase 4 | ✅ Complete |
| DATA-01–08 | Phase 5 | ✅ Complete |
| REALTIME-01–04 | Phase 5 | ✅ Complete |
| DATA-09–15 | Phase 6 | ✅ Complete |
| USERS-01–03 | Phase 6 | ✅ Complete |
| AI-01, AI-03–AI-05 | — | **Cancelled** (no Anthropic/Claude stack) |
| AI-02 | Phase 6 | ✅ Complete |
| GMAIL-01–06 | Phase 7 | ✅ Complete |
| I18N-01–02 | Phase 8 | ✅ Complete |
| TEST-01–05 | Phase 9 | ✅ Complete |
| DEPLOY-01–05 | Phase 11 | Pending Deploy |

**Coverage:**
- v1 requirements: 57 total
- Mapped to phases: 57
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-05-18 — Snapshot updated: Monorepo architecture documented, velo-api fully integrated (api/ subdirectory), Gmail fully self-hosted, LinkedIn enrichment complete, security hardened (Redis JWT denylist, Socket.io JWT verification, rate limiting, AES-256-GCM encryption), all Supabase bypass deletes replaced, Docker Compose deployment model documented. Phase 11 (production deploy) created for DEPLOY-01–05. Prior 2026-05-15 — Security audit (socket.io JWT, Redis denylist, AES-256-GCM). Prior 2026-05-13 — AI-02 marked complete (lead score recompute on activity).*
---

*Last updated (git): **2026-05-18***
