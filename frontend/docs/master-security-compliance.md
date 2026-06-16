# Security & Compliance (master)

> Consolidated **2026-04-15**; auth migrated off Supabase to n0crm-api JWT **2026-05-13**; the app is now **fully Supabase-free** — the entire `frontend/supabase/` tree, `@supabase/supabase-js`, the Supabase CLI and all `supabase:*` scripts were removed, and the live backend is **Fastify 5 / Node 22 + postgres.js + Redis 7 + Socket.io 4** only. Enterprise identity shipped: **OIDC SSO, SCIM 2.0, MFA (TOTP), server-side RBAC, GDPR export/erasure, and a security-event audit log**. API + public-surface hardening shipped (trustProxy-keyed rate limits, CORS allow-list, webhook SSRF guards, account lockout, registration policy — see [#external-hardening-checklist](#external-hardening-checklist)). Single reference for auth/SSO/SCIM contracts, the hardening matrix, the sell-ready evidence index, the external hardening checklist, AI governance, the SOC2/GDPR mapping, DSAR procedures, and Gitea CI governance.

**Replaces:** auth-sso-backend-handoff, hardening-matrix, sell-ready-security-evidence-index, external-hardening-checklist, compliance-mapping, dsar-playbook, gitea-operations.

## Table of contents

- [**Security Review Pack** (start here for a security review)](#security-review-pack)
- [Client password policy and Zustand selectors](#client-password-policy-and-zustand-selectors)
- [Auth / SSO / SCIM backend](#auth-sso-backend-handoff)
- [AI governance and safety](#ai-governance)
- [Hardening matrix (audit-ready)](#hardening-matrix)
- [Sell-ready security & compliance evidence index](#sell-ready-security-evidence-index)
- [External hardening checklist](#external-hardening-checklist)
- [Compliance mapping (SOC2 / GDPR-lite)](#compliance-mapping)
- [DSAR procedure](#dsar-playbook)
- [Gitea production operations](#gitea-operations)
- [Enterprise gaps (genuinely open — not implemented)](#enterprise-gaps)

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
## Auth / SSO / SCIM backend

Primary auth is **email/password via n0crm-api** (Fastify backend in `api/`). JWT HS256 with `sub/org/role/jti` claims, algorithm pinned to prevent `alg:none` attacks, delivered as an HttpOnly cookie. **OIDC SSO, SCIM 2.0, and MFA (TOTP) are shipped** — see the subsections below. SAML federation remains [open](#enterprise-gaps).

**Auth-route hardening (shipped):**

- **trustProxy hop-count** (`TRUST_PROXY` env, nginx = 1 / privateprompt edge + nginx = 2): `req.ip` resolves from the trusted XFF suffix only, so the leftmost attacker-controlled `X-Forwarded-For` value can no longer evade per-IP rate limits on auth routes.
- **Account lockout**: 10 failed logins per account within 15 minutes returns **429** (`api/src/db/redis.ts`); counter clears on a successful authentication.
- **Self-registration policy**: `ALLOW_OPEN_REGISTRATION` (default `true`) and `REGISTRATION_ALLOWED_DOMAINS` allow-list gate `POST /auth/register`; the **first** user (bootstrap) is always allowed.
- **Security-event log**: auth and account-security events (`login_success`, `login_failed`, `login_mfa_required`, `mfa_enabled`, `impersonation_started`, …) are recorded to the append-only `security_events` table (`api/src/services/securityEvents.ts`, migration `020_security_events.sql`). Best-effort, fire-and-forget — a logging failure never breaks the request it describes.

## Document Control

- Status: Active
- Owner: Backend/Auth/Security
- Last updated: 2026-06-11 (OIDC SSO + SCIM 2.0 + MFA + server-side RBAC + GDPR export/erasure + security-event log marked delivered against code; genuinely-open gaps kept honest). Prior: 2026-06-10 (AI assistant + governance; auth-route hardening; backend CI gate + vitest suite). Prior: 2026-05-25 production hardening (PgBouncer, RLS on 21 tables, 40+ indexes, per-tenant rate limiting, Socket.io Redis adapter, Prometheus/Grafana, backup automation).
- Canonical: Yes

## n0crm-api auth endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /auth/register` | public | Create account; returns JWT with `org: null` |
| `POST /auth/login` | public | Email/password; returns JWT with `org` claim. Returns `{ mfaRequired: true }` (no token) when the account has MFA enabled and no valid TOTP code was supplied |
| `GET /auth/me` | Bearer JWT / cookie | Returns user + org info (incl. `mfaEnabled`) |
| `PATCH /auth/me` | Bearer JWT / cookie | Update profile (name, jobTitle, phone, avatarUrl) |
| `POST /auth/refresh` | Bearer JWT / cookie | Rotate JWT — old `jti` revoked, new `jti` issued |
| `PATCH /auth/password` | Bearer JWT / cookie | Change password (requires current password) |
| `POST /auth/admin/reset-password` | Bearer JWT (owner/admin) | Set another org member's password |
| `POST /auth/forgot-password` | public | Creates reset token with 1-hour TTL (always 200) |
| `POST /auth/reset-password` | public | Validate token + update password |
| `POST /auth/logout` | Bearer JWT / cookie | Revoke JWT in Redis denylist (`jwt:deny:{jti}`) + clear session |
| `GET /auth/resolve-org/:slug` | public | Resolve org slug → org metadata |
| `POST /auth/mfa/setup` | Bearer JWT / cookie | Generate a TOTP secret + `otpauth://` URL (stored encrypted, not yet enabled) |
| `POST /auth/mfa/enable` | Bearer JWT / cookie | Confirm a 6-digit code, then flip `mfa_enabled = true` |
| `POST /auth/mfa/disable` | Bearer JWT / cookie | Re-auth with current password, then disable MFA + clear the secret |

JWT payload: `{ sub: userId, org: organizationId | null, role: UserRole, jti: randomHex32 }`. Expiry: 7 days. The `jti` (JWT ID) enables per-token revocation — `POST /auth/logout` and `POST /auth/refresh` add the old `jti` to a Redis denylist with TTL equal to the token's remaining lifetime. Every authenticated request checks the denylist.

### MFA (TOTP) — shipped

- RFC 6238 TOTP (`api/src/services/totp.ts`, unit-tested `totp.test.ts`). Enrolled from **Settings → Security**; the login form prompts for a 6-digit code when `POST /auth/login` returns `mfaRequired`.
- The base32 secret is stored as **AES-256-GCM** ciphertext in `users.mfa_secret_cipher` (`services/tokenCipher.ts`, requires `TOKEN_ENCRYPTION_KEY`); `users.mfa_enabled` only flips true after the user proves possession with a valid code. Migration `019_mfa.sql`.
- Per-org or org-wide **enforcement** of MFA (mandatory enrolment) is not yet a policy control — enrolment is currently per-user opt-in.

### OIDC SSO — shipped

- Provider-agnostic OpenID Connect (`api/src/routes/sso.ts`, `api/src/services/oidc.ts`, tested `oidc.test.ts`):
  - `GET /auth/sso/status` → `{ enabled, issuer }` (drives the frontend SSO button; `Login.tsx` hides it when disabled).
  - `GET /auth/sso/start` → 302 to the IdP authorize URL; `state` + `nonce` + **PKCE S256** `code_verifier` stored in Redis.
  - `GET /auth/sso/callback` → one-time `state` consume (CSRF/replay guard), code exchange, **JWKS RS256** ID-token verification (`iss`/`aud`/`exp`/`nonce`), then **JIT provisioning** and the auth cookie.
- Enabled only when `OIDC_ISSUER` + `OIDC_CLIENT_ID` + `OIDC_CLIENT_SECRET` are configured; otherwise `/start` and `/callback` return **503**. New SSO users are created with `OIDC_DEFAULT_ROLE` (default `sales_rep`) and an unusable placeholder password. Inactive accounts are rejected; provisioning and login emit `security_events`.
- Setup guide: [`docs/sso-and-scim.md`](../../docs/sso-and-scim.md).

### SCIM 2.0 — shipped

- RFC 7643/7644 user provisioning under `/scim/v2` (`api/src/routes/scim.ts`, tested `scim.test.ts`):
  - `GET /scim/v2/ServiceProviderConfig`, `GET/POST /scim/v2/Users`, `GET/PUT/PATCH/DELETE /scim/v2/Users/:id`.
- Auth is a **Bearer API key scoped `scim`** (minted in Settings → Integrations); the key maps to the target organization, so no separate token store is required.
- Deprovision (`DELETE`, or `PATCH active=false`) is a **soft deactivate** plus session invalidation (`setUserTokensValidAfter`); the **last active owner can never be deactivated or deleted** (409). Provision/deprovision are written to `audit_log`.

## SSO frontend toggles

`Login.tsx` queries `GET /auth/sso/status` at mount and only renders the SSO button when the backend reports `enabled: true`. There is no client-side provider feature-flag matrix; the IdP is configured entirely server-side via the `OIDC_*` env vars.

---


<a id="ai-governance"></a>
## AI governance and safety

The AI / agentic feature (`api/src/services/ai/*`, routes under `/ai`) is **multi-provider** — Google Gemini (free default), OpenAI, Anthropic — and only activates when at least one provider key is configured (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). When no key is set the UI hides AI entirely. Persisted state lives in `ai_conversations`, `ai_messages`, and `ai_usage_log` (migration `018_ai.sql`).

## Document Control

- Status: Active
- Owner: Backend/AI/Security
- Last updated: 2026-06-11
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

**Snapshot (2026-06-11):** Enterprise identity controls shipped on top of the API security and infrastructure hardening: **OIDC SSO** (PKCE S256, JWKS RS256 verify, JIT provisioning), **SCIM 2.0** user lifecycle (scoped Bearer api-key, soft-deprovision + session revoke, last-active-owner protection), **MFA (TOTP)** (AES-256-GCM secret at rest, login prompt), **server-side RBAC** (`requirePermission`/`requireCrudPermission` across CRM CRUD + member/API-key/webhook management; roles owner/admin/manager/sales_rep/viewer), **GDPR export/erasure** endpoints (`/privacy`), and an append-only **`security_events`** log (migration 020). API-key **scopes** are now enforced (`leads:write`, `scim`) with a Settings → Integrations scope selector. Prior API hardening: trustProxy hop-count (XFF no longer spoofable on auth routes), account lockout (10 / 15 min → 429), self-registration policy, `/metrics` gated on the raw socket peer + `x-internal-key`, `/_debug/sql` running in a **READ ONLY** transaction, Socket.io handshake re-checking `users.is_active` + org, Slack outbound re-asserting the `hooks.slack.com` allow-list at send, cross-org FK ownership checks on deals, and the sequence runner claiming rows `FOR UPDATE SKIP LOCKED`. `npm audit` reports **0 vulnerabilities** on api and frontend. CI gate (`.gitea/workflows/ci.yml`): the `api` job runs tsc → eslint → vitest → build → npm audit; the API vitest suite is **105 tests across 16 files**; the frontend suite is **273 tests**. Prior (2026-05-25): RLS on 21 tables with `set_current_org()`, 40+ indexes, PgBouncer (transaction mode, 25 server conn / 500 max clients), Prometheus/Grafana, per-org 500 req/min + per-IP 20 req/min auth limits, Socket.io Redis adapter, pg_dump backups (6h / 7-day retention), service health checks. Rows below stay open until **external** sign-offs (RLS review, DR drill calendar, secret rotation log) are attached as evidence.

**Audit hardening (2026-06-14):** a full end-to-end product audit fixed ~41 issues (migrations 026–029). Security-relevant changes: **tickets** routes were missing `app.authenticate` (the RBAC hook alone left `req.user` undefined → 403 for all) — fixed; API-key **rotate** now preserves the key's scopes (a rotated scoped key was silently becoming full-access); OIDC rejects an explicitly `email_verified:false` assertion before JIT match/create and re-resolves its discovery document hourly; a new admin **create-member** endpoint (`POST /orgs/me/members`) is `members:manage`-gated and bcrypt-hashes the password; `POST /email/bulk-send` rejects `viewer` and caps batches (≤500, 5/min). **Data-model note:** record owner (`assigned_to`) is a display-name `text` column, not a `uuid` FK (migration 028) — the app validates/filters/searches owners by name throughout; a future owner-by-id model is a separate frontend refactor.

## Document Control

- Status: Active
- Owner: Security/Ops/Backend
- Last updated: 2026-06-14 (audit-wave security items — migrations 026–029 — folded in; mirrored in [`SECURITY-AUDIT.md`](../../SECURITY-AUDIT.md#audit-hardening-2026-06-14)). Prior: 2026-06-11.
- Canonical: Yes

## Scoring Legend

- **Impact**: Low / Medium / High / Critical
- **Likelihood**: Low / Medium / High
- **Priority**: P0 (urgent) / P1 (high) / P2 (planned)

### Risk register

| Domain | Risk | Impact | Likelihood | Current Control | Remaining Gap | Priority | Owner | ETA |
|---|---|---|---|---|---|---|---|---|
| Multi-tenancy | Cross-tenant data leakage | Critical | Low | App-layer org scoping is the authoritative control; RLS on 21 tables + `set_current_org()` is opt-in defense-in-depth (see `docs/adr/0001-tenant-isolation-and-rls.md`); claim helpers (`get_org_id`, `get_user_role`); cross-org FK ownership checks on deals | Periodic tenant-isolation regression in CI; production RLS validation drill | P0 | Backend | 1 sprint |
| Auth / Access | Authorization bypass via client trust | High | Low | **Server-side RBAC** (`requirePermission`/`requireCrudPermission`, matrix in `services/permissions.ts`) on CRM CRUD + member/API-key/webhook management; roles owner/admin/manager/sales_rep/viewer; viewer is read-only | Extend coverage to remaining admin/config routes; CI permission-matrix regression | P1 | Backend | Shipped (expand) |
| Auth / SSO | OIDC provider misconfiguration blocks sign-in | Medium | Medium | OIDC SSO: PKCE S256, JWKS RS256 ID-token verify (iss/aud/exp/nonce), one-time state consume; `/status` gates the login button; 503 when unconfigured | IdP drift monitoring; broader provider matrix testing | P2 | Backend/Auth | Shipped (monitor) |
| Auth | Account takeover via single factor | High | Medium | **MFA (TOTP, RFC 6238)**; AES-256-GCM secret at rest; login prompt on `mfaRequired` | Org-wide / mandatory MFA enforcement policy (currently per-user opt-in) | P2 | Backend/Auth | Shipped (enforce later) |
| Auth | Brute-force / credential stuffing | High | Medium | Account lockout: 10 failed logins / 15 min → 429 (`api/src/db/redis.ts`); counter clears on success; failures recorded in `security_events` | Tune thresholds; alert on lockout spikes | P1 | Backend/Auth | Shipped (monitor) |
| Auth | XFF spoofing to evade per-IP rate limits | High | Medium | trustProxy hop-count (`TRUST_PROXY`); rate limits keyed on the resolved `req.ip` (trusted XFF suffix only) | Verify hop count per deployment topology | P1 | Backend/Ops | Shipped |
| Identity lifecycle | Stale access after offboarding | Medium | Medium | **SCIM 2.0** deprovision = soft deactivate + session revoke (`setUserTokensValidAfter`); last active owner protected; member status/role PATCH with safety rules | Automate IdP↔SCIM reconciliation checks | P2 | Backend | Shipped |
| Tenancy / Registration | Unsanctioned self-registration | Medium | Medium | `ALLOW_OPEN_REGISTRATION` toggle + `REGISTRATION_ALLOWED_DOMAINS` allow-list; first user always allowed | Optional invite-only enforcement per org | P2 | Backend | Shipped |
| Auditability | Insufficient security-event trail | Medium | Medium | Append-only `security_events` table + `recordSecurityEvent` (login success/fail, MFA, registration, impersonation); org-scoped `audit_log` for business activity | Retention policy + export/SIEM forwarding | P2 | Backend/Security | Shipped (extend) |
| Debug / Telemetry surface | Sensitive endpoint exposure | High | Low | `/metrics` gated on raw socket peer + `x-internal-key`; `/_debug/sql` runs in a READ ONLY transaction | Periodic review of debug routes in prod images | P1 | Backend/Ops | Shipped |
| AI | Runaway AI spend / data over-retention | Medium | Medium | Per-org kill switch, monthly output-token cap (429 when exceeded), `AI_AGENT_MAX_STEPS`, `ai_*` retention purge, provider egress allow-list | Per-org spend dashboards + alerting | P2 | Backend/AI | Shipped (monitor) |
| AI | Agent writes outside caller scope | High | Low | Org-scoped tools; writes (`create_activity`, `update_deal_stage`) gated by `allowWrites` and audit-logged | Add per-tool rate caps; expand audit coverage | P2 | Backend/AI | Shipped |
| Auth | User enumeration via timing | High | Low | Bcrypt cost 12 with constant-time comparison on login; password reset always returns 200 (no user leakage) | Validate timing across all login paths in staging | P1 | Backend/Auth | 1 sprint |
| Auth | Password reset token exposure | High | Low | SHA-256 hash in DB (not plaintext); 1-hour TTL; single-use | Rotate reset token secret on compromise | P1 | Backend/Auth | Ongoing |
| Privacy / GDPR | No mechanism for data-subject rights | Medium | Medium | **GDPR endpoints** (`/privacy`): org export (Art. 20), subject export (Art. 15), erasure/anonymize (Art. 17); owner/admin gated; erasure audit-logged | Self-service / scheduled DSAR automation; org-configurable retention | P2 | Product/Backend | Shipped (extend) |
| Email Infra | Default provider rate limiting disrupts onboarding | High | Medium | SMTP/custom provider guidance documented | Production SMTP failover playbook | P1 | Ops | 1 sprint |
| Lead Scoring | Stale scoring due to scheduler outage | High | Medium | Backend-first maintenance + telemetry + SLA guardrail alerts | External monitor (pager integration) and weekly trend review | P0 | Ops/Backend | 1 sprint |
| Data Consistency | Lead conversion partial writes under failure | High | Low | `promote-lead` server-side conversion path | Add explicit idempotency key strategy | P1 | Backend | 2 sprints |
| Observability | Silent failures in maintenance and automations | High | Medium | `lead_score_maintenance_runs` + Settings Ops Dashboard + runbook | Centralized log sink + dashboards in external APM | P1 | Ops | 2 sprints |
| Security Posture | Function search path and definer misuse | High | Low | Search path hardening migration applied | Quarterly SQL function review checklist | P1 | Security/Backend | 1 sprint |
| Secrets Management | Secret leakage in job environments | Critical | Low | Secret-based system mode (`LEAD_MAINTENANCE_SECRET`); MFA/token secrets encrypted with `TOKEN_ENCRYPTION_KEY` | Secret rotation policy + expiry calendar | P0 | Ops/Security | 1 sprint |
| Release Safety | Unverified deploy introduces regression | High | Medium | CI gate on both packages (api: tsc/eslint/vitest/build/audit; frontend: full guardrail suite) | Pre-deploy smoke suite and release gate document | P1 | Engineering | 1 sprint |
| Governance | Limited audit completeness for enterprise asks | Medium | Medium | `audit_log` + `security_events` + maintenance telemetry + DSAR/retention runbooks + compliance mapping | Field-level security model + **tenant** retention automation + logged DR drills | P2 | Product/Backend | 3 sprints |
| Database Layer | Performance degradation at 500+ tenants | High | Medium | PgBouncer (transaction mode, 25 server conn, 500 max clients) + 40+ indexes (pg_trgm, B-tree FK paths, composite list queries) + RLS on 21 tables | Load test at target tenant count; monitor PgBouncer pool utilization | P1 | Backend/DBA | 1 sprint |
| Infrastructure | Lack of observability for multi-node deployments | High | Medium | Prometheus + Grafana + postgres-exporter + node-exporter (15s scrape interval); health checks on all services (30s, 3 retries) | Backend error tracking + SLO dashboards + automated alerting (open) | P1 | Ops | 1 sprint |
| Data Protection | Unplanned downtime risk (database failure) | High | Low | Automated backup (pg_dump every 6h, gzip, 7-day retention in `./backups/`); restore runbook at `docs/disaster-recovery.md` | Restore drill calendar + documented RTO/RPO SLAs; automated failover; offsite replication | P1 | Ops/DBA | 2 sprints |
| Scaling | Multi-node WebSocket state leakage | High | Low | Socket.io Redis adapter (no in-memory store); broadcasts to org-scoped rooms only | Load test multi-node Socket.io failover; verify room isolation under chaos | P1 | Backend | 1 sprint |
| Rate Limiting | Global limit insufficient for per-tenant fairness | High | Medium | Per-org rate limit (500 req/min via Redis) + per-IP auth limit (20 req/min); Nginx layer in production | Verify per-org isolation under synthetic load; audit token replay risk | P1 | Backend/Ops | 1 sprint |

## Immediate Actions (Next 7 Days)

1. Wire pager/incident channel for SLA breach outputs (`maintenance:lead:sla`) and `security_events` lockout spikes.
2. Add CI tasks for tenant-isolation smoke tests and an RBAC permission-matrix regression.
3. Define and document secret rotation cadence (incl. `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, maintenance system mode).
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
  - auth/provider incidents and `security_events` anomalies.
- Sign-off from Backend + Ops + Product on all P1 timelines.

> **Related:** [Sell-ready evidence index](#sell-ready-security-evidence-index), [Compliance mapping](#compliance-mapping), [Evidence bundle](#compliance-evidence-bundle), and the [doc hub](./README.md).

---


<a id="sell-ready-security-evidence-index"></a>
## Sell-ready security & compliance evidence index

This index ties **internal documentation**, **code controls**, and **external checklists** to what enterprise buyers typically request. It is not a certification; it is an engineering evidence map.

**Doc hub:** All `docs/` paths and a **status snapshot table** are maintained in [`docs/README.md`](./README.md). The full structural map is [`docs/CODEBASE-MAP.md`](../../docs/CODEBASE-MAP.md); identity setup is [`docs/sso-and-scim.md`](../../docs/sso-and-scim.md).

## How to use

1. Complete each linked checklist and attach proof (screenshots, CLI output, dated sign-off).
2. Map items to procurement questionnaires (SOC2-style, GDPR-style) using [Compliance mapping](#compliance-mapping).
3. For application-level control depth, cross-check against [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard) Level 1–2.

**Where to find buyer-facing artifacts:** this file holds **Gitea**, the **external hardening checklist**, the **hardening matrix**, **AI governance**, **DSAR**, and the **SOC2/GDPR mapping**. Use [`master-email-operations`](./master-email-operations.md) (deliverability), [`master-lead-management`](./master-lead-management.md) (maintenance + retention), [`master-release-qa`](./master-release-qa.md) (go-live + QA), [`master-design-ui`](./master-design-ui.md) (UI evidence), [`master-implementation-history`](./master-implementation-history.md) (engineering narrative). Code anchors for identity: `api/src/routes/sso.ts`, `api/src/routes/scim.ts`, `api/src/routes/auth.ts` (MFA), `api/src/middleware/rbac.ts`, `api/src/services/permissions.ts`, `api/src/routes/dataPrivacy.ts`, `api/src/services/securityEvents.ts`. Outbound mail: `api/src/routes/email.ts` (SMTP creds AES-256-GCM at rest) + `api/src/routes/slack.ts` (`hooks.slack.com` allow-list). Frontend channels: `frontend/src/lib/envChannel.ts`, `frontend/src/lib/api.ts`, `frontend/vite.config.ts`, `api/.env.example`.

## ASVS (informal)

- **V2 Authentication** — n0crm-api JWT (bcrypt cost 12, per-token `jti` denylist, rate-limited auth routes, account lockout, trustProxy-keyed `req.ip`), **MFA (TOTP)**, **OIDC SSO** (PKCE + JWKS RS256): [#auth-sso-backend-handoff](#auth-sso-backend-handoff); `api/src/routes/scim.test.ts`, `api/src/services/totp.test.ts`, `api/src/services/oidc.test.ts`
- **V4 Access control** — **server-side RBAC** (`requirePermission`/`requireCrudPermission`, matrix in `services/permissions.ts`) + app org gates + cross-org FK ownership checks; RLS as defense-in-depth: [#external-hardening-checklist](#external-hardening-checklist); `api/src/middleware/rbac.test.ts`, `api/src/services/permissions.test.ts`
- **V9 Communications** — TLS to APIs + outbound mail/Slack controls: external CDN/infra; `api/src/routes/email.ts`, `api/src/routes/slack.ts` (SSRF allow-list); [`master-email-operations`](./master-email-operations.md#email-deliverability-resend)
- **V7 Error handling / logging** — `audit_log` (incl. AI write tools, SCIM, GDPR erasure) + append-only `security_events`, maintenance telemetry, failed-send audit: [`master-lead-management`](./master-lead-management.md#lead-maintenance-runbook); [#hardening-matrix](#hardening-matrix)
- **V14 Configuration** — Channels + env validation: `frontend/src/lib/envChannel.ts`, `frontend/vite.config.ts`, `api/src/config/env.ts`, `api/.env.example` (`VITE_APP_CHANNEL` production/staging, `development` default in dev; API env validated at startup with fail-fast guards; `OIDC_*` and `TOKEN_ENCRYPTION_KEY` optional but required to enable SSO/MFA; no Supabase runtime)
- **V8 Data protection** — Tenant isolation + **GDPR export/erasure** + AI data retention: [#dsar-playbook](#dsar-playbook); [#ai-governance](#ai-governance); `api/src/routes/dataPrivacy.ts`; [`master-lead-management`](./master-lead-management.md#data-retention-runbook)

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
- [x] **MFA (TOTP):** RFC 6238; secret stored AES-256-GCM (`TOKEN_ENCRYPTION_KEY`); enrolled in Settings → Security; login prompts on `mfaRequired`. Migration `019_mfa.sql`. (Org-wide enforcement policy is open.)
- [x] **OIDC SSO:** PKCE S256 + JWKS RS256 ID-token verification (iss/aud/exp/nonce) + one-time `state`; JIT provisioning at `OIDC_DEFAULT_ROLE`; disabled (503) unless `OIDC_ISSUER/CLIENT_ID/CLIENT_SECRET` set.
- [x] **Account lockout:** 10 failed logins / 15 min per account → 429 (`api/src/db/redis.ts`); counter clears on successful auth.
- [x] **Self-registration policy:** `ALLOW_OPEN_REGISTRATION` (default `true`) + `REGISTRATION_ALLOWED_DOMAINS` allow-list gate `POST /auth/register`; first (bootstrap) user always allowed.
- [x] **trustProxy hop-count** (`TRUST_PROXY`): rate limits keyed on the resolved `req.ip` (trusted XFF suffix only) — XFF not spoofable on auth routes.
- [x] **Security-event log:** auth/account events recorded to append-only `security_events` (`securityEvents.ts`, migration `020`); logging failures never break the request.
- [x] `POST /auth/logout` revokes JWT in Redis denylist before clearing session.
- [x] Impersonation audit log INSERT must succeed before token is issued (fail-fast on log failure); impersonation exit sets `ended_at`.

## 2. Tenant isolation and access control (PostgreSQL + app layer)

- [x] App-layer org scoping is the **authoritative** isolation control; all org-scoped routes assert `req.user.org`; cross-org **FK ownership checks** on deals prevent attaching another tenant's records.
- [x] RLS **enabled** on 21 tenant/user tables with `set_current_org()` SECURITY DEFINER + claim helpers (`get_org_id`, `get_user_role`) as **defense-in-depth** (opt-in; see `docs/adr/0001-tenant-isolation-and-rls.md`). Do **not** represent RLS as the sole enforcement on every table.
- [x] **Server-side RBAC** enforced via `requirePermission`/`requireCrudPermission` (`api/src/middleware/rbac.ts`, matrix in `services/permissions.ts`) across CRM CRUD (contacts/companies/deals/activities/leads/**tickets**/**updates**) + member, API-key, automation, and webhook management. Roles: owner/admin/manager/sales_rep/viewer (viewer is read-only). Member lifecycle: `PATCH /orgs/me/members/:id/role|status` with safety rules.

### Role capability matrix

Authoritative source: `api/src/services/permissions.ts` (`resource:action` permissions, enforced server-side; `owner` implicitly holds every permission). Roles in privilege order: **owner → admin → manager → sales_rep → viewer**. The CRM record resources — **contacts, companies, deals, activities, leads, tickets, updates** — all share one read/write/delete pattern, so the recently shipped **Tickets / help desk** and **Updates & @mentions** features inherit the same gates as the rest of the CRM.

| Capability | Owner | Admin | Manager | Sales rep | Viewer |
|---|:--:|:--:|:--:|:--:|:--:|
| CRM records — **read** (contacts · companies · deals · activities · leads · **tickets** · **updates**) | ✓ | ✓ | ✓ | ✓ | ✓ |
| CRM records — **create / edit** | ✓ | ✓ | ✓ | ✓ | — |
| CRM records — **delete** | ✓ | ✓ | ✓ | — | — |
| Reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| AI assistant (`ai:use`) | ✓ | ✓ | ✓ | ✓ | — |
| Automations — manage recipes | ✓ | ✓ | ✓ | — | — |
| Settings — read | ✓ | ✓ | ✓ | — | — |
| Settings — manage | ✓ | ✓ | — | — | — |
| Members — read | ✓ | ✓ | ✓ | — | — |
| Members — manage (role / status) | ✓ | ✓ | — | — | — |
| API keys — manage | ✓ | ✓ | — | — | — |
| Webhooks — manage | ✓ | ✓ | — | — | — |
| Billing — manage | ✓ | ✓ | — | — | — |

**Per-user–owned features** (not role-gated — every authenticated member manages their own): **booking links** (`/booking-pages`, scoped to `user_id`) for the meeting scheduler, plus their personal **web-to-lead forms**. **Public, no-account surfaces** (token-in-path, honeypot + rate-limited): `/book/:token` (meeting scheduler) and `/forms/:token` (web-to-lead capture). Calendar/Timeline board views and composable dashboard widgets are UI layers over `deals`/`activities` data and are governed by those resources' **read** permission.
- [x] `SECURITY DEFINER` functions reviewed; search-path hardening migration applied.
- [x] Indexes exist on columns referenced in policies / hot paths (40+ indexes; avoids full-table scans at scale).
- [ ] Run tenant-isolation smoke in CI: User A cannot read/update User B org rows (automate — see Immediate Actions).
- [ ] Run RBAC permission-matrix regression in CI (assert each role's allowed/denied actions).

## 3. API surface, integrations, and egress

- [x] **No** server secrets in client bundles; the SPA holds only `VITE_API_URL` (+ `VITE_APP_CHANNEL`).
- [x] **CORS:** `CORS_ORIGIN` allow-list (comma-separated exact origins) enforced by the Fastify CORS guard; production guard rejects `*`.
- [x] **Per-tenant rate limiting:** per-org 500 req/min (Redis-backed) + per-IP 20 req/min on auth routes.
- [x] **API-key scopes enforced:** keys are minted with optional scopes (`leads:write`, `scim`); the public lead endpoint requires `leads:write` (403 `{error:"Insufficient API key scope", required:"leads:write"}` otherwise) and SCIM requires `scim`. Legacy keys with no scopes remain full-access for back-compat. Settings → Integrations exposes a scope selector and shows scopes per key.
- [x] **Public lead capture:** `POST /public/v1/leads` authenticated by header `x-api-key: n0crm_…`; explicit column selects (no `select('*')`), per-key rate limits (20/min), bounded request bodies, generic client error bodies (details in logs only). It is write-only lead intake, not a read API.
- [x] **Outbound mail:** SMTP credentials encrypted at rest (AES-256-GCM); all sends routed through `api/` (`api/src/routes/email.ts`); payload caps applied.
- [x] **Slack outbound:** the `hooks.slack.com` HTTPS allow-list is re-asserted at send time (`api/src/routes/slack.ts`, tested in `slack.test.ts`) — SSRF defense.
- [x] **Outbound webhooks:** subscriber URLs resolved with SSRF defenses + a safe custom-header allow-list before `fetch`; deliveries outboxed with bounded retries; management gated by `webhooks:manage` RBAC.
- [x] **`/metrics`** gated on the raw socket peer (`req.socket.remoteAddress`) + `x-internal-key` (not the trustProxy-resolved `req.ip`).
- [x] **`/_debug/sql`** runs inside a **READ ONLY** transaction unless `allow_writes:true` is explicitly passed; any write in a READ ONLY tx is rejected by Postgres.
- [x] **Socket.io** handshake re-checks `users.is_active` + org membership; broadcasts only to org-scoped rooms.
- [x] **Sequence runner** claims enrollments `FOR UPDATE SKIP LOCKED` — no double-send across ticks/nodes. (60s in-process poller advancing email + wait steps via a `current_step` index; not a flow-graph executor.)
- [x] **GDPR endpoints** (`/privacy`): org export (Art. 20), subject export (Art. 15), erasure/anonymize (Art. 17) — owner/admin gated; erasure audit-logged.
- [x] **Billing:** free-tier caps applied for churned orgs when Stripe is configured.
- [x] **SPA transport hygiene:** static responses include baseline security headers where the host supports them ([`../vercel.json`](../vercel.json), [`../public/_headers`](../public/_headers)); rich-text/signature preview sanitized with DOMPurify; client IDs use `crypto.randomUUID()`.
- [x] Removed an orphan passwordless DB-trust entrypoint and a public Adminer service.

## 4. Backups and recovery

- [x] Automated backups enabled for production database (pg_dump every 6h, gzip, 7-day retention in `./backups/`).
- [ ] Restore drill documented and exercised (who runs it, how long it takes, last drill date). Runbook exists at `docs/disaster-recovery.md`; a drill **calendar** and recorded RTO/RPO are open.
- [ ] Automated failover / HA (multi-AZ replica) — **not implemented** (single Postgres + single Redis); see [Enterprise gaps](#enterprise-gaps).
- [x] Database connection pooling reviewed (PgBouncer transaction mode, 25 server conn / 500 max clients).

## 5. Docker and Infrastructure

- [x] api/Dockerfile runs as non-root `USER node` (not root).
- [x] api/.dockerignore prevents `.env` from leaking into image layers.
- [x] api/docker-entrypoint.sh auto-runs migrations before server start (no manual post-deploy step).
- [x] `JWT_SECRET` and `TOKEN_ENCRYPTION_KEY` use Compose `:?` guards (fail-fast if unset).
- [x] Root docker-compose.yml (monorepo) starts both frontend and api services with health checks; the API is bound to `127.0.0.1:3001` and proxied under `/api` by nginx in production.

> Re-confirm rows in this section against the current `api/Dockerfile`, `api/.dockerignore`, and root `docker-compose.yml` before attaching as audit evidence.

## 6. Observability

- [x] Prometheus scrapes `/metrics` (15s) + postgres-exporter + node-exporter; Grafana auto-provisioned.
- [x] Request correlation: `x-request-id` propagated; `captureException` + optional `SENTRY_DSN`; health probes `/health`, `/health/ready`, `/health/live`.
- [ ] n0crm-api structured logs reviewed on a schedule (stdout → your log aggregator).
- [ ] API logs reviewed for SSO, Gmail, webhook, AI, SCIM, and public-API errors.
- [ ] Alerts for auth anomalies (incl. lockout spikes + `security_events`), route error rate, AI spend/cap breaches, and database CPU/storage. **Backend SLOs and automated alerting are [open](#enterprise-gaps)** (frontend has Sentry).

## CI/CD and Secrets

- [x] CI gates run per package: `.gitea/workflows/ci.yml` has an **`api`** job (`npm ci → tsc → eslint → vitest → build → npm audit`) and a **`ci`** job for `frontend/` (ui:lint, i18n:lint, i18n parity, eslint, tsc, vitest, build, bundle budget, npm audit). Gitea is the authoritative remote; `.github/workflows/` mirrors may exist but cite the Gitea pipeline.
- [x] API test suite: **105 tests across 16 files** (vitest). Frontend suite: **273 tests**.
- [ ] E2E secrets use n0crm-api endpoints: `E2E_API_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`.
- [x] `npm audit` reports **0 vulnerabilities** on api and frontend.
- [ ] No secrets committed; all environment variables set in CI/CD platform. Provider keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`), `OIDC_*`, and `TOKEN_ENCRYPTION_KEY` belong in the API runtime, not the client bundle or CI logs.

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
- Last updated: 2026-06-11
- Canonical: Yes

**Related hub:** [`README`](./README.md) (status snapshot + index). DSAR and retention: [#dsar-playbook](#dsar-playbook), [`master-lead-management` — retention](./master-lead-management.md#data-retention-runbook).

> **Honesty note:** This is a pragmatic engineering mapping, **not** a certification. n0CRM holds **no** SOC 2 / ISO 27001 / HIPAA / GDPR certification. **Delivered** today: OIDC SSO, SCIM 2.0, MFA (TOTP), server-side RBAC, GDPR data-subject export/erasure, and a security-event log. **Still open:** SAML federation, automated HA/DR failover (a restore runbook exists), backend SLOs/alerting, a real background job queue (BullMQ present but unused), and formal third-party certifications. See [Enterprise gaps](#enterprise-gaps).

## Scope

- Application: n0CRM
- Backend: n0crm-api only — Fastify 5, PostgreSQL 16 (via PgBouncer), Redis 7, Socket.io, JWT auth, OIDC SSO, SCIM 2.0, MFA. **No Supabase** (fully migrated off).
- AI: multi-provider AI service with per-org governance (kill switch, token cap, retention) — see [#ai-governance](#ai-governance).
- Operational controls: lead maintenance telemetry/SLA, runbooks, handoff checklists, security-event log.

## Control Mapping Table

*Evidence abbreviations:* **hist:A** = [`master-implementation-history`](./master-implementation-history.md#implementation-history-sections-01-12) (Part A) · **LM** = [`master-lead-management`](./master-lead-management.md) (anchors: score backend, runbook, ops dashboard, retention as applicable) · **RQA** = [`master-release-qa`](./master-release-qa.md#production-handoff-checklist) · **sec** = this file (`#auth-sso-backend-handoff`, `#dsar-playbook`, etc.).

| Framework Area | Control Objective | Current Implementation | Evidence | Gap / Next Action | Owner |
|---|---|---|---|---|---|
| SOC2 - Security | Enforce least privilege access | **Server-side RBAC** (role matrix enforced per-route) + app-layer tenant isolation via `organization_id` + RLS (defense-in-depth) + role claims | `middleware/rbac.ts`, `services/permissions.ts` (+ tests), hist:A | Add CI permission-matrix + tenant-isolation regression | Backend |
| SOC2 - Security (identity) | Strong authentication & federation | MFA (TOTP, AES-256-GCM secret), OIDC SSO (PKCE + JWKS RS256, JIT provisioning), per-token `jti` denylist | `routes/sso.ts`, `routes/auth.ts` (MFA), `services/oidc.ts`/`totp.ts` (+ tests) | Org-wide MFA enforcement policy; SAML (open); broader IdP testing | Backend/Auth |
| SOC2 - Security (provisioning) | Controlled user lifecycle | SCIM 2.0 provision/deprovision (soft-deactivate + session revoke, last-owner protection); member role/status PATCH | `routes/scim.ts` (+ `scim.test.ts`), `routes/orgs.ts` | Automate IdP↔SCIM reconciliation | Backend |
| SOC2 - Availability | Detect and respond to processing disruptions | `lead-score-maintenance` telemetry + SLA mode + notifications; health probes (`/health`, `/health/ready`, `/health/live`) | LM (score backend, runbook), `routes/health.ts` | External paging + uptime SLO dashboard (backend SLOs open) | Ops |
| SOC2 - Processing Integrity | Ensure scoring jobs run correctly and are observable | `lead_score_maintenance_runs` status/error history + Settings Ops dashboard | LM (ops dashboard) | Add anomaly thresholds and automated weekly report | Backend/Ops |
| SOC2 - Change Management | Controlled release readiness | Production handoff checklist + **CI gates** on both packages (api: tsc/eslint/vitest/build/audit, 105 tests; frontend: full guardrail suite, 273 tests) | RQA, `.gitea/workflows/ci.yml` | Enforce required status checks on `master`; add regression tests | Engineering |
| SOC2 - Confidentiality | Protect secrets and auth paths | JWT HS256 pinned + `jti` denylist, bcrypt cost 12, account lockout, MFA/SMTP secrets AES-256-GCM at rest (`TOKEN_ENCRYPTION_KEY`), env validated at startup | sec (auth handoff, external checklist) | Define secret rotation cadence and audit log | Ops/Security |
| SOC2 - Security (monitoring) | Detect/limit abuse + retain security events | trustProxy-keyed per-IP + per-org rate limits, account lockout, append-only `security_events` log, `/metrics`+`/_debug` surface gating, SSRF allow-lists (Slack/webhooks) | sec (external checklist), `services/securityEvents.ts`, migration 020 | Wire alerting on lockout/error-rate spikes; SIEM forwarding (alerting open) | Backend/Ops |
| AI Governance | Bound AI cost, scope, and data lifetime | Per-org kill switch, monthly output-token cap (429), org-scoped + audited agent tools, `AI_MESSAGE_RETENTION_DAYS` purge, egress allow-list | [#ai-governance](#ai-governance), `018_ai.sql` | Per-org AI spend dashboards + alerting | Backend/AI |
| GDPR-lite - Data Segregation | Prevent cross-customer data access | Org-scoped data model (authoritative) + RLS per tenant (defense-in-depth) + cross-org FK ownership checks | hist:A, migrations | Add documented quarterly RLS review | Backend |
| GDPR-lite - Data Subject Rights | Provide access / portability / erasure | **`/privacy` endpoints**: org export (Art. 20), subject export (Art. 15), erasure/anonymize (Art. 17); owner/admin gated; erasure audit-logged | `routes/dataPrivacy.ts`, [#dsar-playbook](#dsar-playbook) | Add self-service / scheduled DSAR automation; org-configurable retention | Product/Backend |
| GDPR-lite - Data Minimization | Keep only necessary operational data | Scoped telemetry table + AI `ai_*` retention purge + GDPR erasure anonymizes-in-place | `lead_score_maintenance_runs` migration, LM (retention), [#ai-governance](#ai-governance) | Set org-specific retention periods and automated purge where required | Product/Ops |
| GDPR-lite - Incident Response | Procedure for failures that may impact service/data | Incident runbook with triage/recovery/escalation; `security_events` trail | LM (runbook), `services/securityEvents.ts` | Extend to broader security incident classes | Ops/Security |

## Compliance Posture Summary

- **Strong today**:
  - Strong authentication (MFA + OIDC SSO) and controlled user lifecycle (SCIM).
  - Server-side RBAC + tenant data segregation architecture.
  - GDPR data-subject export/erasure endpoints + append-only security-event log.
  - Maintenance observability, operational runbooks, and CI gates on both packages.
- **Needs hardening for enterprise audits**:
  - Formalized secret rotation evidence and rotation cadence.
  - Backend SLOs + automated alerting; logged DR restore drills + HA/failover.
  - SAML federation; field-level security; formal third-party certifications.

## 30-Day Compliance Actions

1. ~~Define and publish telemetry/log retention policy.~~ Baseline: [`master-lead-management` — retention](./master-lead-management.md#data-retention-runbook) (tune periods per org).
2. Add CI checks for tenant-isolation and RBAC permission-matrix regression.
3. Add secret rotation SOP and execution log.
4. ~~Draft DSAR handling procedure (request intake, export, correction, deletion path).~~ Delivered: `/privacy` endpoints + [#dsar-playbook](#dsar-playbook); add self-service automation.

<a id="compliance-evidence-bundle"></a>
## Evidence bundle (single pointer)

Do not maintain a second list of the same links. Use **[Sell-ready security evidence index](#sell-ready-security-evidence-index)** for the buyer-facing map; this compliance section adds only the **control mapping table** above and **DSAR** below.

---


<a id="dsar-playbook"></a>
## DSAR procedure

Procedure for handling **data subject access requests** in a n0CRM deployment backed by **n0crm-api (JWT auth + PostgreSQL)**. This is not legal advice; align intake, timelines, and legal review with your organization’s privacy counsel and jurisdiction.

> **Status:** The core export/erasure operations are **delivered as API endpoints** (`/privacy`, owner/admin gated): org export (Art. 20), subject export (Art. 15), erasure/anonymize (Art. 17). The steps below wrap those endpoints with intake, identity verification, and evidence capture. A **self-service / scheduled** DSAR pipeline (subject-initiated, automated SLA tracking) is still [open](#enterprise-gaps).

**Doc hub:** [`README`](./README.md).

## Roles

| Role | Responsibility |
|------|----------------|
| **Intake owner** (Support / DPO delegate) | Ticket opened, identity verified per org policy, customer communication |
| **Backend / Security** | Run the `/privacy` export/erasure endpoints (or scoped SQL) for the org, capture audit evidence |
| **Product** | Confirm in-app vs full-database scope for the tenant |

## Request types and scope

1. **Access / portability** — `GET /privacy/export` (full org, Art. 20) or `GET /privacy/subject/:contactId/export` (one subject's contact + activities + deals, Art. 15) return structured JSON.
2. **Rectification** — Correct inaccurate profile or CRM records; prefer in-app flows when the subject is an authenticated org user.
3. **Erasure** — `POST /privacy/subject/:contactId/erase` anonymizes the contact's identifying fields in place (name → `Redacted`, email/phone/job_title/notes/linkedin/tags cleared) so linked deals/activities stay referentially intact; written to `audit_log` as `gdpr_erasure`.

All three endpoints are **owner/admin only** and **org-scoped** (`req.user.org`). Remember the AI tables — `ai_conversations`, `ai_messages`, `ai_usage_log` — may hold subject data and are subject to `AI_MESSAGE_RETENTION_DAYS` purge (see [#ai-governance](#ai-governance)); they are not yet included in the automated export and should be handled by a scoped query when in scope.

## Intake checklist

- [ ] Request channel and date logged (ticket ID).
- [ ] Subject identity verified (org admin attestation, email domain match policy, or KYC as required).
- [ ] Request type: access | portability | rectification | erasure.
- [ ] Jurisdiction and deadline noted (e.g. GDPR calendar days where applicable).
- [ ] Legal/commercial hold assessed (active litigation, billing dispute, statutory retention).

## Execution outline (n0crm-api / PostgreSQL)

1. **Authenticate** as an owner/admin of the subject's `organization_id`.
2. **Access / portability** — call `GET /privacy/export` (full org) or `GET /privacy/subject/:contactId/export` (single subject). For data outside the endpoint's scope (e.g. `ai_*` tables), run a scoped, least-privilege SQL query.
3. **Rectification** — apply corrections through normal app APIs where possible (preserves validation and audit). Document before/after row versions in the ticket.
4. **Erasure** — call `POST /privacy/subject/:contactId/erase`. For **auth user removal**, additionally deactivate/delete the `users` row via admin or direct DB access and confirm CRM ownership reassignment policy.
5. **Evidence** — attach the request/response (redacted), execution timestamp, operator, and the `audit_log` `gdpr_erasure` row id. Store evidence in your ticket system; avoid copying full exports into chat logs.

## Post-completion

- [ ] Subject notified per policy template.
- [ ] `audit_log` updated (erasure is auto-logged; record export/rectification actions in the ticket).
- [ ] Step timings captured for future SLAs.

## References

- [#compliance-mapping](#compliance-mapping) (includes [evidence bundle](#compliance-evidence-bundle))
- [#external-hardening-checklist](#external-hardening-checklist) — RLS, tenant isolation, and admin access hygiene
- [#sell-ready-security-evidence-index](#sell-ready-security-evidence-index) — buyer review index
- [#enterprise-gaps](#enterprise-gaps) — what is NOT yet implemented

---


<a id="gitea-operations"></a>
## Gitea production operations

This project is ready to run in Gitea with Actions-compatible workflows and SSH remotes. Gitea is the **authoritative remote**.

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

If you add deployment or third-party integration jobs later, define secrets in Gitea Actions secrets (repo-level or org-level), never in `.env` committed files. Provider keys for the AI feature (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`), the OIDC SSO config (`OIDC_*`), and `TOKEN_ENCRYPTION_KEY`/`JWT_SECRET` belong in the API runtime environment, not in CI or the client bundle.

## Local Git Connectivity (SSH)

Use SSH remote:

```bash
git remote set-url origin git@gitea.apps.privateprompt.tech:clovrlabs/n0crm.git
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
## Enterprise gaps (genuinely open — not implemented)

For honesty in buyer/security conversations: the following are **not** implemented today. Do not claim them as shipped, and do not represent them as certifications. (Identity controls that **are** shipped — OIDC SSO, SCIM 2.0, MFA, server-side RBAC, GDPR export/erasure, security-event log — are documented above, not here.)

| Capability | Status | Notes |
|---|---|---|
| **SAML federation** | Open | OIDC SSO is shipped; SAML 2.0 (for IdPs that require it) is not. |
| **MFA enforcement policy** | Partial | MFA (TOTP) is shipped and per-user opt-in; org-wide *mandatory* enrolment is not yet a policy control. |
| **HA / DR automated failover** | Open | Single Postgres + single Redis; no multi-AZ/replica failover. Automated backups exist (pg_dump 6h / 7-day) and a restore **runbook** exists at [`docs/disaster-recovery.md`](../../docs/disaster-recovery.md), but there is no automated failover, no documented RTO/RPO, and no recorded restore-drill calendar. |
| **Backend SLOs & alerting** | Partial | Prometheus/Grafana + health probes + request-id correlation + optional Sentry exist; **backend error-rate SLOs and automated paging/alerting** are not in place. |
| **Self-service / automated DSAR** | Partial | Export/erasure are delivered as owner/admin API endpoints ([#dsar-playbook](#dsar-playbook)); a subject-initiated self-service flow with automated SLA tracking is not. |
| **Real background job queue** | Open | BullMQ is declared but **unused**; background work (e.g. the sequence runner) runs on a 60s in-process poller. |
| **Field-level security** | Open | RBAC is resource/action-level; per-field redaction/access is not implemented. |
| **Industry pipeline templates / Forecasting v2 / AI v2** | Open | Product roadmap items, not security controls. |
| **Compliance certifications** | None | No SOC 2 / ISO 27001 / HIPAA / GDPR certification. This file is an engineering evidence map, not an audit artifact. |

> See also the project-level roadmap in [`master-roadmap-backlog.md`](./master-roadmap-backlog.md) and the engineering state in [`project-state.md`](./project-state.md).

---


<a id="security-review-pack"></a>
## Security Review Pack

> **Purpose.** A single, self-contained pass for a security reviewer: every control we
> claim, *where it lives in code*, the *evidence* to attach, and an honest read of what's
> open. Work it **top-to-bottom**. It does not replace the detail above — it indexes it.
> Anything marked **Open/Partial** is restated faithfully from [Enterprise gaps](#enterprise-gaps);
> do not represent Partial as Done.

### Document control

- Status: Active · Owner: Security/Backend · Canonical: Yes
- Last updated: 2026-06-14 (initial pack: control inventory + SOC 2 / OWASP ASVS / ISO 27001 Annex A crosswalk + live-evidence slot).
- Scope: live Fastify API (`api/`), React SPA (`frontend/`), the AI feature, and the deploy manifests. **Not** a certification.

### How to use

1. For each control below, open the cited code anchor and confirm the behaviour, then attach the **evidence** (test output, screenshot, SQL/log excerpt, or config line) to your review ticket.
2. Use the [framework crosswalk](#framework-crosswalk) to answer SOC 2 / ISO 27001 / ASVS / vendor-questionnaire items.
3. Treat the [live-evidence snapshot](#live-evidence-snapshot) as the proof behind the "tests / 0-vuln" claims — re-run before sign-off.
4. Read [open gaps](#review-pack-open-gaps) before signing; they are the honest limits of this build.

### A. Control inventory

Status legend: ✅ shipped & code-verified · 🟡 partial (works, with a stated limit) · ⛔ open.

#### A.1 Identity & authentication

| Control | Implementation (code anchor) | Evidence | Status |
|---|---|---|---|
| Password hashing | bcrypt cost 12, constant-time compare | `api/src/routes/auth.ts` | ✅ |
| JWT integrity | HS256 **alg-pinned** (no `alg:none`), `JWT_SECRET` ≥32 enforced at boot | `api/src/config/env.ts`, `api/src/routes/auth.ts` | ✅ |
| Per-token revocation | `jti` denylist in Redis with TTL; checked every request; logout/refresh revoke | `api/src/db/redis.ts` | ✅ |
| Session transport | JWT in **HttpOnly** cookie (XSS-safe), not response body | `api/src/services/cookieAuth.ts` | ✅ |
| MFA (TOTP) | RFC 6238; secret **AES-256-GCM** at rest; login prompt on `mfaRequired` | `api/src/services/totp.ts` (+`totp.test.ts`), migration `019` | ✅ |
| SSO (OIDC) | PKCE S256 + JWKS RS256 verify (iss/aud/exp/nonce) + one-time state + JIT; rejects `email_verified:false` | `api/src/services/oidc.ts` (+`oidc.test.ts`), `api/src/routes/sso.ts` | ✅ |
| Account lockout | 10 fails / 15 min per account → 429; clears on success | `api/src/db/redis.ts` | ✅ |
| Registration policy | `ALLOW_OPEN_REGISTRATION` + `REGISTRATION_ALLOWED_DOMAINS`; first user bootstraps | `api/src/routes/auth.ts`, `env.ts` | ✅ |
| Reset-token safety | SHA-256 at rest, 1h TTL, single-use; forgot-password always 200 (no enumeration) | `api/src/routes/auth.ts` | ✅ |
| Org-wide mandatory MFA | per-user opt-in only | — | 🟡 |
| SAML federation | OIDC only | — | ⛔ |

#### A.2 Authorization & tenant isolation

| Control | Implementation | Evidence | Status |
|---|---|---|---|
| Server-side RBAC | `requirePermission`/`requireCrudPermission`, matrix in `permissions.ts`; 5 roles | `api/src/middleware/rbac.ts` (+`rbac.test.ts`), `api/src/services/permissions.ts` (+`permissions.test.ts`) | ✅ |
| Tenant isolation (authoritative) | every query scoped to JWT `organization_id`; cross-org **FK ownership** checks on writes | `api/src/routes/deals.ts` (`ownedInOrg`) | ✅ |
| RLS (defense-in-depth) | 21 tables + `set_current_org()`; opt-in, not sole control | [ADR 0001](../../docs/adr/0001-tenant-isolation-and-rls.md) | ✅ |
| Identity lifecycle | SCIM 2.0 deprovision = soft-deactivate + session revoke; last-owner protected | `api/src/routes/scim.ts` (+`scim.test.ts`) | ✅ |
| Privileged access | owner/admin gates; impersonation audited (`ended_at` set on exit) | `api/src/routes/admin.ts` | ✅ |
| Field-level security | RBAC is resource/action-level only | — | ⛔ |

#### A.3 Data protection & privacy

| Control | Implementation | Evidence | Status |
|---|---|---|---|
| Field encryption | AES-256-GCM for MFA seeds, OAuth & SMTP tokens (`TOKEN_ENCRYPTION_KEY`) | `api/src/services/tokenCipher.ts` | ✅ |
| GDPR data-subject rights | `/privacy`: org export (Art. 20), subject export (Art. 15), erasure/anonymize (Art. 17), audit-logged | `api/src/routes/dataPrivacy.ts` | ✅ |
| AI data retention | `AI_MESSAGE_RETENTION_DAYS` purge of `ai_*` | `api/src/services/ai/retention.ts` (+`retention.test.ts`) | ✅ |
| Secrets in client bundle | none — SPA holds only `VITE_API_URL`/`VITE_APP_CHANNEL` | `frontend/vite.config.ts`, `frontend/src/lib/api.ts` | ✅ |
| Self-service/automated DSAR | admin-run endpoints only | — | 🟡 |

#### A.4 Application & API surface

| Control | Implementation | Evidence | Status |
|---|---|---|---|
| Input validation | Zod schemas; `postgres.js` tagged templates (parameterized) | `api/src/config/env.ts`, route handlers | ✅ |
| Rate limiting | per-org 500/min + per-IP 20/min auth (Redis); nginx `limit_req` 20r/s | `api/src/index.ts`, [`frontend/nginx.conf.template`](../nginx.conf.template) | ✅ |
| Proxy/IP trust | `TRUST_PROXY` hop-count; rate limits key on resolved `req.ip` (XFF not spoofable) | `api/src/index.ts`, `env.ts` | ✅ |
| API-key scopes | `leads:write`, `scim` enforced; rotation preserves scopes | `api/src/routes/apiKeys.ts`, `publicApi.ts` (+`publicApi.scopes.test.ts`) | ✅ |
| CORS | comma-separated allow-list; `*` rejected in prod | `api/src/index.ts` | ✅ |
| SSRF (webhooks) | resolve + IP-pin + header allow-list before `fetch` | `api/src/services/ssrfGuard.ts`, `webhookSubscriptions.ts` | ✅ |
| SSRF (Slack/AI egress) | fixed host allow-lists re-asserted at send | `api/src/routes/slack.ts` (+`slack.test.ts`), `api/src/services/ai/providers.ts` | ✅ |
| Debug surface | `/_debug/sql` runs in a READ ONLY tx; gated by `DEBUG_TOKEN` | `api/src/routes/debug.ts` | ✅ |
| Metrics surface | `/metrics` gated on raw socket peer + `x-internal-key` | `api/src/index.ts`, `api/src/services/metrics.ts` | ✅ |
| Concurrency safety | sequence runner claims rows `FOR UPDATE SKIP LOCKED` | `api/src/workers/sequenceRunner.ts` | ✅ |
| Security headers (nginx) | X-Frame/nosniff/Referrer/Permissions present; **CSP, HSTS, COOP missing** on the nginx image | [`frontend/nginx.conf.template`](../nginx.conf.template) | 🟡 |

#### A.5 AI governance

| Control | Implementation | Evidence | Status |
|---|---|---|---|
| Per-org kill switch | `settings.ai.enabled=false` short-circuits | `api/src/routes/ai.ts` | ✅ |
| Spend cap | `AI_MONTHLY_TOKEN_CAP` + per-org cap → 429 | `api/src/routes/ai.ts` | ✅ |
| Tool tenant isolation + write gating | tools org-scoped; writes need `allowWrites` + audit row | `api/src/services/ai/tools.ts` (+`tools.test.ts`) | ✅ |
| Step bound | `AI_AGENT_MAX_STEPS` (default 8) | `api/src/services/ai/agent.ts` (+`agent.test.ts`) | ✅ |

#### A.6 Logging, monitoring, supply chain, BC/DR

| Control | Implementation | Evidence | Status |
|---|---|---|---|
| Security-event log | append-only `security_events` (login/MFA/role/impersonation) | `api/src/services/securityEvents.ts`, migration `020` | ✅ |
| Business audit log | org-scoped `audit_log` (incl. AI writes, SCIM, GDPR erasure) | `api/src/routes/audit.ts` | ✅ |
| Correlation/health | `x-request-id`, `captureException`, `/health{,/live,/ready}` | `api/src/services/observability.ts` (+test), `api/src/routes/health.ts` | ✅ |
| Supply chain | `npm audit --audit-level=critical` in CI on both packages | [`.gitea/workflows/ci.yml`](../../.gitea/workflows/ci.yml) | ✅ |
| Backups | API runs scheduled `pg_dump\|gzip` (6h, keep 10) to `/backups` | `api/src/routes/debug.ts`, [DR runbook](../../docs/disaster-recovery.md) | ✅ |
| Off-site backup / measured RTO-RPO / restore-drill calendar | runbook exists; not yet exercised on a schedule | [DR runbook §3,§5](../../docs/disaster-recovery.md) | 🟡 |
| Backend SLOs + automated paging | Prometheus/Grafana/Sentry exist; no SLO alerting | — | 🟡 |
| HA / automated failover | single Postgres + single Redis | — | ⛔ |

<a id="framework-crosswalk"></a>
### B. Framework crosswalk

Pragmatic engineering mapping, **not** a certification. Detail per area: [Compliance mapping](#compliance-mapping), [ASVS (informal)](#sell-ready-security-evidence-index).

#### B.1 SOC 2 (Trust Services Criteria) — *extends the existing [Control Mapping Table](#compliance-mapping)*

| TSC | Covered by (inventory ref) | Status |
|---|---|---|
| CC6.1 Logical access | A.2 RBAC + tenant isolation + RLS | ✅ |
| CC6.1 Authentication | A.1 bcrypt/MFA/OIDC/lockout | ✅ |
| CC6.2/6.3 Provisioning & lifecycle | A.2 SCIM + member lifecycle | ✅ |
| CC6.6 Boundary protection | A.4 rate limits, CORS, SSRF, debug/metrics gating | ✅ |
| CC6.7 Data in transit/at rest | A.3 AES-256-GCM + TLS | ✅ |
| CC7.1/7.2 Monitoring & anomaly | A.6 security_events; **alerting open** | 🟡 |
| CC7.3/7.4 Incident response | runbook + `security_events` | 🟡 |
| CC8.1 Change management | A.6 CI gates; required status checks to enforce | ✅ |
| A1.2 Availability / backup | A.6 backups; **HA/DR failover open** | 🟡 |
| C1/P-series Confidentiality & privacy | A.3 GDPR endpoints + retention | ✅ |

#### B.2 OWASP ASVS L1–L2 (formalized)

| Chapter | Evidence | Status |
|---|---|---|
| V1 Architecture | tenant model + [ADR 0001](../../docs/adr/0001-tenant-isolation-and-rls.md) | ✅ |
| V2 Authentication | A.1 (bcrypt12, MFA, lockout, OIDC, `jti` denylist) | ✅ |
| V3 Session management | HttpOnly cookie JWT, `jti` revocation, sessions-valid-after | ✅ |
| V4 Access control | A.2 (RBAC + org gates + FK ownership) | ✅ |
| V5 Validation/encoding | Zod + parameterized SQL + DOMPurify | ✅ |
| V7 Errors & logging | `security_events` + `audit_log` + `x-request-id` | ✅ |
| V8 Data protection | A.3 (isolation, GDPR, AES-256-GCM) | ✅ |
| V9 Communications | TLS + SSRF allow-lists | ✅ |
| V11 Business logic | rate limits, AI step bound, `SKIP LOCKED` | ✅ |
| V13 API/web service | A.4 (key scopes, rate limits, CORS) | ✅ |
| V14 Configuration | env validation + fail-fast + no client secrets; **CSP/HSTS gap on nginx** | 🟡 |

#### B.3 ISO/IEC 27001:2022 Annex A (net-new)

Technological theme (A.8) plus the directly-relevant organizational controls. Process/people/physical controls (most of A.5–A.7) are **outside application scope** and belong to your ISMS, not this codebase.

| Annex A control | Covered by (inventory ref) | Status |
|---|---|---|
| A.5.15 Access control | A.2 RBAC | ✅ |
| A.5.16 Identity management | A.2 SCIM lifecycle | ✅ |
| A.5.17 Authentication information | A.1 secret storage + MFA | ✅ |
| A.5.18 Access rights | A.2 RBAC + SCIM deprovision | ✅ |
| A.5.30 ICT readiness for BC | A.6 DR runbook (no failover) | 🟡 |
| A.8.2 Privileged access rights | A.2 owner/admin + impersonation audit | ✅ |
| A.8.3 Information access restriction | A.2 org scoping + FK ownership | ✅ |
| A.8.5 Secure authentication | A.1 MFA/OIDC/lockout | ✅ |
| A.8.7 Protection against malware (supply chain) | A.6 `npm audit` in CI | ✅ |
| A.8.9 Configuration management | A.4 env validation + fail-fast | ✅ |
| A.8.12 Data leakage prevention | A.3 isolation + no client secrets | ✅ |
| A.8.13 Information backup | A.6 scheduled `pg_dump` | ✅ |
| A.8.15 Logging | A.6 security_events + audit_log | ✅ |
| A.8.16 Monitoring activities | A.6 Prometheus/Sentry; **alerting open** | 🟡 |
| A.8.23 Web filtering / egress control | A.4 SSRF allow-lists | ✅ |
| A.8.24 Use of cryptography | A.1/A.3 AES-256-GCM + TLS + pinned HS256 | ✅ |
| A.8.25 Secure development lifecycle | A.6 CI gates (tsc/eslint/vitest/audit) | ✅ |
| A.8.26 Application security requirements | B.2 ASVS map | ✅ |
| A.8.28 Secure coding | eslint + parameterized SQL + typed env | ✅ |

<a id="live-evidence-snapshot"></a>
### C. Live-evidence snapshot

Re-run before sign-off and stamp the date + result. Commands: [Quality Gates in the root README](../../README.md#-quality-gates).

| Gate | Package | Command | Result | Date |
|---|---|---|---|---|
| Type-check | api | `npx tsc --noEmit` | ✅ pass (exit 0) | 2026-06-16 |
| Lint | api | `npm run lint` | ✅ pass (0 errors) | 2026-06-16 |
| Unit tests | api | `npx vitest run` | ✅ **105 passed / 16 files** (1.4s) | 2026-06-16 |
| Supply chain | api | `npm audit --audit-level=critical` | ✅ gate passes (0 critical) — ⚠️ **6 at default: 5 high + 1 moderate** (`ws` ← `engine.io`/`socket.io-adapter`) | 2026-06-16 |
| Type-check | frontend | `npx tsc --noEmit` | ✅ pass (exit 0) | 2026-06-16 |
| Lint | frontend | `npm run lint:ci` | ✅ pass (≤200 warns) | 2026-06-16 |
| Unit tests | frontend | `npm run test:run` | ✅ **273 passed, 1 skipped / 44 files** (34s) | 2026-06-16 |
| Supply chain | frontend | `npm audit --audit-level=critical` | ✅ gate passes (0 critical) — ⚠️ **6 at default: 3 high + 2 moderate + 1 low** (`ws` ← `engine.io-client`) | 2026-06-16 |

> **Test counts verified** against the committed figures (API 105/16, frontend 273). **Supply-chain claim is now stale:** the CI gate is `--audit-level=critical` and still passes (0 critical), but a fresh `npm ci` resolves new advisories in the transitive **`ws`** dependency (pulled via Socket.io) — **6 vulnerabilities on each package at the default level**, none critical. The "0 npm vulnerabilities" wording elsewhere in the docs/README predates these advisories. `npm audit fix` is offered on both packages; re-stamp this row and the `0-vuln` claims after applying it.

<a id="review-pack-open-gaps"></a>
### D. Open gaps (consolidated)

Single source of truth is [Enterprise gaps](#enterprise-gaps). Highest-impact for a security sign-off:

1. **HA/DR** — single Postgres + Redis SPOF; no automated failover, no measured RTO/RPO, no scheduled restore drill.
2. **Backend SLOs & alerting** — telemetry exists; no automated paging on lockout spikes / error-rate / AI-spend.
3. **nginx security headers** — production nginx image omits **CSP, HSTS, COOP** (present only in the Vercel `_headers`/`vercel.json` static-host path).
4. **Deploy/architecture drift** — `privateprompt-app.json` ships without PgBouncer / the monitoring stack and (per manifest) without `APP_URL`/`CORS_ORIGIN`; confirm platform injection. *(Infra finding — track in [`project-state.md`](./project-state.md), not a code control.)*
5. **Identity** — SAML and org-wide mandatory MFA not implemented.
6. **DSAR** — admin-run only; no subject self-service.
7. **Certifications** — none held; this pack is an engineering evidence map.

---

*Last updated: **2026-06-14** — added the [Security Review Pack](#security-review-pack) (control inventory + SOC 2 / OWASP ASVS / ISO 27001 Annex A crosswalk + live-evidence slot) and folded in the 2026-06-14 audit-wave items. Prior: **2026-06-11** — Enterprise identity shipped and marked delivered: OIDC SSO (PKCE + JWKS RS256), SCIM 2.0, MFA (TOTP), server-side RBAC, GDPR export/erasure, and the `security_events` audit log — each verified against `api/src`. Genuinely-open gaps kept honest: SAML, HA/DR automated failover, backend SLOs/alerting, real job queue (BullMQ unused), field-level security, and formal certifications.*
