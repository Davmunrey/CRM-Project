# Requirements: n0CRM

**Defined:** 2026-03-31
**Core Value:** A sales team can sign up, invite colleagues, and manage their entire pipeline in real-time — with lead scoring, AI-assisted actions, reporting, and enterprise-grade security controls.

## Current Snapshot (2026-06-11)

- Execution source of truth: `.planning/STATE.md` and `.planning/ROADMAP.md`.
- Phases 1–10 complete (monorepo + infra + enterprise hardening); Phase 11 (production deploy) pending operator action.
- **Architecture:** Self-hosted monorepo — `frontend/` (React 18 + Vite + Zustand + Tailwind) + `api/` (Fastify 5 + PostgreSQL 16 + Redis 7 + Socket.io 4) + `docker-compose.yml`.
- **Backend:** n0crm-api — Fastify 5 / Node 22. JWT `{ sub, org, role, jti }` (HS256). PostgreSQL 16 via postgres.js (camel transform) behind PgBouncer (transaction pooling). Redis 7 (ioredis) for JWT denylist and Socket.io adapter.
- Gmail fully self-hosted: backend routes `POST /gmail/oauth-start` and `POST /gmail/oauth-exchange` (PKCE + AES-256-GCM refresh-token storage in `gmail_tokens` table). Frontend callback at `{origin}/auth/gmail/callback` (`GmailCallback.tsx`) posts back to opener — no Supabase, no Edge Functions.
- LinkedIn URL enrichment on contacts: migration 012, backend Zod schema, frontend form + detail display.
- Security hardened: Redis JWT denylist (jti tracking, revocation on logout), Socket.io JWT verification, AES-256-GCM encryption for secrets, auth rate limiting (10/15 min), CSP headers, CORS guards, account lockout, security-event audit log.
- All CRM delete operations use REST API. Team invite de-duplicated.
- Transactional emails (password reset, invitations) wired via nodemailer/Resend in n0crm-api.
- i18n: 6 languages (`en`, `es`, `pt`, `fr`, `de`, `it`), parity verified.
- **Test suite: API 105 passing across 16 files; frontend 273 passing across 44 files. 0 audit vulnerabilities.** CI: Gitea — `.gitea/workflows/ci.yml` (canonical), `build-api.yml`, `build-production.yml`.
- **Multi-provider AI delivered:** Gemini free default / OpenAI / Anthropic. Tool-using CRM agent, persisted conversations, assistant drawer (`AiAssistant.tsx` embedded in layout), per-contact/deal/inbox `AiInsight` next-best-action widget, Inbox summarize + draft-reply. Governance: per-org kill switch (`settings.ai.enabled`), `AI_MONTHLY_TOKEN_CAP`, `AI_MESSAGE_RETENTION_DAYS` purge cron (migration 018).
- **Enterprise features shipped:** MFA (TOTP, RFC 6238; migration 019), OIDC SSO (PKCE S256, JWKS RS256, JIT provisioning; migration 019/020), SCIM 2.0 (RFC 7643/7644; scim-scoped Bearer key), server-side RBAC (`requirePermission` / `requireCrudPermission`; roles: `owner / admin / manager / sales_rep / viewer`), member lifecycle (role + status PATCH with safety rules), GDPR API routes (Art. 15/17/20), security-event audit log (migration 020).
- Public API: `POST /api/public/v1/leads` authenticated by header `x-api-key: <key>` (prefix `n0crm_`); requires scope `leads:write`; minted in Settings > Integrations. API-key scope selector UI shows scopes per key (`leads:write`, `scim`).
- Deployment: `docker-compose up` for local dev (API on `127.0.0.1:3001`, frontend dev on 5173); Docker images + nginx SPA proxy for production.

## v1 Requirements

### Authentication & Organizations

- [x] **AUTH-01**: User can sign up with email and password via n0crm-api JWT auth
- [x] **AUTH-02**: User receives email verification after signup
- [x] **AUTH-03**: User can reset password via email link
- [x] **AUTH-04**: User session persists across browser refresh (onAuthStateChange + `isLoadingAuth: true` initial state to prevent race-condition redirect)
- [x] **AUTH-05**: User can log out and session is fully cleared (JWT jti revoked in Redis denylist)
- [x] **AUTH-06**: New user creates an organization on first login (org name, slug)
- [x] **AUTH-07**: User can invite team members by email (`POST /orgs/me/invite`; invitation token stored in DB)
- [x] **AUTH-08**: Invited user receives email and can accept invitation to join organization
- [x] **AUTH-09**: User has a role within organization (`owner`, `admin`, `manager`, `sales_rep`, `viewer`)
- [x] **AUTH-10**: All CRM data is org-scoped via `WHERE organization_id = ${req.user.org}` at the API layer (app-layer isolation is authoritative; RLS is opt-in defense-in-depth per `docs/adr/0001-tenant-isolation-and-rls.md`)

### Schema & Multi-Tenancy

- [x] **SCHEMA-01**: All core tables (contacts, companies, deals, activities, notifications, goals, sequences, automations, templates, products) have `organization_id uuid NOT NULL` column
- [x] **SCHEMA-02**: n0crm-api scopes all queries with `WHERE organization_id = ${req.user.org}` from JWT `org` claim
- [x] **SCHEMA-03**: n0crm-api issues JWT with `org` claim immediately after org creation or invitation accept
- [x] **SCHEMA-04**: `organizations` and `organization_members` tables created with correct FK structure
- [x] **SCHEMA-05**: `gmail_tokens` table stores refresh tokens server-side (AES-256-GCM encrypted; never sent to browser)

### Data Migration — Core Stores

- [x] **DATA-01**: `contactsStore` uses async n0crm-api calls (create, read, update, delete)
- [x] **DATA-02**: `companiesStore` uses n0crm-api
- [x] **DATA-03**: `dealsStore` uses n0crm-api
- [x] **DATA-04**: `activitiesStore` uses n0crm-api
- [x] **DATA-05**: `notificationsStore` uses n0crm-api
- [x] **DATA-06**: Seed data `onRehydrateStorage` hooks removed from all stores
- [x] **DATA-07**: Loading states (`isLoading`, `error`) in all stores
- [x] **DATA-08**: Optimistic updates with rollback on API error

### Data Migration — Secondary Stores

- [x] **DATA-09**: `goalsStore` uses n0crm-api
- [x] **DATA-10**: `sequencesStore` uses n0crm-api
- [x] **DATA-11**: `automationsStore` uses n0crm-api
- [x] **DATA-12**: `templateStore` uses n0crm-api
- [x] **DATA-13**: `productsStore` uses n0crm-api
- [x] **DATA-14**: `auditStore` uses n0crm-api
- [x] **DATA-15**: `customFieldsStore` uses n0crm-api

### Real-Time Sync

- [x] **REALTIME-01**: Contacts: Socket.io `db:change('contacts')` broadcasts to all connected org clients (org-scoped rooms, Redis-backed adapter)
- [x] **REALTIME-02**: Deals: Socket.io broadcast on create/update/delete
- [x] **REALTIME-03**: Activities: Socket.io broadcast on create/update/delete
- [x] **REALTIME-04**: Notifications: Socket.io broadcast on create

### Users & Assignment

- [x] **USERS-01**: All "assigned to" dropdowns pull from real org members via `useAuthStore`
- [x] **USERS-02**: Leaderboard analytics computed from real org members
- [x] **USERS-03**: Reports module computes performance metrics from real user list

### Security

- [x] **SEC-01**: `authStore` weak djb2 hash replaced by n0crm-api bcrypt auth — passwords never stored locally
- [x] **SEC-02**: All LLM API keys are server-only env vars in n0crm-api; never sent to the browser
- [x] **SEC-03**: `dangerouslySetInnerHTML` in AI chat replaced with `react-markdown` + `rehype-sanitize`
- [x] **SEC-04**: Direct browser LLM SDKs removed; all AI calls go through n0crm-api proxy routes (`/ai/*`) which enforce org-scoped auth
- [x] **SEC-05**: Gmail access token kept in memory only; refresh token stored AES-256-GCM encrypted in `gmail_tokens` table
- [x] **SEC-06**: Auth rate limiting (10 attempts / 15 min); account lockout on repeated failures

### AI Features

- [x] **AI-01**: Multi-provider AI service (`gemini` | `openai` | `anthropic`). Gemini free default; OpenAI and Anthropic are drop-in alternatives configured via API key env vars. Provider normalized to a single `AiMessage` / `AiToolDef` wire format (`api/src/services/ai/providers.ts`).
- [x] **AI-02**: Lead scoring recalculates automatically when activity is logged for a contact — `activitiesStore.ts` calls `useLeadsStore.getState().recomputeLeadScore(lead.id)` on activity create.
- [x] **AI-03**: Tool-using CRM agent loop (`api/src/services/ai/agent.ts` + `tools.ts`); persisted conversation history; `POST /ai/agent` route.
- [x] **AI-04**: Global AI assistant drawer (`AiAssistant.tsx`) mounted in layout shell; per-contact/deal/inbox `AiInsight` next-best-action widget.
- [x] **AI-05**: Inbox AI — `POST /ai/summarize` (thread summarization) and `POST /ai/draft-reply` (reply drafting).
- [x] **AI-06**: AI governance — per-org kill switch (`settings.ai.enabled`); `AI_MONTHLY_TOKEN_CAP` spend cap; `AI_MESSAGE_RETENTION_DAYS` purge cron (migration 018).

### Enterprise — MFA

- [x] **ENT-MFA-01**: TOTP MFA per RFC 6238; AES-256-GCM encrypted secret in `users` table (migration 019)
- [x] **ENT-MFA-02**: Enroll via Settings > Security (`SettingsMfaPanel.tsx`): `POST /auth/mfa/setup` → show QR → `POST /auth/mfa/enable` with TOTP code
- [x] **ENT-MFA-03**: Disable via `POST /auth/mfa/disable` (requires current password re-auth)
- [x] **ENT-MFA-04**: Login challenge: when MFA is enabled the JWT is not issued until the TOTP code is verified

### Enterprise — OIDC SSO

- [x] **ENT-SSO-01**: `GET /auth/sso/status` returns `{ enabled, issuer }` for frontend gate
- [x] **ENT-SSO-02**: `GET /auth/sso/start` redirects to IdP authorize URL (PKCE S256, state+nonce in Redis)
- [x] **ENT-SSO-03**: `GET /auth/sso/callback` verifies state, validates ID token via JWKS RS256, JIT-provisions user (`OIDC_DEFAULT_ROLE`), issues org-scoped JWT
- [x] **ENT-SSO-04**: Frontend SSO button on login page is gated by `/auth/sso/status`; redirects to `/settings?tab=security` for setup

### Enterprise — SCIM 2.0

- [x] **ENT-SCIM-01**: `GET /scim/v2/ServiceProviderConfig` — capabilities advertisement
- [x] **ENT-SCIM-02**: `GET /scim/v2/Users` — paginated list with `?filter=userName eq "..."` support
- [x] **ENT-SCIM-03**: `POST /scim/v2/Users` — provision user into org (JIT if not exists)
- [x] **ENT-SCIM-04**: `GET /scim/v2/Users/:id` — fetch single user
- [x] **ENT-SCIM-05**: `PUT /scim/v2/Users/:id` — full replace (name, active)
- [x] **ENT-SCIM-06**: `DELETE /scim/v2/Users/:id` — soft-deprovision (deactivate + revoke sessions); last active owner protected
- [x] **ENT-SCIM-07**: Auth: Bearer API key scoped `scim` (created via Settings > Integrations). Audit-logged on SCIM writes.

### Enterprise — RBAC & Member Lifecycle

- [x] **ENT-RBAC-01**: Server-side permission matrix (`api/src/services/permissions.ts`); `requirePermission` and `requireCrudPermission` preHandler factories applied across all CRM + member/API-key/webhook routes
- [x] **ENT-RBAC-02**: Roles: `owner`, `admin`, `manager`, `sales_rep`, `viewer` (viewer = read-only across all CRM resources)
- [x] **ENT-RBAC-03**: `PATCH /orgs/me/members/:userId/role` — role change with safety rules (cannot demote last owner)
- [x] **ENT-RBAC-04**: `PATCH /orgs/me/members/:userId/status` — activate / deactivate member; deactivation revokes active sessions

### Enterprise — GDPR

- [x] **ENT-GDPR-01**: `GET /privacy/export` — Art. 20 full org data export (owner/admin gated)
- [x] **ENT-GDPR-02**: `GET /privacy/subject/:contactId/export` — Art. 15 single data-subject export
- [x] **ENT-GDPR-03**: `POST /privacy/subject/:contactId/erase` — Art. 17 erase/anonymize contact PII in-place; audit-logged as `gdpr_erasure`

### Enterprise — Security Audit Log

- [x] **ENT-AUDIT-01**: `security_events` table (migration 020); `recordSecurityEvent` service used across auth, SCIM, GDPR, and admin routes
- [x] **ENT-AUDIT-02**: Frontend Audit Log page (`/audit`) scoped to org; `audit:read` permission required

### Public API & Integrations

- [x] **INT-API-01**: `POST /api/public/v1/leads` — public lead ingestion authenticated by `x-api-key: <n0crm_...>` header; requires scope `leads:write` (403 `{ error: "Insufficient API key scope", required: "leads:write" }` otherwise)
- [x] **INT-API-02**: API key management in Settings > Integrations (`SettingsIntegrationsPanel.tsx`); scope selector UI shows `leads:write` and `scim` per key
- [x] **INT-WH-01**: Outbound webhooks (subscription CRUD, SSRF-guarded delivery, `webhooks` + `webhook_subscriptions` tables)

### Gmail Integration

- [x] **GMAIL-01**: Gmail OAuth uses Auth Code + PKCE (`initCodeClient`) — replaces implicit token flow to obtain refresh tokens
- [x] **GMAIL-02**: `POST /gmail/oauth-start` (authenticated) — generates Google OAuth authorization URL + stores state in Redis
- [x] **GMAIL-03**: `POST /gmail/oauth-exchange` (authenticated) — exchanges auth code for tokens; stores AES-256-GCM encrypted refresh token in `gmail_tokens`
- [x] **GMAIL-04**: Frontend callback at `{origin}/auth/gmail/callback` (`GmailCallback.tsx`) postMessages token to opener — no Edge Function dependency
- [x] **GMAIL-05**: Inbox view loads real Gmail threads via API using short-lived access token
- [x] **GMAIL-06**: Emails can be sent from within contact/deal detail pages
- [x] **GMAIL-07**: Incoming emails matched to contacts by sender email address; linked in activity feed

### Sequence Runner

- [x] **SEQ-01**: 60-second polling worker (`api/src/workers/sequenceRunner.ts`) advancing enrolled contacts through email + wait steps via a `current_step` index
- [x] **SEQ-02**: Frontend flow editor (`features/sequences-flow/`) persists a `flow_definition` to the API; studio UI with node inspector, metrics panel, and personalisation panel

### Internationalization

- [x] **I18N-01**: 6 language files (`en`, `es`, `pt`, `fr`, `de`, `it`) with full key parity
- [x] **I18N-02**: Language switcher in Settings persists language preference

### Observability

- [x] **OBS-01**: `x-request-id` correlation header on all responses; `captureException` integrated; optional `SENTRY_DSN`
- [x] **OBS-02**: Health endpoints: `GET /health`, `GET /health/ready`, `GET /health/live`
- [x] **OBS-03**: `GET /metrics` (Prometheus format) gated to loopback/internal-key; Prometheus + Grafana compose services available

### Testing

- [x] **TEST-01**: Vitest configured with `@testing-library/react` and jsdom for the frontend; Vitest for the API
- [x] **TEST-02**: Unit tests for `leadScoring.ts` (`computeLeadScore`, `calculateLeadScore`)
- [x] **TEST-03**: Unit tests for Zustand stores (contact CRUD, deal stage transitions) with API mocked
- [x] **TEST-04**: Unit tests for Zod schemas in form validation
- [x] **TEST-05**: CI (`ci.yml`) runs `vitest run` + `tsc --noEmit` on every push. API: 105 tests across 16 files; frontend: 273 tests. `npm audit` = 0 vulnerabilities.

### Deployment

- [ ] **DEPLOY-01**: Static SPA hosting configured so all client routes resolve to `index.html` on cold load (nginx `try_files` in production; API proxied under `/api`)
- [ ] **DEPLOY-02**: Production and staging environments define `VITE_APP_CHANNEL` (`production` | `staging`) and `VITE_API_URL` pointing to the correct n0crm-api instance (secrets never committed); `JWT_SECRET`, `CORS_ORIGIN`, `PGBOUNCER_URL` set on n0crm-api
- [ ] **DEPLOY-03**: Staging builds set `VITE_APP_CHANNEL=staging`; production uses `VITE_APP_CHANNEL=production`. All origins added to `CORS_ORIGIN` on the API
- [ ] **DEPLOY-04**: Production deployment on merge to `main` with recorded smoke pass
- [ ] **DEPLOY-05**: Custom domain + HTTPS (DNS + TLS per hosting provider)

#### Recording DEPLOY completion (human-owned evidence)

Check **`DEPLOY-*`** only after the work exists on the **target** environment (not when templates or docs are updated alone). Capture evidence in one of: this file (short dated bullet under Traceability), [`.planning/STATE.md`](./STATE.md) Notes, or [`docs/master-release-qa.md`](../docs/master-release-qa.md) — include **deploy URL**, **`VITE_APP_CHANNEL`**, **n0crm-api URL** (staging vs prod), **smoke outcome** ([`docs/smoke-checklist-production.md`](../docs/smoke-checklist-production.md)), and **commit SHA or tag**.

## v2 Requirements

### Billing & Monetization

- **BILL-01**: Stripe integration — subscription plans (free tier, pro, enterprise)
- **BILL-02**: Usage limits enforced per plan (contacts limit, users limit, AI tokens/month)
- **BILL-03**: Billing portal for plan upgrades, invoice downloads

### Advanced AI (v2)

- **AI-ADV-01**: Automated email sequences with smart timing based on contact stage (sequence runner extension)
- **AI-ADV-02**: Meeting prep brief from contact + company + deal data before calendar events
- **AI-ADV-03**: Deal health score with churn risk alerts; forecasting v2

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
| SAML federation | OIDC SSO shipped; SAML is v2+ |
| Automated HA/DR failover | Restore runbook exists (`docs/disaster-recovery.md`); automation is v2+ ops work |
| BullMQ background job queue | Present in dependencies; not yet wired into any job |
| Salesforce / HubSpot API sync | Bidirectional sync is high complexity; CSV import covers v1 |
| Video call integration | Outside core sales workflow |
| Field-level security | Org-scoped RBAC covers v1 needs |
| Formal SOC2/ISO certifications | Audit-ready controls in place; formal audit engagement is a business decision |
| AI fine-tuning on own data | Prompt engineering covers v1 needs; fine-tuning is v3+ |
| Schema-per-tenant multi-tenancy | `organization_id` + app-layer isolation is sufficient and simpler to operate |

## Traceability

| Requirement group | Phase | Status |
|-------------------|-------|--------|
| SCHEMA-01–05 | Phase 1 | Complete |
| AUTH-01–05 | Phase 2 | Complete |
| AUTH-06–10 | Phase 3 | Complete |
| SEC-01–06 | Phase 4 | Complete |
| DATA-01–08 | Phase 5 | Complete |
| REALTIME-01–04 | Phase 5 | Complete |
| DATA-09–15 | Phase 6 | Complete |
| USERS-01–03 | Phase 6 | Complete |
| AI-01–06 | Phase 6/7 | Complete |
| GMAIL-01–07 | Phase 7 | Complete |
| SEQ-01–02 | Phase 7 | Complete |
| ENT-MFA-01–04 | Phase 8 | Complete |
| ENT-AUDIT-01–02 | Phase 8 | Complete |
| ENT-RBAC-01–04 | Phase 9 | Complete |
| ENT-GDPR-01–03 | Phase 9 | Complete |
| ENT-SSO-01–04 | Phase 9 | Complete |
| ENT-SCIM-01–07 | Phase 9 | Complete |
| INT-API-01–02, INT-WH-01 | Phase 9 | Complete |
| OBS-01–03 | Phase 10 | Complete |
| I18N-01–02 | Phase 8 | Complete |
| TEST-01–05 | Phase 9 | Complete |
| DEPLOY-01–05 | Phase 11 | Pending Deploy |

**Coverage:**
- v1 requirements: 79 total
- Mapped to phases: 79
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-06-11 — Full rewrite: corrected AI pillar (multi-provider Gemini/OpenAI/Anthropic delivered, not cancelled), removed all Supabase/Edge Function references, updated Gmail backend to self-hosted oauth-start/oauth-exchange routes, refreshed test counts (API 85 / frontend 263), CI updated to .gitea/workflows/ci.yml, added enterprise requirement blocks (MFA, OIDC SSO, SCIM 2.0, RBAC, GDPR, audit log), public API and observability requirements, corrected Out-of-Scope table, updated traceability coverage count to 79.*
---

*Last updated (git): **2026-06-11***
