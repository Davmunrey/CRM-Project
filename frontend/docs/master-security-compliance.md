# Security & Compliance (master)

> Consolidated **2026-04-15**; auth migrated from Supabase to n0crm-api JWT **2026-05-13**; the app is now **fully Supabase-free** — the entire `frontend/supabase/` tree, `@supabase/supabase-js`, the Supabase CLI and all `supabase:*` scripts were removed, and the live backend is **Fastify + postgres.js + Redis + Socket.io** only. API security + public-surface hardening shipped (trustProxy-keyed rate limits, CORS allow-list, webhook SSRF guards, account lockout, registration policy — see [#external-hardening-checklist](#external-hardening-checklist)). Single reference for auth/SSO contracts, the hardening matrix, the sell-ready evidence index, the external hardening checklist, AI governance, the SOC2/GDPR mapping, DSAR procedures, and Gitea CI governance.

**Replaces:** auth-sso-backend-handoff, hardening-matrix, sell-ready-security-evidence-index, external-hardening-checklist, compliance-mapping, dsar-playbook, gitea-operations.

## Table of contents

- [Client password policy and Zustand selectors](#client-password-policy-and-zustand-selectors)
- [Auth / SSO backend handoff](#auth-sso-backend-handoff)
- [AI governance and safety](#ai-governance)
- [Hardening matrix (audit-ready)](#hardening-matrix)
- [Sell-ready security & compliance evidence index](#sell-ready-security-evidence-index)
- [External hardening checklist](#external-hardening-checklist)
- [Compliance mapping (SOC2 / GDPR-lite)](#compliance-mapping)
- [DSAR playbook](#dsar-playbook)
- [Gitea production operations](#gitea-operations)
- [Enterprise gaps (roadmap — not implemented)](#enterprise-gaps)

---

<a id="client-password-policy-and-zustand-selectors"></a>
## Client password policy and Zustand selectors

### Password UX and validation

- Shared helpers live in `src/lib/securePassword.ts` (`isStrongPassword`, `getPasswordRuleMet`, optional generator). Unit tests: `tests/lib/securePassword.test.ts`.
- `src/components/auth/SecurePasswordField.tsx` renders a live checklist (length, mixed case, digit, symbol) and optional generator; parents pass label strings from i18n so the checklist does not mount a second translation scope.
- Surfaces wired to the same rules: login (when org policy requires strong passwords), register, password reset, profile password change, and team member invite / password reset flows in team management.
- Org default `enforceStrongPasswordMinLength` (from `organizations.settings`) gates minimum length on the client; when it is off, the login form shows a short hint that the server may still reject weak passwords.

### React “maximum update depth” hygiene

- **Zustand selectors must return stable references.** Selecting a freshly constructed object (for example `getFlags()` that returns `{ ... }` every call) causes `useSyncExternalStore` to re-subscribe in a tight loop. Prefer selecting a primitive slice or a stable store field, then derive view objects with `useMemo` in the component.
- **Effects that call `setState` must depend on primitives**, not object identity from the host or the auth session, unless the effect compares previous values and only updates when meaningfully changed.
- **Context providers** should memoize their `value` object when it aggregates several fields, so consumers do not re-render every parent render.

<a id="auth-sso-backend-handoff"></a>
## Auth / SSO backend handoff

Auth is **email/password via n0crm-api** (Fastify backend in `api/` directory). JWT HS256 with `sub/org/role/jti` claims, algorithm pinned to prevent alg:none attacks, delivered as an HttpOnly cookie. SSO (Google/Azure/Apple/SAML), SCIM, and MFA/2FA enforcement are **roadmap** — the frontend has feature-flag toggles (and a TOTP UI) wired, but backend routes/enforcement are not yet implemented. See [Enterprise gaps](#enterprise-gaps).

**Auth-route hardening (shipped):**

- **trustProxy hop-count** (`TRUST_PROXY` env, nginx = 1 / privateprompt edge + nginx = 2): `req.ip` resolves from the trusted XFF suffix only, so the leftmost attacker-controlled `X-Forwarded-For` value can no longer evade per-IP rate limits on auth routes.
- **Account lockout**: 10 failed logins per account within 15 minutes returns **429** (`api/src/db/redis.ts`); counter clears on a successful authentication.
- **Self-registration policy**: `ALLOW_OPEN_REGISTRATION` (default `true`) and `REGISTRATION_ALLOWED_DOMAINS` allow-list gate `POST /auth/register`; the **first** user (bootstrap) is always allowed.

## Document Control

- Status: Active
- Owner: Backend/Auth
- Last updated: 2026-06-10 (AI assistant + governance shipped; auth-route hardening — trustProxy-keyed rate limits, account lockout, registration policy; backend CI gate + vitest suite). Prior: 2026-05-25 production hardening (PgBouncer, RLS on 21 tables, 40+ indexes, per-tenant rate limiting, Socket.io Redis adapter, Prometheus/Grafana, backup automation).
- Canonical: Yes

## n0crm-api auth endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /auth/register` | public | Create account; returns JWT with `org: null` |
| `POST /auth/login` | public | Email/password; returns JWT with `org` claim |
| `GET /auth/me` | Bearer JWT | Returns user + org info |
| `PATCH /auth/me` | Bearer JWT | Update profile (name, jobTitle, phone, avatarUrl) |
| `POST /auth/refresh` | Bearer JWT | Rotate JWT — old `jti` revoked, new `jti` issued |
| `PATCH /auth/password` | Bearer JWT | Change password (requires current password) |
| `POST /auth/admin/reset-password` | Bearer JWT (owner/admin) | Set another org member's password |
| `POST /auth/forgot-password` | public | Creates reset token with 1-hour TTL (always 200) |
| `POST /auth/reset-password` | public | Validate token + update password |
| `POST /auth/logout` | Bearer JWT | Revoke JWT in Redis denylist (`jwt:deny:{jti}`) + clear session |
| `GET /auth/resolve-org/:slug` | public | Resolve org slug → org metadata |

JWT payload: `{ sub: userId, org: organizationId | null, role: UserRole, jti: randomHex32 }`. Expiry: 7 days. The `jti` (JWT ID) enables per-token revocation — `POST /auth/logout` and `POST /auth/refresh` add the old `jti` to a Redis denylist with TTL equal to the token's remaining lifetime. Every authenticated request checks the denylist.

## SSO — future work

Frontend env toggles exist for when SSO is added to n0crm-api:

- `VITE_AUTH_GOOGLE_ENABLED=true|false`
- `VITE_AUTH_AZURE_ENABLED=true|false`
- `VITE_AUTH_APPLE_ENABLED=true|false`
- `VITE_AUTH_SAML_ENABLED=true|false`

These toggles only affect visible login options and are all currently `false`.

---


<a id="ai-governance"></a>
## AI governance and safety

The AI / agentic feature (`api/src/services/ai/*`, routes under `/ai`) is **multi-provider** — Google Gemini (free default), OpenAI, Anthropic — and only activates when at least one provider key is configured (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). When no key is set the UI hides AI entirely. Persisted state lives in `ai_conversations`, `ai_messages`, and `ai_usage_log` (migration `018_ai.sql`).

## Document Control

- Status: Active
- Owner: Backend/AI/Security
- Last updated: 2026-06-10
- Canonical: Yes

### Controls

| Control | Mechanism | Notes |
|---|---|---|
| **Per-org kill switch** | `organizations.settings.ai.enabled=false` disables all AI for that tenant | Default on when a provider key exists |
| **Monthly spend cap** | `AI_MONTHLY_TOKEN_CAP` (env) + per-org `settings.ai.monthlyTokenCap`; usage tracked in `ai_usage_log` | Returns **429** when the org exceeds its output-token cap |
| **Tenant isolation of tools** | Agent CRM tools in `api/src/services/ai/tools.ts` are org-scoped; every query is bound to the caller's `organization_id` | Cannot read or touch another tenant's data |
| **Write gating** | `create_activity` and `update_deal_stage` only execute when the caller passes `allowWrites: true`; each write appends an `audit_log` row | Read tools always allowed; writes are explicit + audited |
| **Step bound** | `AI_AGENT_MAX_STEPS` caps the agent's tool-use loop | Prevents runaway multi-step calls |
| **Data retention** | `AI_MESSAGE_RETENTION_DAYS` purges `ai_*` rows on a schedule (`api/src/services/ai/retention.ts`); `0` = keep indefinitely | Operator-tunable |
| **Egress allow-list** | Provider HTTP calls target only `generativelanguage.googleapis.com`, `api.openai.com`, `api.anthropic.com` | Asserted in `providers.ts` |

> **Related:** [Compliance mapping](#compliance-mapping) for how AI data maps to GDPR-lite data-minimization/retention expectations.

---


<a id="hardening-matrix"></a>
## Hardening matrix (audit-ready)

This matrix tracks production hardening posture across security, reliability, operations, and governance.

**Snapshot (2026-06-10):** API security hardening shipped on top of the 2026-05-25 infrastructure/database hardening. New controls: **trustProxy hop-count** (rate limits keyed on the resolved `req.ip`, XFF no longer spoofable on auth routes), **account lockout** (10 failed logins / 15 min → 429), **self-registration policy** (`ALLOW_OPEN_REGISTRATION` + `REGISTRATION_ALLOWED_DOMAINS`), `/metrics` gated on the raw socket peer + `x-internal-key`, `/_debug/sql` running in a **READ ONLY** transaction, Socket.io handshake re-checking `users.is_active` + org, Slack outbound re-asserting the `hooks.slack.com` allow-list at send, cross-org FK ownership checks on deals, and the sequence runner claiming rows `FOR UPDATE SKIP LOCKED`. An orphan passwordless DB-trust entrypoint and a public Adminer service were removed. `npm audit` reports **0 vulnerabilities** on api and frontend. The backend gained its first **CI gate** (`api` job: tsc → eslint → vitest → build → npm audit) and a **26-test vitest suite**. The AI feature ships with governance (per-org kill switch, monthly token cap, retention purge — see [AI governance](#ai-governance)). Prior (2026-05-25): RLS on 21 tables with `set_current_org()`, 40+ indexes, PgBouncer (transaction mode, 25 server conn / 500 max clients), Prometheus/Grafana, per-org 500 req/min + per-IP 20 req/min auth limits, Socket.io Redis adapter, pg_dump backups (6h / 7-day retention), service health checks. Matrix rows below stay open until **external** sign-offs (RLS review, DR drill calendar, secret rotation log) are attached as evidence.

## Document Control

- Status: Active
- Owner: Security/Ops/Backend
- Last updated: 2026-06-10
- Canonical: Yes

## Scoring Legend

- **Impact**: Low / Medium / High / Critical
- **Likelihood**: Low / Medium / High
- **Priority**: P0 (urgent) / P1 (high) / P2 (planned)

### Risk register

| Domain | Risk | Impact | Likelihood | Current Control | Remaining Gap | Priority | Owner | ETA |
|---|---|---|---|---|---|---|---|---|
| Multi-tenancy | Cross-tenant data leakage | Critical | Low | `organization_id` model + RLS on 21 tables + `set_current_org()` function + claim helpers (`get_org_id`, `get_user_role`) | Periodic tenant-isolation regression in CI; production RLS validation drill | P0 | Backend | 1 sprint |
| Auth/SSO | Provider misconfiguration blocks sign-in | High | Medium | JWT HS256 pinned, password reset tokens SHA-256 hashed, bcrypt login constant-time, rate-limit on `/auth/reset-password`, impersonation audit logged | SSO/SCIM not implemented (roadmap); IdP drift monitoring | P1 | Backend/Auth | Roadmap |
| Auth | Brute-force / credential stuffing | High | Medium | Account lockout: 10 failed logins / 15 min → 429 (`api/src/db/redis.ts`); counter clears on success | Tune thresholds; alert on lockout spikes | P1 | Backend/Auth | Shipped (monitor) |
| Auth | XFF spoofing to evade per-IP rate limits | High | Medium | trustProxy hop-count (`TRUST_PROXY`); rate limits keyed on the resolved `req.ip` (trusted XFF suffix only) | Verify hop count per deployment topology | P1 | Backend/Ops | Shipped |
| Tenancy / Registration | Unsanctioned self-registration | Medium | Medium | `ALLOW_OPEN_REGISTRATION` toggle + `REGISTRATION_ALLOWED_DOMAINS` allow-list; first user always allowed | Optional invite-only enforcement per org | P2 | Backend | Shipped |
| Debug / Telemetry surface | Sensitive endpoint exposure | High | Low | `/metrics` gated on raw socket peer + `x-internal-key`; `/_debug/sql` runs in a READ ONLY transaction | Periodic review of debug routes in prod images | P1 | Backend/Ops | Shipped |
| AI | Runaway AI spend / data over-retention | Medium | Medium | Per-org kill switch, monthly output-token cap (429 when exceeded), `AI_AGENT_MAX_STEPS`, `ai_*` retention purge, provider egress allow-list | Per-org spend dashboards + alerting | P2 | Backend/AI | Shipped (monitor) |
| AI | Agent writes outside caller scope | High | Low | Org-scoped tools; writes (`create_activity`, `update_deal_stage`) gated by `allowWrites` and audit-logged | Add per-tool rate caps; expand audit coverage | P2 | Backend/AI | Shipped |
| Auth/SSO | User enumeration via timing | High | Low | Bcrypt cost 12 with constant-time comparison on login; password reset always returns 200 (no user leakage) | Validate timing across all login paths in staging | P1 | Backend/Auth | 1 sprint |
| Auth/SSO | Password reset token exposure | High | Low | SHA-256 hash in DB (not plaintext); 1-hour TTL; single-use | Rotate reset token secret on compromise | P1 | Backend/Auth | Ongoing |
| Email Infra | Default provider rate limiting disrupts onboarding | High | Medium | SMTP/custom provider guidance documented | Production SMTP failover playbook | P1 | Ops | 1 sprint |
| Lead Scoring | Stale scoring due to scheduler outage | High | Medium | Backend-first maintenance + telemetry + SLA guardrail alerts | External monitor (pager integration) and weekly trend review | P0 | Ops/Backend | 1 sprint |
| Data Consistency | Lead conversion partial writes under failure | High | Low | `promote-lead` server-side conversion path | Add explicit idempotency key strategy | P1 | Backend | 2 sprints |
| Observability | Silent failures in maintenance and automations | High | Medium | `lead_score_maintenance_runs` + Settings Ops Dashboard + runbook | Centralized log sink + dashboards in external APM | P1 | Ops | 2 sprints |
| Security Posture | Function search path and definer misuse | High | Low | Search path hardening migration applied | Quarterly SQL function review checklist | P1 | Security/Backend | 1 sprint |
| Secrets Management | Secret leakage in job environments | Critical | Low | Secret-based system mode (`LEAD_MAINTENANCE_SECRET`) | Secret rotation policy + expiry calendar | P0 | Ops/Security | 1 sprint |
| Release Safety | Unverified deploy introduces regression | High | Medium | Build + lint checks used on each iteration | Pre-deploy smoke suite and release gate document | P1 | Engineering | 1 sprint |
| Governance | Limited audit completeness for enterprise asks | Medium | Medium | Audit log + maintenance telemetry + DSAR/retention runbooks + compliance mapping | Field-level security model + **tenant** retention automation + logged DR drills | P2 | Product/Backend | 3 sprints |
| Database Layer | Performance degradation at 500+ tenants | High | Medium | PgBouncer (transaction mode, 25 server conn, 500 max clients) + 40+ indexes (pg_trgm, B-tree FK paths, composite list queries) + RLS on 21 tables | Load test at target tenant count; monitor PgBouncer pool utilization | P1 | Backend/DBA | 1 sprint |
| Infrastructure | Lack of observability for multi-node deployments | High | Medium | Prometheus + Grafana + postgres-exporter + node-exporter (15s scrape interval); health checks on all services (30s, 3 retries) | Custom dashboards for SLA thresholds; automated alerting on query latency spike | P1 | Ops | 1 sprint |
| Data Protection | Unplanned downtime risk (database failure) | High | Low | Automated backup (pg_dump every 6h, gzip, 7-day retention in `./backups/`) | Restore drill calendar + documented RTO/RPO SLAs; offsite backup replication | P1 | Ops/DBA | 2 sprints |
| Scaling | Multi-node WebSocket state leakage | High | Low | Socket.io Redis adapter (no in-memory store); broadcasts to org-scoped rooms only | Load test multi-node Socket.io failover; verify room isolation under chaos | P1 | Backend | 1 sprint |
| Rate Limiting | Global limit insufficient for per-tenant fairness | High | Medium | Per-org rate limit (500 req/min via Redis) + per-IP auth limit (20 req/min); Nginx layer in production | Verify per-org isolation under synthetic load; audit token replay risk | P1 | Backend/Ops | 1 sprint |

## Immediate Actions (Next 7 Days)

1. Wire pager/incident channel for SLA breach outputs (`maintenance:lead:sla`).
2. Add CI task for tenant isolation smoke tests.
3. Define and document secret rotation cadence for maintenance system mode.
4. Confirm SMTP production path and fallback owner.

## Advisor-zero policy (operational)

Use this rule for security/database advisor findings (e.g. `npm audit`, Postgres linters, dependency scanners):

- **Security WARN (external-facing):** treat as release-blocking unless explicitly documented as intentional exposure with owner/date.
- **INFO findings:** allowed only with documented rationale and follow-up target.
- **Re-check cadence:** at minimum once per release candidate and after schema/function changes.

Required evidence fields per finding:

- finding id/title,
- decision (`fix_now` | `accepted_risk` | `defer_with_date`),
- owner,
- remediation link,
- proof of fix (SQL/migration/PR reference).

## 30-Day Hardening Target

- No unresolved P0 items.
- Weekly review of:
  - stale tenant trend,
  - maintenance failure rate,
  - auth/provider incidents.
- Sign-off from Backend + Ops + Product on all P1 timelines.

> **Related:** [Sell-ready evidence index](#sell-ready-security-evidence-index), [Compliance mapping](#compliance-mapping), [Evidence bundle](#compliance-evidence-bundle), and the [doc hub](./README.md).

---


<a id="sell-ready-security-evidence-index"></a>
## Sell-ready security & compliance evidence index

This index ties **internal documentation**, **code controls**, and **external checklists** to what enterprise buyers typically request. It is not a certification; it is an engineering evidence map.

**Doc hub:** All `docs/` paths and a **status snapshot table** are maintained in [`docs/README.md`](./README.md).

## How to use

1. Complete each linked checklist and attach proof (screenshots, CLI output, dated sign-off).
2. Map items to procurement questionnaires (SOC2-style, GDPR-style) using [Compliance mapping](#compliance-mapping).
3. For application-level control depth, cross-check against [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard) Level 1–2.

**Where to find buyer-facing artifacts:** this file holds **Gitea**, the **external hardening checklist**, the **hardening matrix**, **AI governance**, **DSAR**, and the **SOC2/GDPR mapping**. Use [`master-email-operations`](./master-email-operations.md) (deliverability), [`master-lead-management`](./master-lead-management.md) (maintenance + retention), [`master-release-qa`](./master-release-qa.md) (go-live + QA), [`master-design-ui`](./master-design-ui.md) (UI evidence), [`master-implementation-history`](./master-implementation-history.md) (engineering narrative). Code anchors for outbound mail: `api/src/routes/email.ts` (SMTP creds AES-256-GCM at rest) + `api/src/routes/slack.ts` (`hooks.slack.com` allow-list); auth + deploy channels: `api/src/routes/auth.ts`, `api/src/middleware/auth.ts`, `frontend/src/lib/envChannel.ts`, `frontend/src/lib/api.ts`, `frontend/vite.config.ts`, `api/.env.example`.

## ASVS (informal)

- **V2 Authentication** — n0crm-api JWT (bcrypt cost 12, per-token `jti` denylist, rate-limited auth routes, account lockout, trustProxy-keyed `req.ip`): [#auth-sso-backend-handoff](#auth-sso-backend-handoff); `api/src/routes/auth.test.ts`
- **V4 Access control** — RLS + app gates + cross-org FK ownership checks: [#external-hardening-checklist](#external-hardening-checklist); `frontend/src/utils/permissions.ts` (note: granular RBAC is enforced inline by role server-side; the permission UI is frontend-only — see [Enterprise gaps](#enterprise-gaps))
- **V9 Communications** — TLS to APIs + outbound mail/Slack controls: external CDN/infra; `api/src/routes/email.ts`, `api/src/routes/slack.ts` (SSRF allow-list); [`master-email-operations`](./master-email-operations.md#email-deliverability-resend)
- **V7 Error handling / logging** — `audit_log` (incl. AI write tools), maintenance telemetry, failed-send audit: [`master-lead-management`](./master-lead-management.md#lead-maintenance-runbook); [#hardening-matrix](#hardening-matrix)
- **V14 Configuration** — Channels + env validation: `frontend/src/lib/envChannel.ts`, `frontend/vite.config.ts`, `api/src/config/env.ts`, `api/.env.example` (`VITE_APP_CHANNEL` production/staging, `development` default in dev; API env validated at startup with fail-fast guards; no Supabase runtime)
- **V8 Data protection** — Tenant isolation + DSAR/retention + AI data retention: [#dsar-playbook](#dsar-playbook); [#ai-governance](#ai-governance); [`master-lead-management`](./master-lead-management.md#data-retention-runbook)

## Revision history

Single consolidation 2026-04-15: prior `sell-ready-security-evidence-index` + related security docs merged into this master (see git history for line-level changelog).

---


<a id="supabase-external-hardening-checklist"></a>
<a id="external-hardening-checklist"></a>
## External hardening checklist

Use this checklist when validating a **production** deployment. The live backend is **Fastify + postgres.js + Redis + Socket.io** — there are no Supabase Edge Functions. Record evidence (screenshots, SQL output, log excerpts) in your security ticket or the [#sell-ready security evidence index](#sell-ready-security-evidence-index).

**Doc hub:** [`README`](./README.md) (status snapshot and full index).

## 1. Authentication and sessions (n0crm-api)

- [x] `JWT_SECRET` minimum length enforced at startup in `api/src/config/env.ts`; rotate on compromise.
- [x] JWT algorithm pinned to HS256 (no `alg: none` attacks possible); verified in `config/env.ts` validation.
- [ ] JWT expiry (`JWT_EXPIRES_IN`) aligned with product risk (default 7d).
- [x] JWT includes `jti` (JWT ID) claim for per-token revocation; denylist in Redis with TTL. JWT delivered as an HttpOnly cookie.
- [x] `CORS_ORIGIN` parsed into an origins array and validated (not raw string match); split values checked for `*` in the CORS production guard.
- [x] `POST /auth/forgot-password` always returns 200 (email enumeration prevention).
- [x] `password_reset_tokens` stored as SHA-256 hashes (not plaintext); TTL is 1 hour.
- [x] `/auth/reset-password` rate-limited.
- [x] `/auth/login` uses bcrypt cost 12 with constant-time comparison (prevents timing-based user enumeration).
- [x] **Account lockout:** 10 failed logins / 15 min per account → 429 (`api/src/db/redis.ts`); counter clears on successful auth.
- [x] **Self-registration policy:** `ALLOW_OPEN_REGISTRATION` (default `true`) + `REGISTRATION_ALLOWED_DOMAINS` allow-list gate `POST /auth/register`; first (bootstrap) user always allowed.
- [x] **trustProxy hop-count** (`TRUST_PROXY`): rate limits keyed on the resolved `req.ip` (trusted XFF suffix only) — XFF not spoofable on auth routes.
- [x] `POST /auth/logout` revokes JWT in Redis denylist before clearing session.
- [x] Impersonation audit log INSERT must succeed before token is issued (fail-fast on log failure); impersonation exit sets `ended_at`.

## 2. Tenant isolation and access control (PostgreSQL + app layer)

- [x] RLS **enabled** on 21 tenant/user tables with `set_current_org()` SECURITY DEFINER and claim helpers (`get_org_id`, `get_user_role`).
- [x] All org-scoped routes assert `req.user.org`; cross-org **FK ownership checks** on deals prevent attaching another tenant's records.
- [x] `SECURITY DEFINER` functions reviewed; search-path hardening migration applied.
- [x] Indexes exist on columns referenced in policies / hot paths (40+ indexes; avoids full-table scans at scale).
- [ ] Run tenant-isolation smoke in CI: User A cannot read/update User B org rows (automate — see Immediate Actions).
- [ ] **Note:** granular RBAC is enforced **inline by role** server-side; the per-permission UI is **frontend-only**. Full server-side RBAC enforcement is [roadmap](#enterprise-gaps).

## 3. API surface, integrations, and egress

- [x] **No** server secrets in client bundles; the SPA holds only `VITE_API_URL` (+ `VITE_APP_CHANNEL`).
- [x] **CORS:** `CORS_ORIGIN` allow-list (comma-separated exact origins) enforced by the Fastify CORS guard; production guard rejects `*`.
- [x] **Per-tenant rate limiting:** per-org 500 req/min (Redis-backed) + per-IP 20 req/min on auth routes.
- [x] **Outbound mail:** SMTP credentials encrypted at rest (AES-256-GCM); all sends routed through `api/` (`api/src/routes/email.ts`); payload caps applied.
- [x] **Slack outbound:** the `hooks.slack.com` HTTPS allow-list is re-asserted at send time (`api/src/routes/slack.ts`, tested in `slack.test.ts`) — SSRF defense.
- [x] **Outbound webhooks:** subscriber URLs resolved with SSRF defenses + a safe custom-header allow-list before `fetch`; deliveries outboxed with bounded retries.
- [x] **Public read API / lead capture:** explicit column selects (no `select('*')`), per-key/per-token rate limits, bounded request bodies, generic client error bodies (details in logs only) — `/public/v1/*`, `/integrations/*`.
- [x] **`/metrics`** gated on the raw socket peer (`req.socket.remoteAddress`) + `x-internal-key` (not the trustProxy-resolved `req.ip`).
- [x] **`/_debug/sql`** runs inside a **READ ONLY** transaction unless `allow_writes:true` is explicitly passed; any write in a READ ONLY tx is rejected by Postgres.
- [x] **Socket.io** handshake re-checks `users.is_active` + org membership; broadcasts only to org-scoped rooms.
- [x] **Sequence runner** claims enrollments `FOR UPDATE SKIP LOCKED` — no double-send across ticks/nodes.
- [x] **Billing:** free-tier caps applied for churned orgs when Stripe is configured.
- [x] **SPA transport hygiene:** static responses include baseline security headers where the host supports them ([`../vercel.json`](../vercel.json), [`../public/_headers`](../public/_headers)); rich-text/signature preview sanitized with DOMPurify; client IDs use `crypto.randomUUID()`.
- [x] Removed an orphan passwordless DB-trust entrypoint and a public Adminer service.

## 4. Backups and recovery

- [ ] Point-in-time recovery (PITR) or automated backups enabled for production database.
- [ ] Restore drill documented (who runs it, how long it takes, last drill date).
- [ ] Database connection pooling and max connections reviewed for expected load.

## 5. Docker and Infrastructure

- [ ] api/Dockerfile runs as non-root `USER node` (not root).
- [ ] api/.dockerignore prevents `.env` from leaking into image layers.
- [ ] api/docker-entrypoint.sh auto-runs migrations before server start (no manual post-deploy step).
- [ ] `JWT_SECRET` and `TOKEN_ENCRYPTION_KEY` use Compose `:?` guards (fail-fast if unset).
- [ ] Root docker-compose.yml (monorepo structure) starts both frontend and api services with health checks.

## 6. Observability

- [x] Prometheus scrapes `/metrics` (15s) + postgres-exporter + node-exporter; Grafana auto-provisioned.
- [ ] n0crm-api structured logs reviewed on a schedule (stdout → your log aggregator).
- [ ] API logs reviewed for Gmail, webhook, AI, and public-API errors.
- [ ] Alerts for auth anomalies (incl. lockout spikes), route error rate, AI spend/cap breaches, and database CPU/storage. **Backend error tracking / alerting / SLOs are [roadmap](#enterprise-gaps).**

## CI/CD and Secrets

- [x] CI gates run per package: `.gitea/workflows/ci.yml` has an **`api`** job (`npm ci → tsc → eslint → vitest → build → npm audit`) and a **`ci`** job for `frontend/` (ui:lint, i18n:lint, i18n parity, eslint, tsc, vitest, build, bundle budget, npm audit). The backend previously had **no** lint/type/test gate; it now ships an eslint flat config and a **26-test vitest suite** (was 0).
- [ ] E2E secrets use n0crm-api endpoints: `E2E_API_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`.
- [ ] `build-production.yml` triggers only on `frontend/**` changes.
- [ ] `build-api.yml` triggers on `api/**` changes.
- [x] `npm audit` reports **0 vulnerabilities** on api and frontend.
- [ ] No secrets committed; all environment variables set in CI/CD platform.

## Sign-off

| Role   | Name | Date | Notes |
|--------|------|------|-------|
| Backend|      |      |       |
| Ops    |      |      |       |

---


<a id="compliance-mapping"></a>
## Compliance mapping (SOC2 / GDPR-lite)

This document maps current n0CRM controls to common enterprise compliance expectations.
It is a pragmatic engineering mapping (not legal advice and not a formal certification artifact).

## Document Control

- Status: Active
- Owner: Security/Backend/Ops
- Last updated: 2026-06-10
- Canonical: Yes

**Related hub:** [`README`](./README.md) (status snapshot + index). DSAR and retention: [#dsar-playbook](#dsar-playbook), [`master-lead-management` — retention](./master-lead-management.md#data-retention-runbook).

> **Honesty note:** This is a pragmatic engineering mapping, **not** a certification. n0CRM holds **no** SOC 2 / ISO 27001 / HIPAA / GDPR certification. SSO/SAML/OIDC, SCIM, MFA enforcement, server-side RBAC enforcement, HA/DR, and a fully operationalized GDPR DSAR (export/erasure) workflow are **[roadmap](#enterprise-gaps)**, not implemented.

## Scope

- Application: n0CRM
- Backend: n0crm-api only — Fastify 5, PostgreSQL 16 (via PgBouncer), Redis 7, Socket.io, JWT auth. **No Supabase** (fully migrated off).
- AI: multi-provider AI service with per-org governance (kill switch, token cap, retention) — see [#ai-governance](#ai-governance).
- Operational controls: lead maintenance telemetry/SLA, runbooks, handoff checklists

## Control Mapping Table

*Evidence abbreviations:* **hist:A** = [`master-implementation-history`](./master-implementation-history.md#implementation-history-sections-01-12) (Part A) · **LM** = [`master-lead-management`](./master-lead-management.md) (anchors: score backend, runbook, ops dashboard, retention as applicable) · **RQA** = [`master-release-qa`](./master-release-qa.md#production-handoff-checklist) · **sec** = this file (`#auth-sso-backend-handoff`, `#dsar-playbook`, etc.).

| Framework Area | Control Objective | Current Implementation | Evidence | Gap / Next Action | Owner |
|---|---|---|---|---|---|
| SOC2 - Security | Enforce least privilege access | Tenant isolation via `organization_id` + RLS + role claims (`get_org_id`, `get_user_role`) | hist:A, SQL migrations | Add scheduled tenant-isolation CI checks | Backend |
| SOC2 - Availability | Detect and respond to processing disruptions | `lead-score-maintenance` telemetry + SLA mode + notifications | LM (score backend, runbook) | Add external paging integration and uptime SLO dashboard | Ops |
| SOC2 - Processing Integrity | Ensure scoring jobs run correctly and are observable | `lead_score_maintenance_runs` status/error history + Settings Ops dashboard | LM (ops dashboard) | Add anomaly thresholds and automated weekly report | Backend/Ops |
| SOC2 - Change Management | Controlled release readiness | Production handoff checklist + **CI gates** on both packages (api: tsc/eslint/vitest/build/audit; frontend: full guardrail suite) | RQA, `.gitea/workflows/ci.yml` | Enforce required status checks on `master`; add tenant-isolation regression test | Engineering |
| SOC2 - Confidentiality | Protect secrets and auth paths | JWT HS256 pinned + `jti` denylist, bcrypt cost 12, account lockout, SMTP creds AES-256-GCM at rest, env validated at startup | sec (auth handoff, external checklist) | Define secret rotation cadence and audit log | Ops/Security |
| SOC2 - Security (monitoring) | Detect/limit abuse | trustProxy-keyed per-IP + per-org rate limits, account lockout, `/metrics`+`/_debug` surface gating, SSRF allow-lists (Slack/webhooks) | sec (external checklist) | Wire alerting on lockout/error-rate spikes (backend alerting is roadmap) | Backend/Ops |
| AI Governance | Bound AI cost, scope, and data lifetime | Per-org kill switch, monthly output-token cap (429), org-scoped + audited agent tools, `AI_MESSAGE_RETENTION_DAYS` purge, egress allow-list | [#ai-governance](#ai-governance), `018_ai.sql` | Per-org AI spend dashboards + alerting | Backend/AI |
| GDPR-lite - Data Segregation | Prevent cross-customer data access | Org-scoped data model + RLS per tenant + cross-org FK ownership checks | hist:A, migrations | Add documented quarterly RLS review | Backend |
| GDPR-lite - Access and Correction | Enable controlled updates to customer data | Authenticated CRUD through scoped API routes + RLS | sec (DSAR), API routes | **Fully operationalize GDPR DSAR (export/erasure)** — currently a manual runbook, not automated ([roadmap](#enterprise-gaps)) | Product/Backend |
| GDPR-lite - Data Minimization | Keep only necessary operational data | Scoped telemetry table + AI `ai_*` retention purge | `lead_score_maintenance_runs` migration, LM (retention), [#ai-governance](#ai-governance) | Set org-specific retention periods and automated purge where required | Product/Ops |
| GDPR-lite - Incident Response | Procedure for failures that may impact service/data | Incident runbook with triage/recovery/escalation | LM (runbook) | Extend to broader security incident classes | Ops/Security |

## Compliance Posture Summary

- **Strong today**:
  - Tenant data segregation architecture.
  - Maintenance observability and operational runbooks.
  - Structured handoff and go-live checklists.
- **Needs hardening for enterprise audits**:
  - Formalized secret rotation evidence.
  - CI-enforced release and isolation gates.
  - Data retention and DSAR response procedure documentation.

## 30-Day Compliance Actions

1. ~~Define and publish telemetry/log retention policy.~~ Baseline: [`master-lead-management` — retention](./master-lead-management.md#data-retention-runbook) (tune periods per org).
2. Add CI check for tenant-isolation regression.
3. Add secret rotation SOP and execution log.
4. ~~Draft DSAR handling playbook (request intake, export, correction, deletion path).~~ Baseline: [#dsar-playbook](#dsar-playbook).

<a id="compliance-evidence-bundle"></a>
## Evidence bundle (single pointer)

Do not maintain a second list of the same links. Use **[Sell-ready security evidence index](#sell-ready-security-evidence-index)** for the buyer-facing map; this compliance section adds only the **control mapping table** above and **DSAR** below.

---


<a id="dsar-playbook"></a>
## DSAR playbook

Engineering-oriented procedure for handling **data subject access requests** in a n0CRM deployment backed by **n0crm-api (JWT auth + PostgreSQL + RLS)**. This is not legal advice; align intake, timelines, and legal review with your organization’s privacy counsel and jurisdiction.

> **Status:** This is a **manual runbook**, not an automated GDPR DSAR pipeline. A self-service export/erasure workflow is [roadmap](#enterprise-gaps).

**Doc hub:** [`README`](./README.md).

## Roles

| Role | Responsibility |
|------|----------------|
| **Intake owner** (Support / DPO delegate) | Ticket opened, identity verified per org policy, customer communication |
| **Backend / Security** | Scoped export or deletion against the n0crm-api database, audit evidence |
| **Product** | Confirm in-app vs full-database scope for the tenant |

## Request types and scope

1. **Access / portability** — Provide a structured export of personal data held for the subject (typically contacts they own or contributed to, profile, audit references, email metadata the org stores).
2. **Rectification** — Correct inaccurate profile or CRM records; prefer in-app flows when the subject is an authenticated org user.
3. **Erasure** — Remove or anonymize personal data where contract and law allow (often constrained while a lawful business relationship exists).

Always resolve the subject’s **`organization_id`** and enforce **tenant isolation** (RLS + org-scoped queries). Remember the AI tables: `ai_conversations`, `ai_messages`, and `ai_usage_log` may hold subject data and are subject to `AI_MESSAGE_RETENTION_DAYS` purge (see [#ai-governance](#ai-governance)).

## Intake checklist

- [ ] Request channel and date logged (ticket ID).
- [ ] Subject identity verified (org admin attestation, email domain match policy, or KYC as required).
- [ ] Request type: access | portability | rectification | erasure.
- [ ] Jurisdiction and deadline noted (e.g. GDPR calendar days where applicable).
- [ ] Legal/commercial hold assessed (active litigation, billing dispute, statutory retention).

## Execution outline (n0crm-api / PostgreSQL)

1. **Locate identifiers**: `users.id`, work email, CRM `contacts` / `activities` / related tables per product schema (and `ai_*` tables where applicable).
2. **Read path (access/portability)**  
   - Use org-scoped queries or a **one-off SQL script** run with least privilege (prefer read replica if available).  
   - Export JSON/CSV; redact third-party secrets and other data subjects’ fields where not proportional.
3. **Write path (rectification)**  
   - Apply corrections through normal app APIs where possible (preserves validation and audit).  
   - Document before/after hashes or row versions in the ticket.
4. **Delete path (erasure)**  
   - Follow a defined order respecting FKs (child tables first).  
   - For **Auth user removal**, delete from `users` table via n0crm-api admin or direct DB access; confirm org membership rows and CRM ownership reassignment policy.
5. **Evidence**  
   - Attach query text (redacted), execution timestamp, operator, and sample row counts.  
   - Store evidence in your ticket system; avoid copying full exports into chat logs.

## Post-completion

- [ ] Subject notified per policy template.
- [ ] `audit_log` or equivalent updated if your deployment records DSAR actions.
- [ ] Runbook step timings captured for future SLAs.

## References

- [#compliance-mapping](#compliance-mapping) (includes [evidence bundle](#compliance-evidence-bundle))
- [#external-hardening-checklist](#external-hardening-checklist) — RLS, tenant isolation, and admin access hygiene
- [#sell-ready-security-evidence-index](#sell-ready-security-evidence-index) — buyer review index
- [#enterprise-gaps](#enterprise-gaps) — what is NOT yet implemented

---


<a id="gitea-operations"></a>
## Gitea production operations

This project is ready to run in Gitea with Actions-compatible workflows and SSH remotes.

**Doc hub:** [`README`](./README.md).

## Repository Settings Checklist

Configure these settings in the Gitea repo:

1. **Default branch**
   - Keep `master` as default (current workflow target).
2. **Protected branch**
   - Protect `master`.
   - Require pull request merge.
   - Require at least 1 approval.
   - Block force pushes and branch deletion.
3. **Required status checks**
   - Require workflow jobs to pass before merge: `CI / api`, `CI / ci`, and `CI / security` (see `.gitea/workflows/ci.yml`).
   - In Gitea: **Settings → Branches → Branch protection → Enable status checks** and select all three jobs. See [Gitea protected branches](https://docs.gitea.com/usage/access-control/protected-branches).
4. **Actions**
   - Enable Actions for this repository.
   - Ensure a runner is online and allowed to run workflows.

## Required Runner Capabilities

The workflow requires:

- Linux runner (`ubuntu-latest` compatible image).
- Node.js 22 support.
- Internet access for `npm ci`.

Recommended runner baseline:

- 2 vCPU
- 4 GB RAM
- 10+ GB free disk

## Secrets and Variables

Current CI does not require project secrets.

If you add deployment or third-party integration jobs later, define secrets in Gitea Actions secrets (repo-level or org-level), never in `.env` committed files. Provider keys for the AI feature (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) belong in the API runtime environment, not in CI or the client bundle.

## Local Git Connectivity (SSH)

Use SSH remote:

```bash
git remote set-url origin git@gitea.apps.privateprompt.tech:clovrlabs/velo-crm.git
```

And in `~/.ssh/config`, set:

```sshconfig
Host gitea.apps.privateprompt.tech
    HostName gitea.apps.privateprompt.tech
    User git
    Port 2222
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
```

Quick verification:

```bash
ssh -T git@gitea.apps.privateprompt.tech
git ls-remote --heads origin
```

## CI Failure Triage

When a workflow fails:

1. Open Actions log in Gitea and identify failing step.
2. Reproduce locally with (per package — `api/` and `frontend/`):
   - `npm ci`
   - `npx tsc --noEmit`
   - `npx eslint .`
   - `npx vitest run`
   - `npm run build`
   - `npm audit --audit-level=critical`
3. Push fix branch and re-run workflow.

---


<a id="enterprise-gaps"></a>
## Enterprise gaps (roadmap — not implemented)

For honesty in buyer/security conversations: the following are **not** implemented today. Do not claim them as shipped, and do not represent them as certifications.

| Capability | Status | Notes |
|---|---|---|
| **SSO / SAML / OIDC** | Roadmap | Frontend feature-flag toggles exist (all `false`); no backend routes. |
| **SCIM** (user lifecycle provisioning) | Roadmap | Not implemented. |
| **MFA / 2FA enforcement** | Roadmap | A TOTP UI exists in Settings → Security, but the backend does not enforce MFA. |
| **Server-side RBAC enforcement** | Partial | RBAC is enforced **inline by role** in `api/` routes; the granular per-permission model in the UI is **frontend-only**. |
| **HA / DR** | Roadmap | Single Postgres + single Redis; no multi-AZ/replica failover. Backups exist (pg_dump 6h / 7-day), but no documented RTO/RPO or restore-drill calendar. |
| **GDPR DSAR (export / erasure)** | Manual only | Engineering runbook exists ([#dsar-playbook](#dsar-playbook)); no self-service or automated export/erasure pipeline. |
| **Full backend observability** | Partial | Prometheus/Grafana + health checks exist; backend **error tracking, alerting, and SLOs** are not in place (frontend has Sentry). |
| **Real job queue** | Roadmap | BullMQ is declared but unused; background work (e.g. sequence runner) runs on in-process pollers. |
| **Compliance certifications** | None | No SOC 2 / ISO 27001 / HIPAA / GDPR certification. This file is an engineering evidence map, not an audit artifact. |

> See also the project-level roadmap in [`master-roadmap-backlog.md`](./master-roadmap-backlog.md) and the engineering state in [`project-state.md`](./project-state.md).

---

*Last updated: **2026-06-10** — Supabase fully removed (Fastify-only backend); AI assistant + governance documented; API security hardening + backend CI gate reflected; enterprise gaps (SSO/SCIM/MFA, server-side RBAC, HA/DR, GDPR DSAR) honestly marked as roadmap.*
