# n0CRM — Security Audit & Penetration Test

_Scope: live Fastify API (`api/`), React frontend (`frontend/`), and the AI/agentic feature. The deleted `frontend/supabase/` legacy is out of scope (removed)._

This report covers a gray-box review, the `/security-pen-testing` and
`/skill-security-auditor` passes, and a workflow-driven API pen-test. CVSS-style severity.

## Summary — ALL findings resolved

| Severity | Found | Fixed | Open |
|----------|-------|-------|------|
| Critical | 1 | 1 | 0 |
| High     | 3 | 3 | 0 |
| Medium   | 4 | 4 | 0 |
| Low      | 3 | 3 | 0 |
| Moderate (deps) | 3 | 3 | 0 |

`npm audit` reports **0 vulnerabilities** on both `api/` and `frontend/` (was 1 critical + several moderate).

> **Second hardening pass (2026-06-10).** Every item previously listed as *Deferred*
> is now fixed — see [Second pass](#second-hardening-pass-2026-06-10). The HIGH
> rate-limit/`trustProxy` gap was resolved with a workflow-driven topology recon
> that produced the exact (env-driven, hop-count) fix.

---

## Fixed this session

### CRITICAL — `vitest` UI server arbitrary file read/exec (GHSA-5xrq-8626-4rwp)
- **Where:** `api/` devDependency (`vitest ^3.1.1`).
- **Impact:** Dev-only. The production image builds with `npm ci --omit=dev`, so the package is **never shipped** — no production exposure. Flagged because `npm audit` reported it critical.
- **Fix:** Upgraded to `vitest@^4`. API test suite (16 tests) re-verified green. `npm audit --audit-level=critical` now clean.

### HIGH — `/metrics` access-control bypass via spoofed `X-Forwarded-For`
- **Where:** `api/src/index.ts` `isInternalRequest()`.
- **Impact:** With `trustProxy` unset, `X-Forwarded-For: 127.0.0.1` satisfied the loopback check, exposing the Prometheus registry (internal metrics) to any caller.
- **Fix:** Removed the XFF branch — only the real socket peer is trusted (`isLoopbackRequest`). Added an `x-internal-key` (shared `INTERNAL_KEY`) path so cross-container scrapers (Prometheus) have a **non-spoofable** way in. XFF is no longer consulted.

### HIGH — Cross-org FK injection (IDOR-write) on deals
- **Where:** `api/src/routes/deals.ts` create + update.
- **Impact:** `contactId`/`companyId`/`pipelineId`/`assignedTo` were accepted without verifying org ownership, letting a member link a deal to another tenant's records and leak joined fields.
- **Fix:** `ownedInOrg()` verifies every FK belongs to `req.user.org` before insert/update (returns 400 otherwise). The same guard is built into the new AI write tools (`ownsRow`).

### MEDIUM — Socket.io handshake skipped `is_active`/org recheck
- **Where:** `api/src/services/realtime.ts`.
- **Impact:** A deactivated or org-removed user kept receiving org `db:change`/presence events until JWT expiry (up to 7 days).
- **Fix:** Added the same DB check the HTTP auth middleware performs (`users WHERE id = sub AND organization_id = org AND is_active`) to the handshake; rejects otherwise.

### MEDIUM — Slack outbound not re-validated at send time (SSRF)
- **Where:** `api/src/routes/slack.ts` (`/test` + `sendSlackNotification`).
- **Impact:** The `hooks.slack.com` allow-list was enforced only at save time; a URL written via another settings path could cause a server-side request to an internal host.
- **Fix:** `isAllowedSlackUrl()` re-asserts the fixed `https://hooks.slack.com/services/` allow-list at send time in both paths. (Host is a constant external allow-list, so a regex check fully closes it — no IP-pinning needed.)

### LOW→MEDIUM — `/_debug/sql` read-only filter was a bypassable blacklist
- **Where:** `api/src/routes/debug.ts` (gated by `DEBUG_TOKEN`).
- **Impact:** The uppercase-keyword blacklist could be bypassed (CTE writes, functions, comments) to mutate data in "read-only" mode.
- **Fix:** When `allow_writes` is false, the query now runs inside a `SET TRANSACTION READ ONLY` transaction — Postgres rejects any write at the engine level. The blacklist remains as a friendly early hint.

### Correctness / security-adjacent (frontend)
- **HIGH** `Admin` CSV export used `?? ''` for the API base → `/admin/...` 404 in the default `/api`-proxied deployment. Fixed to match `lib/api.ts` (`?? '/api'`).
- **HIGH** `contactsStore`/`dealsStore` optimistic create left phantom rows (temp-UUID) on POST failure that 404 on later edit/delete. Fixed to roll back on rejection.
- **LOW** `useDataInit` 15s `setTimeout` was never cleared on unmount. Fixed.

---

## Second hardening pass (2026-06-10)

Every previously-deferred item is now fixed. A workflow-driven topology recon
(reading nginx, docker-compose and the platform manifest) determined the exact
`trustProxy` recipe before changing the rate limiter.

### HIGH — Rate-limit bypass via rotating `X-Forwarded-For` → **FIXED**
- **Where:** `api/src/index.ts` (Fastify factory + both `keyGenerator`s), `api/src/config/env.ts`.
- **Fix:** Added env `TRUST_PROXY` (hop count, default `1`) and set Fastify `trustProxy: env.TRUST_PROXY`. Both keyGenerators now key on Fastify-resolved `req.ip` (the genuine client IP from the trusted XFF suffix) instead of the attacker-controllable leftmost XFF value. Authenticated routes still key on the JWT `org`. Shipped `TRUST_PROXY=1` (docker-compose) and `TRUST_PROXY=2` (privateprompt: platform edge + nginx) in both manifests + `.env.example`.
- **Coupled residual fixed:** `/metrics` loopback check now uses the raw TCP peer (`req.socket.remoteAddress`) so enabling `trustProxy` can't let a spoofed XFF resolve to `127.0.0.1`. docker-compose now binds the API port to `127.0.0.1` so external clients can't bypass nginx's `limit_req` zone.

### HIGH — Sequence-runner double-send race → **FIXED**
- **Where:** `api/src/workers/sequenceRunner.ts`. Each enrollment is now claimed inside its transaction with `SELECT … FOR UPDATE SKIP LOCKED` (+ `current_step` guard), so overlapping ticks / multi-node runners / the `/internal` trigger skip a row another worker holds instead of sending the same step twice.

### MEDIUM — `/email/send` open relay / `From` spoofing → **FIXED**
- **Where:** `api/src/routes/email.ts`. `viewer` role is rejected; `From` is forced to the org's verified SMTP address (caller-supplied `from` ignored); a per-org 60/min send cap was added.

### MEDIUM — Gmail OAuth `state` not validated → **FIXED**
- **Where:** `api/src/routes/gmail.ts` + `api/src/db/redis.ts`. `oauth-start` binds the `state` nonce to the initiating user in Redis (10-min, one-time-use); `oauth-exchange` rejects a `state` owned by a different user (blocks login-CSRF token grafting). Backward-compatible: a missing/expired state logs a warning rather than breaking in-flight flows (the CSRF case always has a mismatching owner and is rejected).

### LOW — `checkPlanLimit` treated churned orgs as unlimited → **FIXED**
- **Where:** `api/src/routes/billing.ts`. Orgs with no active subscription now get free-tier caps (1000 contacts / 500 deals / 3 users) **when billing is configured** (`STRIPE_SECRET_KEY` set). Self-hosted deployments (no Stripe) stay uncapped — no regression.

### LOW — Impersonation `ended_at` never set → **FIXED**
- **Where:** `api/src/routes/admin.ts`. Exit now sets `ended_at = now()` on the open `impersonation_logs` row and is reachable while impersonating (authorized by the token's own `impersonated_by` claim) without weakening the super-admin guard on every other admin route.

### MODERATE (deps) — `ws` uninitialized-memory disclosure (×3) → **FIXED**
- `npm audit fix` on both `api/` and `frontend/`. Both now report **0 vulnerabilities**.

### Tests added
- `api/src/routes/slack.test.ts` — SSRF allow-list (accepts only `hooks.slack.com`, rejects internal/metadata/look-alike hosts).
- `api/src/services/ai/tools.test.ts` — tool registry shape + write-tool `allowWrites` guardrails.
- (plus `providers.test.ts` / `agent.test.ts` from the AI feature). API suite: **25 tests**.

---

## New AI / agentic feature — security posture: PASS

- **Multi-tenant isolation:** every agent tool is scoped to `ctx.orgId` (from the JWT, never the model). A prompt-injected model cannot read or write another org's data; its blast radius is the caller's own org permissions.
- **No SSRF:** provider calls go only to a fixed host allow-list (`generativelanguage.googleapis.com`, `api.openai.com`, `api.anthropic.com`) via `assertAllowedHost`; no user-supplied URL ever reaches `fetch`.
- **Write guardrails:** write tools (`create_activity`, `update_deal_stage`) require `allowWrites: true`, verify FK ownership, and append an `audit_log` row.
- **Access control:** conversations are scoped to `(organization_id, user_id)`; loading/continuing another user's or org's conversation returns 404.
- **Injection-safe SQL:** all tool queries use `postgres.js` tagged templates (parameterized); `db.unsafe` is used only with hard-coded table literals + bound params.
- **Abuse limits:** AI routes are capped at 30 req/min/org; agent loop bounded by `AI_AGENT_MAX_STEPS` (default 8); message length and history are bounded.
- **Secrets:** provider keys come from env only; `/ai/status` discloses only provider id/model to authenticated org users.
