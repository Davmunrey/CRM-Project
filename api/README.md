# api/

Fastify REST API for n0CRM — self-hosted B2B CRM backend. This is the `api/` subdirectory of the **n0CRM monorepo** (see parent [`../README.md`](../README.md) for monorepo structure).

| Layer | Tech |
|-------|------|
| Runtime | Node.js 22, TypeScript |
| Framework | Fastify 5 (`trustProxy` = `TRUST_PROXY` hops) |
| Database | PostgreSQL 16 via `postgres.js` (camelCase transform), through PgBouncer in production |
| Auth | HS256 JWT — `{ sub, org, role, jti }` claims; HttpOnly `auth_token` cookie; per-user/per-token Redis denylist |
| Queues | Redis (ioredis); BullMQ is a declared dependency but the live sequence runner is a polling worker, not a BullMQ queue |
| Realtime | Socket.io — org-scoped rooms, JWT-verified handshake (re-checks `is_active` + org) |
| Validation | Zod on every route + on env (`config/env.ts`) |
| Encryption | AES-256-GCM for OAuth tokens, SMTP passwords, webhook/Slack/Zoom secrets |
| AI | Multi-provider (Google Gemini free default / OpenAI / Anthropic) — `services/ai/*`, routes under `/ai` |
| Identity | MFA (TOTP, RFC 6238), OIDC SSO (PKCE + JWKS RS256, JIT provisioning), SCIM 2.0 user provisioning |
| Quality gates | ESLint flat config + `tsc --noEmit` + Vitest (85 tests across 12 files) + `npm audit`, enforced by the `api` CI job |

---

## Local Dev Setup

Requires: **Node 22+**, **PostgreSQL 16**, **Redis**.

```bash
# Install and start Postgres + Redis (macOS with Homebrew)
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis

# Create DB and user
psql postgres -c "CREATE USER n0crm WITH PASSWORD 'n0crm_dev_pass';"
psql postgres -c "CREATE DATABASE n0crm OWNER n0crm;"

cd api
cp .env.example .env          # copy and fill in secrets
# JWT_SECRET:           openssl rand -hex 32
# TOKEN_ENCRYPTION_KEY: openssl rand -hex 32

npm install
npm run db:migrate   # apply all SQL migrations
npm run db:seed      # default org + admin user

npm run dev          # http://localhost:3001
```

Default credentials after seed:
```
Email:    admin@n0crm.local
Password: Admin1234!
```

### With Docker (Postgres + Redis only)

```bash
cd ..
docker-compose up postgres redis -d
```

### Full Docker Stack

Runs Postgres, Redis, API, and nginx (serving frontend) together. Migrations run automatically via `docker-entrypoint.sh`.

```bash
# From repo root
cp api/.env.example api/.env   # configure JWT_SECRET, TOKEN_ENCRYPTION_KEY, etc.
docker-compose up -d

# Frontend: http://localhost  (nginx proxies /api/* → API)
# API: http://localhost:3001
# Postgres: port 5432 (internal only)
# Redis: port 6379 (internal only)
```

See the root [`docker-compose.yml`](../docker-compose.yml) and [`privateprompt-app.json`](../privateprompt-app.json) for full-stack deployment.

---

## Google OAuth / Gmail / Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/projectcreate) and create a project.
2. Enable **Gmail API** and **Google Calendar API** in *APIs & Services → Library*.
3. Create an **OAuth 2.0 Client ID** under *APIs & Services → Credentials → Web application*.
4. Add the redirect URI: `http://localhost:5173/auth/gmail/callback`
5. Copy the credentials to `.env`:
   ```env
   GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=<your-client-secret>
   GOOGLE_REDIRECT_URI=http://localhost:5173/auth/gmail/callback
   ```
6. Restart the API.

For Google Calendar push webhooks (production only), set:
```env
GOOGLE_CALENDAR_WEBHOOK_URL=https://your-domain.com/api
```

---

## API Routes

All routes require `Authorization: Bearer <token>` unless marked `—`.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | — | Email + password → JWT. When the account has MFA enabled, a valid `totp` code must also be sent; otherwise returns `401 { error, mfaRequired: true }`. |
| POST | `/auth/register` | — | Create account (org: null) |
| GET | `/auth/me` | ✓ | Restore session (includes `mfaEnabled`) |
| PATCH | `/auth/me` | ✓ | Update profile (name, jobTitle, phone, avatarUrl) |
| POST | `/auth/refresh` | ✓ | Rotate JWT — old jti revoked in Redis denylist |
| PATCH | `/auth/password` | ✓ | Change password (requires current password) |
| POST | `/auth/mfa/setup` | ✓ | Generate a TOTP secret + `otpauthUrl` (encrypted, not yet enabled). 503 if `TOKEN_ENCRYPTION_KEY` unset. |
| POST | `/auth/mfa/enable` | ✓ | Confirm a 6-digit code → turn MFA on |
| POST | `/auth/mfa/disable` | ✓ | Re-auth with current password → turn MFA off + clear the secret |
| POST | `/auth/admin/reset-password` | ✓ owner/admin | Set another org member's password |
| POST | `/auth/forgot-password` | — | Send password reset email (always 200) |
| POST | `/auth/reset-password` | — | Verify token + update password |
| POST | `/auth/logout` | ✓ | Revoke JWT + clear session |
| GET | `/auth/resolve-org/:slug` | — | Resolve org slug → org metadata |

TOTP secrets are stored AES-256-GCM encrypted (`mfa_secret_cipher`); `mfa_enabled` is only set true after a code is verified. Security-relevant auth events (login success/failure, MFA required/failed, enable/disable) are written to the `security_events` log.

### SSO (OIDC)

Provider-agnostic single sign-on (Entra / Okta / Auth0 / any OIDC IdP). Enabled only when `OIDC_ISSUER` + `OIDC_CLIENT_ID` + `OIDC_CLIENT_SECRET` are configured; otherwise the routes report disabled / 503. The ID token is verified by JWKS RS256 signature + `iss`/`aud`/`exp`/`nonce` before any account is touched, with PKCE (S256) on the authorize flow. The frontend SSO button is gated by `GET /auth/sso/status`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/sso/status` | — | `{ enabled, issuer }` — drives the UI's SSO button |
| GET | `/auth/sso/start` | — | 302 to the IdP authorize URL (state + nonce + PKCE verifier stored in Redis) |
| GET | `/auth/sso/callback` | — | Verify state + ID token, JIT-provision the user (role `OIDC_DEFAULT_ROLE`), set the auth cookie, redirect into the app |

### Core CRM

| Resource | Base path | Notes |
|----------|-----------|-------|
| Contacts | `/contacts` | `GET ?search=&type=&limit=&offset=` — count includes search filter |
| Companies | `/companies` | `GET ?search=&industry=&status=` |
| Deals | `/deals` | `GET ?pipelineId=`. Stage auto-resolves from pipeline on create. |
| Activities | `/activities` | CRUD |
| Notifications | `/notifications` | `POST /mark-all-read`, `DELETE /` (clear all for user) |
| Updates | `/updates` | Threaded item Updates + @mentions — `GET /?entityType=&entityId=`, `POST /` (update or reply; parses `@[Name](uuid)` → mention notifications), `DELETE /:id` (soft-delete; author or owner/admin/manager) |
| Audit Log | `/audit` | GET + POST — read requires admin/owner/manager role |

### Sales

| Resource | Base path |
|----------|-----------|
| Goals | `/goals` — `PATCH /:id` to update `current` progress |
| Products | `/products` — CRUD with `GET /:id` |
| Leads | `/leads` — CRUD + `/:id/events` + `/:id/score-snapshots` + `/scoring-rules` |
| Email Templates | `/templates` — CRUD + `/:id/increment-usage` + `/quick-replies` |

### Automation

| Resource | Base path |
|----------|-----------|
| Automation Rules | `/automations` — CRUD + `/executions` |
| Sequences | `/sequences` — CRUD + `/enrollments` |
| Custom Fields | `/custom-fields` — `/values` (upsert) + `/i18n` (translations) |

### Pipelines

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pipelines` | ✓ | List accessible pipelines (auto-creates default if none exist) |
| POST | `/pipelines` | ✓ admin/manager | Create pipeline |
| GET | `/pipelines/:id` | ✓ | Get pipeline stages |
| PATCH | `/pipelines/:id` | ✓ admin/manager | Update name, stages, access |
| DELETE | `/pipelines/:id` | ✓ admin/manager | Archive pipeline (soft delete) |
| POST | `/pipelines/:id/members` | ✓ admin/manager | Add member |
| DELETE | `/pipelines/:id/members/:userId` | ✓ admin/manager | Remove member |

### Org & Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/orgs` | ✓ | Create org → reissues JWT with org claim |
| GET | `/orgs/me` | ✓ | Current org details |
| GET | `/orgs/me/members` | ✓ | All org members |
| POST | `/orgs/me/invite` | ✓ | Invite by email + role (sends email) |
| PATCH | `/orgs/me/members/:userId/role` | ✓ `members:manage` | Change a member's role. Only an owner may grant `owner`; the last active owner cannot be demoted; the member's sessions re-mint so the new role applies immediately. |
| PATCH | `/orgs/me/members/:userId/status` | ✓ `members:manage` | Activate/deactivate a member (`{ isActive }`). Cannot deactivate yourself or the last active owner; deactivation revokes the member's sessions. |

Member-management routes are guarded by `requirePermission('members:manage')` (see [Server-side RBAC](#server-side-rbac)).

### Invitations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/invitations` | ✓ | List org invitations |
| POST | `/invitations` | ✓ admin/manager | Create and send invitation |
| DELETE | `/invitations/:id` | ✓ | Cancel invitation |
| GET | `/invitations/:token` | — | Fetch invitation details (for accept page) |
| POST | `/invitations/:token/accept` | ✓ | Accept → assigns org + role, returns new JWT |

### Gmail Integration

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/gmail/oauth-configured` | — | Check if `GOOGLE_CLIENT_ID` + `SECRET` are set |
| GET | `/gmail/integration-status` | ✓ | Connection status + account + scopes |
| POST | `/gmail/oauth-start` | ✓ | Start OAuth PKCE flow. Body: `{ redirect_uri, bundle: 'primary'|'calendar' }` |
| POST | `/gmail/oauth-exchange` | ✓ | Exchange code → stores encrypted refresh token |
| POST | `/gmail/refresh` | ✓ | Refresh access token |
| POST | `/gmail/disconnect` | ✓ | Remove stored tokens |
| GET | `/gmail/threads` | ✓ | List Gmail threads |
| GET | `/gmail/threads/:threadId` | ✓ | Fetch thread messages |
| POST | `/gmail/send` | ✓ | Send email via Gmail API |
| GET | `/gmail/labels` | ✓ | List Gmail labels |
| GET | `/gmail/attachments/:messageId/:attachmentId` | ✓ | Download attachment |

### Google Calendar

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/calendar` | ✓ | List synced events (`?from=&to=&calendarId=`) |
| POST | `/calendar/sync` | ✓ | Pull events from Google Calendar into DB |
| GET | `/calendar/list` | ✓ | List user's Google Calendars |
| POST | `/calendar` | ✓ | Create event in Google Calendar (and sync to DB) |
| PATCH | `/calendar/:id` | ✓ | Update event in Google Calendar |
| DELETE | `/calendar/:id` | ✓ | Delete event from Google Calendar |
| POST | `/calendar/watch` | ✓ | Register push notification channel |
| DELETE | `/calendar/watch` | ✓ | Stop push notification channel |
| POST | `/calendar/webhook` | — | Google push notification receiver (ACKs immediately, syncs async) |

### SMTP

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/smtp` | ✓ | Load org SMTP config (password not returned) |
| POST | `/smtp` | ✓ | Upsert SMTP settings (password encrypted AES-256-GCM) |
| POST | `/smtp/test` | ✓ | Send test email via saved or inline config |
| DELETE | `/smtp` | ✓ | Remove org SMTP config |

### Email Tracking

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/email-tracking/messages` | ✓ | Register tracked email, returns `open_url` (1×1 pixel) |
| POST | `/email-tracking/links` | ✓ | Register tracked links (batch) |
| GET | `/email-tracking/open` | — | Serves 1×1 GIF + records open event |
| GET | `/email-tracking/click/:token` | — | Records click + redirects to target URL |
| GET | `/email-tracking/stats` | ✓ | Aggregate opens + clicks (`?from=&to=`) |

### Inbound Webhooks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhooks/inbound/:orgSlug` | — | HMAC-SHA256 verified inbound payload |
| GET | `/webhooks` | ✓ | List registered webhook endpoints |
| POST | `/webhooks` | ✓ | Register webhook endpoint |

### Outbound Webhook Subscriptions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/webhook-subscriptions` | ✓ | List subscriptions |
| POST | `/webhook-subscriptions` | ✓ | Create (HTTPS only). Returns signing secret once. |
| PATCH | `/webhook-subscriptions/:id` | ✓ | Update name, enabled, filters, headers |
| DELETE | `/webhook-subscriptions/:id` | ✓ | Delete |
| POST | `/webhook-subscriptions/:id/test` | ✓ | Send test payload with HMAC-SHA256 signature |
| POST | `/webhook-subscriptions/:id/rotate-secret` | ✓ | Rotate signing secret |

### API Keys & Lead Capture

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/integrations/api-keys` | ✓ | List org API keys (incl. their `scopes`) |
| POST | `/integrations/api-keys` | ✓ | Create with optional `scopes` (raw value returned once, prefix `n0crm_`, stored as SHA-256) |
| POST | `/integrations/api-keys/:id/rotate` | ✓ | Revoke + reissue |
| DELETE | `/integrations/api-keys/:id` | ✓ | Revoke |

**API-key scopes.** Keys are minted in **Settings → Integrations** with an optional scope allow-list (currently `leads:write` for the public lead API and `scim` for SCIM provisioning). The raw key (prefix `n0crm_`) is shown once and stored only as a SHA-256 hash. Scope enforcement is back-compat: a key with **no** scopes declared is treated as full access (legacy behavior); once a key declares explicit scopes it is restricted to them (`*`/`all` also grant everything). A request lacking the required scope returns `403 { error: "Insufficient API key scope", required: "<scope>" }`.
| GET | `/integrations/lead-capture-tokens` | ✓ | List capture tokens |
| POST | `/integrations/lead-capture-tokens` | ✓ | Create |
| DELETE | `/integrations/lead-capture-tokens/:id` | ✓ | Delete |

### Public API (API key auth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/public/v1/leads` | `x-api-key` (scope `leads:write`) | Create lead from external form (upserts by email). Requires the `leads:write` scope; otherwise `403 { error: "Insufficient API key scope", required: "leads:write" }`. |

### Slack Integration

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/slack` | ✓ | Get Slack configuration status |
| POST | `/slack` | ✓ | Configure Slack incoming webhook URL |
| POST | `/slack/test` | ✓ | Send a test message to Slack |
| DELETE | `/slack` | ✓ | Remove Slack integration |

### Google Contacts Sync

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/gmail/sync-contacts` | ✓ | Import Google People API contacts into CRM (requires `contacts` OAuth scope). Returns `{ imported, skipped, total }`. |

To enable, user must re-authorize with the `contacts` OAuth bundle:
```
POST /gmail/oauth-start  { "bundle": "contacts", "redirect_uri": "..." }
```

### Zoom Meetings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/zoom` | ✓ | Get Zoom configuration status |
| POST | `/zoom` | ✓ | Save Zoom webhook secret (encrypted AES-256-GCM) |
| DELETE | `/zoom` | ✓ | Remove Zoom configuration |
| POST | `/zoom/webhook/:orgId` | — | Receive Zoom events. Validates HMAC-SHA256 signature. Handles `endpoint.url_validation` challenge. Creates CRM activity on `meeting.ended`. |

Set the Zoom event notification URL to `{API_BASE}/zoom/webhook/{orgId}` in your Zoom app dashboard (Feature → Event Subscriptions). Enable the `meeting.ended` event.

### LinkedIn Enrichment

Contacts have an optional `linkedinUrl` field (added in migration 012).

```bash
# Store LinkedIn URL on create
curl -s -X POST http://localhost:3001/contacts \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"email":"jane@acme.com","firstName":"Jane","lastName":"Doe","linkedinUrl":"https://linkedin.com/in/janedoe"}'

# Add LinkedIn URL to existing contact
curl -s -X PATCH http://localhost:3001/contacts/<id> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"linkedinUrl": "https://linkedin.com/in/janedoe"}'
```

The field is returned as `linkedin_url` in all `GET /contacts` and `GET /contacts/:id` responses.

### UX Metrics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ux-metrics/ingest` | ✓ | Batch ingest telemetry events (max 500, fire-and-forget) |

### Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/analytics/summary` | ✓ | Org KPI summary |
| GET | `/analytics/deals-by-stage` | ✓ | Pipeline breakdown |
| GET | `/analytics/revenue-by-month` | ✓ | Monthly revenue series |
| GET | `/analytics/activities-by-type` | ✓ | Activity-type breakdown |
| GET | `/analytics/contacts-by-source` | ✓ | Contact-source breakdown |
| GET | `/analytics/sales-reps` | ✓ | Per-rep performance |
| GET | `/analytics/forecast` | ✓ | Weighted forecast |

### Saved Views, Email Inbox, Lists & Preferences

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST/PATCH/DELETE | `/views` | ✓ | Saved filter/view CRUD (server-synced) |
| GET/POST/PATCH/DELETE | `/email/inbox` | ✓ | Email inbox store; `POST /email/send` sends (60/min) |
| GET/POST/PATCH/DELETE | `/distribution-lists` | ✓ | Distribution-list CRUD |
| GET | `/preferences/me` | ✓ | User prefs; `PATCH /preferences/me/navigation`, `PATCH /preferences/me/onboarding` |

### Billing (Stripe — when configured)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/billing/subscription` | ✓ | Current subscription/plan |
| POST | `/billing/checkout` | ✓ | Create a Stripe Checkout session |
| POST | `/billing/portal` | ✓ | Create a Stripe billing-portal session |
| POST | `/webhooks/stripe` | — | Stripe webhook (signature-verified via `STRIPE_WEBHOOK_SECRET`) |

### Super-Admin (`/admin`)

Platform-operator routes (super-admin role). Includes org stats/list/detail/update, suspend/unsuspend, subscription management, plans CRUD, user list/update, CSV exports, impersonation (`POST /admin/orgs/:id/impersonate`, `POST /admin/impersonate/exit` — sets `ended_at`), and `GET /admin/impersonation-logs`.

### SCIM 2.0 (`/scim/v2`)

System-for-Cross-domain-Identity-Management provisioning (RFC 7643/7644) so an IdP (Entra / Okta / OneLogin…) can provision and deprovision members. Auth is a **Bearer API key scoped `scim`** (created via `POST /integrations/api-keys` with `scopes: ["scim"]`); the key maps to the target organization. Bodies use `application/scim+json`. Deprovision is a **soft deactivate** + immediate session revocation — never a hard delete — and the **last active owner** can never be deactivated/deleted. Provision/deprovision are recorded in `audit_log`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/scim/v2/ServiceProviderConfig` | Bearer (scope `scim`) | Discovery: declares `patch`, `filter`, bearer auth scheme |
| GET | `/scim/v2/Users` | Bearer (scope `scim`) | List/search org users (`?filter=userName eq "x@y.com"`) |
| GET | `/scim/v2/Users/:id` | Bearer (scope `scim`) | Fetch one user |
| POST | `/scim/v2/Users` | Bearer (scope `scim`) | Provision a user (201; 409 if the email already exists) |
| PATCH | `/scim/v2/Users/:id` | Bearer (scope `scim`) | Patch the `active` attribute (deprovision/reactivate) |
| PUT | `/scim/v2/Users/:id` | Bearer (scope `scim`) | Replace `active` + name |
| DELETE | `/scim/v2/Users/:id` | Bearer (scope `scim`) | Deprovision → deactivate (204) |

### GDPR / Data-Subject Rights (`/privacy`)

Org-scoped, **owner/admin only** (403 otherwise). Erasure anonymizes the contact's identifying fields in place (keeping the row so linked deals/activities stay referentially intact) and is recorded in `audit_log` as `gdpr_erasure`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/privacy/export` | ✓ owner/admin | Art. 20 — full org data export (contacts, companies, deals, activities, leads) as a downloadable JSON |
| GET | `/privacy/subject/:contactId/export` | ✓ owner/admin | Art. 15 — one subject's data (contact + their activities + deals) |
| POST | `/privacy/subject/:contactId/erase` | ✓ owner/admin | Art. 17 — erase/anonymize a subject's PII |

### Server-side RBAC

Authorization is enforced server-side via a permission matrix (`services/permissions.ts`) so it no longer depends on the frontend. Two preHandler factories in `middleware/rbac.ts` guard routes:

- `requirePermission('<permission>')` — gate a single route on a named permission (e.g. `members:manage`).
- `requireCrudPermission('<resource>')` — derive the permission from the HTTP method (`GET/HEAD → read`, `DELETE → delete`, else `write`), registered once per CRUD resource plugin so readers stay read-only while writes/deletes require the matching permission.

Roles are **owner / admin / manager / sales_rep / viewer**. CRUD permission guards are wired across the core CRM resources (contacts, companies, deals, activities, leads), member management, API keys, and webhook subscriptions. A caller whose role lacks the permission gets `403 { error: "Insufficient permissions" }`.

### Security-Event Audit Log

Append-only authentication/account-security log (`security_events` table, migration 020) recorded by `recordSecurityEvent()` — fire-and-forget, so a logging failure never breaks the request it describes. Distinct from the org-scoped `audit_log`: security events can have **no** org/actor (e.g. a failed login for an unknown email), so those columns are nullable. Event types include `login_success`, `login_failed`, `login_mfa_required`, `login_mfa_failed`, `logout`, `register`, `password_changed`, `password_reset_requested`, `password_reset_completed`, `mfa_enabled`, `mfa_disabled`, `impersonation_started`, and `impersonation_ended`; each row captures client IP + user-agent.

### AI / Agentic Assistant

Multi-provider AI (Google **Gemini** — free default, **OpenAI**, **Anthropic**). All routes are JWT-authenticated, org-scoped, and rate-limited to **30 req/min per org** (the global default is 500/min) because provider calls cost tokens. When no provider key is set, action routes return **503** and `GET /ai/status` reports `enabled: false` so the UI hides AI. See the [AI Provider Abstraction](#ai-provider-abstraction--agent) section below.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/ai/status` | ✓ | Feature flags: `{ enabled, providers, defaultProvider, activeProvider, model, maxSteps }`. `enabled` is false when no key is set **or** the org kill switch is off. |
| POST | `/ai/summarize` | ✓ | Summarize a thread. Body: `{ messages: string[] (1–100) }` → `{ text, provider }` |
| POST | `/ai/draft-reply` | ✓ | Draft a reply. Body: `{ thread, instructions? }` → `{ text, provider }` |
| POST | `/ai/next-best-action` | ✓ | Recommend the next action. Body: `{ contactId?, dealId? }` (at least one). Server fetches the contact/deal + latest activity for context. → `{ text, provider }` |
| POST | `/ai/search` | ✓ | AI re-ranks an org-scoped candidate pool (newest 60). Body: `{ query, scope: 'contacts'\|'deals', limit≤20 }` → `{ results, provider }` |
| POST | `/ai/agent` | ✓ | Tool-using agent. Body: `{ message, conversationId?, allowWrites? }` → `{ conversationId, reply, steps, stoppedReason, provider }`. Creates the conversation if `conversationId` is omitted; loads up to 40 prior turns for context. |
| GET | `/ai/conversations` | ✓ | List the caller's conversations (latest 50, `{ id, title, created_at, updated_at }`) |
| GET | `/ai/conversations/:id` | ✓ | Fetch one conversation + its messages (incl. tool `steps`) |

All AI write tools and conversations are scoped to `req.user.org`; output-token usage is recorded best-effort in `ai_usage_log` for cost/limit visibility.

---

## AI Provider Abstraction & Agent

The AI feature lives in `src/services/ai/` and is wired by `src/routes/ai.ts`.

### Provider abstraction (`services/ai/providers.ts`)

One normalized `AiMessage` / `AiToolDef` format is translated to each vendor's wire protocol by a small `AiProvider` interface (`chat(messages, opts)`). Three providers implement it:

| Provider | id | Default model (override env) | Key env |
|----------|-----|------------------------------|---------|
| Google Gemini (free) | `gemini` | `gemini-2.0-flash` (`AI_GEMINI_MODEL`) | `GEMINI_API_KEY` |
| OpenAI | `openai` | `gpt-4o-mini` (`AI_OPENAI_MODEL`) | `OPENAI_API_KEY` |
| Anthropic | `anthropic` | `claude-sonnet-4-6` (`AI_ANTHROPIC_MODEL`) | `ANTHROPIC_API_KEY` |

- `availableProviders()` returns the configured providers in preference order (the `AI_DEFAULT_PROVIDER` is sorted first); `resolveProvider(preferred?)` honors an org override, then the env default, then any configured provider.
- Outbound `fetch` is restricted to a hard-coded host allow-list (`generativelanguage.googleapis.com`, `api.openai.com`, `api.anthropic.com`) with a 30s timeout — no user-supplied URL ever reaches the network layer.
- Errors surface as `AiError` with an appropriate status (502 for provider/network failures, 400 for 4xx vendor errors).

### Tool-using agent (`services/ai/agent.ts` + `tools.ts`)

`runAgent()` is a provider- and tool-agnostic loop: it calls the model, executes any requested tool calls, feeds the results back, and repeats until the model returns a final answer or `maxSteps` (env `AI_AGENT_MAX_STEPS`, default 8, max 20) is hit. On `max_steps` it asks the model for a best-effort final answer with tools disabled. Each executed tool call is recorded in `steps` for UI transparency and persisted on the assistant message.

CRM tools (all strictly org-scoped):

| Tool | Type | Action |
|------|------|--------|
| `search_contacts` | read | Search contacts by name/email |
| `get_contact` | read | One contact + recent activities |
| `search_companies` | read | Search companies by name/domain |
| `search_deals` | read | List/filter deals (status, title) |
| `get_deal` | read | One deal + linked contact + activities |
| `create_activity` | write | Log/schedule an activity |
| `update_deal_stage` | write | Move a deal stage / mark won/lost |

Write tools run **only** when the request sets `allowWrites: true`; otherwise they return a soft error the model relays to the user. Writes verify FK ownership against the caller's org before mutating and append an `audit_log` row (`ai_activity_created` / `ai_deal_stage_updated`).

### AI Governance

| Control | How |
|---------|-----|
| **Per-org kill switch** | `organizations.settings.ai.enabled = false` → action routes 503, `/ai/status` reports `enabled: false`. |
| **Monthly spend cap** | `AI_MONTHLY_TOKEN_CAP` (env) and per-org `settings.ai.monthlyTokenCap` — the stricter non-zero value wins. Output tokens used this calendar month are summed from `ai_usage_log`; **429** once the cap is reached. `0` = unlimited. |
| **Provider pinning** | `organizations.settings.ai.provider` overrides `AI_DEFAULT_PROVIDER` for that org (falls back if the pinned provider has no key). |
| **Retention purge** | `AI_MESSAGE_RETENTION_DAYS` (env, `0` = keep forever). When > 0, a daily background purge deletes `ai_conversations` / `ai_messages` / `ai_usage_log` older than N days so PII-bearing transcripts do not persist indefinitely. |

---

## Database

Migrations in `migrations/` — pure PostgreSQL, applied in filename order.

| File | Description |
|------|-------------|
| `001_schema.sql` | users, organizations, contacts, companies, deals, pipelines, activities, notifications, automations, sequences, templates, goals, products, leads, custom_fields, audit_log, ... |
| `002_password_reset_tokens.sql` | `password_reset_tokens` |
| `003_gmail_webhooks_tracking.sql` | `gmail_tokens`, `webhook_subscriptions`, `email_tracking_*` |
| `004_api_keys_lead_tokens.sql` | `api_keys`, `lead_capture_tokens` |
| `005_user_phone_smtp.sql` | `users.phone`, `org_smtp_settings` |
| `006_ux_metric_events.sql` | `ux_metric_events` |
| `007_gmail_thread_workspace.sql` | `gmail_thread_workspace`, `gmail_thread_links` |
| `008_pipelines.sql` | `pipelines`, `pipeline_members` |
| `009_calendar.sql` | `calendar_events`, `calendar_watch_channels` |
| `010_webhooks.sql` | `webhooks`, `webhook_events` |
| `011_activity_linkedin_type.sql` | Adds `linkedin` to `activities_type_check` constraint |
| `012_contacts_linkedin_url.sql` | Adds `linkedin_url text` column to `contacts` |
| `013_org_branding_billing.sql` | Org branding + billing fields |
| `014_plans_subscriptions.sql` | `plans`, subscription/billing tables (Stripe) |
| `015_server_sync_stores.sql` | Server-side sync stores (views, preferences, distribution lists) |
| `016_admin_enhancements.sql` | Admin/impersonation enhancements |
| `017_bootstrap_super_admin.sql` | Bootstrap super-admin |
| `018_ai.sql` | `ai_conversations`, `ai_messages`, `ai_usage_log` (org-scoped, RLS-enabled, indexed) |
| `019_mfa.sql` | `users.mfa_enabled`, `users.mfa_secret_cipher` (AES-256-GCM-encrypted TOTP secret) |
| `020_security_events.sql` | `security_events` (append-only auth/account-security log; nullable org/actor; indexed by created_at/actor/org/type) |
| `021_item_updates.sql` | `item_updates` (Monday-style threaded Updates on contacts/companies/deals/leads; `parent_id` replies, `mentions` jsonb, soft-delete; RLS-enabled) |
| `022_user_dashboard.sql` | Adds `user_preferences.dashboard` jsonb (per-user composable dashboard widget layout; `PATCH /preferences/me/dashboard`) |
| `002_indexes_and_perf.sql` | pg_trgm trigram indexes (full-text search), 40+ B-tree indexes on FK hot paths, composite list-query indexes, RLS on 21 tables, `set_current_org()` SECURITY DEFINER function |

```bash
npm run db:migrate   # apply all pending migrations (idempotent)
npm run db:seed      # seed default org + admin
```

---

## Environment Variables

This mirrors [`.env.example`](.env.example), validated by Zod in [`src/config/env.ts`](src/config/env.ts) — the process **exits at boot** if validation fails.

### Core

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | | `development` | `development` \| `production` \| `test` |
| `DATABASE_URL` | ✓ | — | PostgreSQL connection string (should point to PgBouncer at `pgbouncer:6432` in production) |
| `JWT_SECRET` | ✓ | — | Min 32 chars — `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | | `7d` | Token lifetime (`^\d+[smhdw]$`) |
| `REFRESH_TOKEN_EXPIRES_DAYS` | | `30` | Refresh-token lifetime in days |
| `TOKEN_ENCRYPTION_KEY` | ✓* | — | 32-byte hex — AES-256-GCM key for OAuth tokens, SMTP/Slack/Zoom secrets, webhook secrets. *Required only to use those integrations. |
| `INTERNAL_KEY` | ✓ (prod) | — | Min 16 chars — gates `/internal/*` routes and the `/metrics` cross-container path. When unset, `/internal/*` returns 503. |
| `DEBUG_TOKEN` | | — | Min 16 chars — when set, enables `/_debug/*` routes gated by the `X-Debug-Token` header (`/_debug/sql` runs in a READ ONLY transaction). Unset = disabled. |
| `SENTRY_DSN` | | — | Optional error-tracking DSN. When set, `captureException` is the hook to forward unhandled errors to an SDK; unset = structured-log only. |
| `REDIS_URL` | | `redis://localhost:6379` | Rate-limit store + Socket.io adapter + JWT denylist + login-lockout counters |
| `PORT` | | `3001` | HTTP listen port |
| `CORS_ORIGIN` | | — | Allowed browser origin(s), comma-separated. **Must** be set (no `*`) in production or the process exits. |
| `APP_URL` | | `http://localhost:5173` | Frontend URL for email links (reset, invite) |
| `TRUST_PROXY` | | `1` | Trusted reverse-proxy hop count for client-IP resolution (rate limiting). nginx only = `1`; platform edge + nginx = `2`; `0` = direct. Too high lets clients spoof `X-Forwarded-For`; too low collapses clients onto the proxy IP. |

### Registration policy

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ALLOW_OPEN_REGISTRATION` | | `true` | `false`/`0` = invite-only. The **first** user can always register (bootstrap). |
| `REGISTRATION_ALLOWED_DOMAINS` | | — | Optional comma-separated email-domain allow-list for self-registration. |

### Email

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_FROM` | | `noreply@n0crm.com` | From address for transactional emails |
| `RESEND_API_KEY` | | — | Resend.com (optional — falls back to SMTP) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | | — | Global SMTP fallback (optional; per-org SMTP also supported at runtime) |

### Google OAuth (Gmail / Calendar)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | | — | Google OAuth — enables Gmail + Calendar features |
| `GOOGLE_CLIENT_SECRET` | | — | Google OAuth secret |
| `GOOGLE_REDIRECT_URI` | | — | Must match Google Cloud console (e.g. `http://localhost:5173/auth/gmail/callback`) |
| `GOOGLE_CALENDAR_WEBHOOK_URL` | | — | Public HTTPS base URL for Google push notifications (production only) |

### SSO (OIDC, optional)

SSO activates only when issuer + client id + secret are all set; otherwise `/auth/sso/status` reports `enabled: false`. See [`docs/sso-and-scim.md`](../docs/sso-and-scim.md) for IdP setup.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OIDC_ISSUER` | | — | OIDC issuer URL (discovery base) |
| `OIDC_CLIENT_ID` | | — | OIDC client id |
| `OIDC_CLIENT_SECRET` | | — | OIDC client secret |
| `OIDC_REDIRECT_URI` | | — | Registered callback (the API's `/auth/sso/callback`) |
| `OIDC_DEFAULT_ROLE` | | `sales_rep` | Role granted to JIT-provisioned users (`admin` \| `manager` \| `sales_rep` \| `viewer`) |

### Stripe billing (optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | | — | Enables billing; free-tier caps apply to churned orgs when configured |
| `STRIPE_WEBHOOK_SECRET` | | — | Verifies the Stripe webhook |
| `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` | | — | Checkout redirect URLs |

### AI / Agentic features

The AI assistant + agent activate as soon as **any one** provider key is set. With none set the feature degrades gracefully (`/ai/status` → `enabled: false`, action routes 503).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | | — | Google Gemini (free) — https://aistudio.google.com/apikey |
| `OPENAI_API_KEY` | | — | OpenAI (optional) |
| `ANTHROPIC_API_KEY` | | — | Anthropic (optional) |
| `AI_DEFAULT_PROVIDER` | | `gemini` | `gemini` \| `openai` \| `anthropic` — preferred when several keys are set and no per-org override |
| `AI_GEMINI_MODEL` | | `gemini-2.0-flash` | Model override |
| `AI_OPENAI_MODEL` | | `gpt-4o-mini` | Model override |
| `AI_ANTHROPIC_MODEL` | | `claude-sonnet-4-6` | Model override |
| `AI_AGENT_MAX_STEPS` | | `8` | Max tool-call rounds per agent request (1–20) |
| `AI_MONTHLY_TOKEN_CAP` | | `0` | Per-org monthly output-token cap (`0` = unlimited). Orgs can set a lower cap in `settings.ai.monthlyTokenCap`. 429 when exceeded. |
| `AI_MESSAGE_RETENTION_DAYS` | | `0` | Retention for AI conversations/messages/usage in days (`0` = keep forever) |

### Misc / Docker stack

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GRAFANA_PASSWORD` | | `admin` | Grafana admin password for the Docker Compose stack |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` / `SEED_ORG_NAME` / `SEED_ORG_SLUG` | | see `.env.example` | Used by `npm run db:seed` |

---

## Scripts

```bash
npm run dev          # tsx watch, hot-reload
npm run build        # compile TypeScript → dist/  (tsc)
npm run start        # production: node dist/index.js
npm run db:migrate   # apply pending SQL migrations
npm run db:seed      # seed default org + admin
npm run lint         # eslint src
npm test             # vitest run (one-shot)
npm run test:watch   # vitest (watch mode)
```

---

## Quality Gates (lint / type / test)

The backend is gated in CI by the **`api` job** in [`.gitea/workflows/ci.yml`](../.gitea/workflows/ci.yml). Run the same checks locally from `api/`:

```bash
npx tsc --noEmit                 # type check (no emit)
npm run lint                     # ESLint (flat config — eslint.config.js)
npx vitest run                   # unit tests (85 tests across 12 files)
npm run build                    # tsc → dist/
npm audit --audit-level=critical # dependency audit (0 vulnerabilities expected)
```

- **ESLint** uses a flat config (`eslint.config.js`): `@eslint/js` + `typescript-eslint` recommended. Unused vars are an error (underscore-prefixed args/vars ignored); `no-explicit-any` is a warning (off in tests); `no-empty` allows empty catch blocks.
- **Vitest** suite (`*.test.ts`) covers the AI providers (`providers.test.ts`), agent loop (`agent.test.ts`), CRM tools (`tools.test.ts`), retention purge (`retention.test.ts`), the Slack outbound allow-list (`slack.test.ts`), TOTP (`totp.test.ts`), the RBAC permission matrix (`permissions.test.ts`) and guards (`rbac.test.ts`), OIDC claim/PKCE helpers (`oidc.test.ts`), SCIM helpers (`scim.test.ts`), public-API scope enforcement (`publicApi.scopes.test.ts`), and observability (`observability.test.ts`) — no DB or network required (collaborators are injected as fakes / pure helpers are tested directly).

This `api` job is new: the backend previously had no lint/type/test gate. The frontend has its own job (ui:lint, i18n:lint, i18n:coverage, eslint with 0 warnings, tsc, vitest, build, ≤250KB gzip bundle budget, npm audit).

---

## Security Notes

- **Auth & tokens:** JWTs are HS256, delivered as an HttpOnly `auth_token` cookie (not returned in the login body — XSS protection), and denied at request time via a Redis denylist (logout + rotation; `valid-after` per user invalidates older tokens on login).
- **MFA (TOTP):** optional per-user TOTP (RFC 6238); the base32 secret is AES-256-GCM encrypted at rest and `mfa_enabled` only flips true after a code is verified. Login requires the second factor when enabled.
- **SSO (OIDC):** ID tokens are verified by JWKS RS256 signature + `iss`/`aud`/`exp`/`nonce`, with PKCE S256 and one-time `state` (CSRF/replay guard) before any account is provisioned.
- **SCIM:** Bearer auth via an `scim`-scoped API key (SHA-256-hashed, mapped to an org); deprovision is a soft deactivate + session revocation; the last active owner is protected.
- **Authorization (RBAC):** server-side permission matrix (owner/admin/manager/sales_rep/viewer) enforced by `requirePermission` / `requireCrudPermission` across CRM CRUD, member management, API keys, and webhook subscriptions — authorization no longer relies on the frontend.
- **Security-event log:** authentication and account-security events are written append-only to `security_events` (best-effort, never blocks the request) with client IP + user-agent.
- **Tenant isolation:** every read filters and every PATCH/DELETE verifies `organization_id` ownership before mutation; cross-org FK ownership is checked on deals and on AI write tools. App-layer org scoping is the authoritative control; **Row-Level Security (RLS)** is enabled on 21+ tables (incl. the `ai_*` tables) via `set_current_org()` as opt-in defense-in-depth (see `docs/adr/0001-tenant-isolation-and-rls.md`).
- **Client-IP resolution:** Fastify `trustProxy` is set to `TRUST_PROXY` hops, so the rate limiter keys on the genuine `req.ip` and `X-Forwarded-For` can no longer be spoofed on auth routes.
- **Account lockout:** after **10 failed logins within 15 minutes** per account (Redis counter), further attempts return 429 regardless of correctness — layered on top of the per-IP limit. bcrypt always runs (constant-time) to prevent user enumeration.
- **Self-registration policy:** governed by `ALLOW_OPEN_REGISTRATION` (default open) and the optional `REGISTRATION_ALLOWED_DOMAINS` allow-list; the first user can always register to bootstrap a fresh install.
- **Encryption at rest:** OAuth refresh tokens, SMTP passwords, Slack webhook URLs, Zoom secrets, and webhook signing secrets are AES-256-GCM encrypted.
- **Webhooks:** API keys stored as SHA-256 hashes (raw value never stored); HMAC-SHA256 signatures verified with `timingSafeEqual`; inbound webhooks require a valid HMAC when a secret is registered; outbound subscriptions are HTTPS-only; Slack outbound re-asserts the `hooks.slack.com` allow-list at send time.
- **AI egress:** outbound provider calls go only to a fixed vendor host allow-list with a 30s timeout — no user-supplied URL ever reaches `fetch`.
- **Rate limiting:** 500 req/min per organization (Redis-backed), 20 req/min per IP on auth routes, 10 req/15 min on `/auth/login` + `/auth/register`, and 30 req/min per org on `/ai/*`.
- **`/metrics`** is gated on the **raw socket peer** being loopback **or** a matching `x-internal-key` header (not `req.ip`, which is XFF-derived under `trustProxy`). `/_debug/sql` runs in a READ ONLY transaction and the `/_debug/*` routes only exist when `DEBUG_TOKEN` is set.
- **Realtime:** the Socket.io handshake re-checks `users.is_active` + org membership.
- **Background work:** the sequence runner claims rows `FOR UPDATE SKIP LOCKED` so concurrent workers never double-send. Impersonation exit sets `ended_at`.
- `npm audit` reports **0 vulnerabilities** on the API.

---

## API Usage Examples

All authenticated endpoints require `Authorization: Bearer <token>`.

### Authenticate

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@n0crm.local","password":"Admin1234!"}' \
  | jq -r .token)
```

### Contacts

```bash
# List contacts (paginated, searchable)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/contacts?limit=50&offset=0&search=john&type=contact"

# Create contact
curl -s -X POST http://localhost:3001/contacts \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "email": "jane@acme.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "phone": "+34 600 123 456",
    "jobTitle": "CTO",
    "type": "contact",
    "source": "linkedin",
    "tags": ["enterprise", "hot"],
    "notes": "Met at SaaStr 2025"
  }'

# Update contact (partial — only send fields to change)
curl -s -X PATCH http://localhost:3001/contacts/<id> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status": "active", "tags": ["customer"]}'
```

### Deals

```bash
# List deals filtered by pipeline
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/deals?pipelineId=<uuid>"

# Create deal (stage auto-resolves to pipeline's first stage)
curl -s -X POST http://localhost:3001/deals \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "title": "Acme Corp — Enterprise",
    "value": 50000,
    "currency": "EUR",
    "pipelineId": "<uuid>",
    "contactId": "<uuid>",
    "expectedCloseDate": "2025-12-31"
  }'

# Move deal to next stage
curl -s -X PATCH http://localhost:3001/deals/<id> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"stage": "Proposal", "notes": "Sent proposal PDF"}'

# Close won
curl -s -X PATCH http://localhost:3001/deals/<id> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status": "won"}'
```

### Leads

```bash
# Create lead with scoring tags
curl -s -X POST http://localhost:3001/leads \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "firstName": "Carlos",
    "lastName": "López",
    "email": "carlos@startup.io",
    "source": "webinar",
    "tags": ["hot", "saas"],
    "score": 65
  }'

# Log a lead event (triggers score recompute on frontend)
curl -s -X POST http://localhost:3001/leads/<id>/events \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"eventType": "demo_booked", "metadata": {"slot": "2025-06-10T14:00:00Z"}}'
```

### Slack Notifications

```bash
# Configure Slack incoming webhook
curl -s -X POST http://localhost:3001/slack \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://hooks.slack.com/services/T.../B.../...", "channel": "#crm-alerts"}'

# Test the connection
curl -s -X POST http://localhost:3001/slack/test \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'

# Remove integration
curl -s -X DELETE http://localhost:3001/slack \
  -H "Authorization: Bearer $TOKEN"
```

### Public Lead Capture (API Key auth)

```bash
# Create a lead from an external form (no JWT needed — use API key)
curl -s -X POST http://localhost:3001/public/v1/leads \
  -H "X-Api-Key: <your-api-key>" -H "Content-Type: application/json" \
  -d '{
    "email": "visitor@prospect.com",
    "firstName": "Ana",
    "lastName": "García",
    "companyName": "TechCorp",
    "source": "website_form"
  }'
```

---

## Error Handling

All errors return a JSON body with an `error` key. Status codes:

| Code | Meaning |
|------|---------|
| 400 | Invalid request body — check `details` field for Zod validation errors |
| 401 | Missing or expired JWT — clear token and redirect to `/login` |
| 403 | No organization claim on JWT, or insufficient role; `/metrics` from non-localhost IPs returns 403 |
| 404 | Record not found, or doesn't belong to your org |
| 429 | Rate limit exceeded (500/min per org; 20/min per IP on auth routes; 10/15 min on login+register; 30/min per org on `/ai/*`) **or** account locked (10 failed logins/15 min) **or** monthly AI token cap reached |
| 500 | Server error — check API logs |
| 502 | External service error (Slack, Gmail, SMTP, AI provider) |
| 503 | Health check failed (database/Redis down); AI not configured or disabled for the org; or `/internal/*` with no `INTERNAL_KEY` set |

### Validation errors (400)

```json
{
  "error": "Invalid request",
  "details": {
    "fieldErrors": { "email": ["Invalid email"] },
    "formErrors": []
  }
}
```

### JWT 401 flow

The frontend (`api.ts`) automatically clears the stored token and redirects to `/login` on any 401 response. If `enforceTokenExpiry()` finds an expired token before the request, it aborts early.

---

## Deployment

### Option A — Homebrew (macOS dev)

```bash
brew services start postgresql@16 redis

cd api
cp .env.example .env          # fill JWT_SECRET, TOKEN_ENCRYPTION_KEY
npm install
npm run db:migrate
npm run db:seed
npm run dev                   # http://localhost:3001

cd ../frontend
npm install
npm run dev                   # http://localhost:5173
```

### Option B — Docker Compose (recommended for staging/production)

From repo root:

```bash
cp api/.env.example api/.env   # set JWT_SECRET, TOKEN_ENCRYPTION_KEY, CORS_ORIGIN, INTERNAL_KEY, GRAFANA_PASSWORD
docker-compose up -d

# Core services:
#   postgres       → PostgreSQL 16 (internal, port 5432)
#   pgbouncer      → Connection pool (port 6432, API connects here)
#   redis          → rate limiting + Socket.io adapter + JWT denylist (port 6379)
#   api            → Fastify (port 3001)
#   web            → nginx + frontend (port 80)
#
# Monitoring & Infrastructure:
#   prometheus     → Metrics scraper (port 9090)
#   grafana        → Dashboard (port 3002)
#   postgres-exporter → PostgreSQL metrics
#   node-exporter  → Host metrics
#   backup         → Automated pg_dump (every 6h, 7-day retention)
#
# Optional seed (separate profile):
#   seed           → One-time data population
```

To apply seed data after initial setup:
```bash
docker-compose --profile seed up seed
```

Migrations run automatically on API container startup via `docker-entrypoint.sh`.

### Option C — systemd (Linux VPS)

```ini
# /etc/systemd/system/n0crm-api.service
[Unit]
Description=n0CRM API
After=network.target postgresql.service redis.service

[Service]
WorkingDirectory=/opt/n0crm-api
EnvironmentFile=/opt/n0crm-api/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
User=n0crm

[Install]
WantedBy=multi-user.target
```

```bash
npm run build
sudo systemctl enable --now n0crm-api
```

### Production checklist

- [ ] `JWT_SECRET` — min 32 chars (use `openssl rand -hex 32` → a 64-char hex string)
- [ ] `TRUST_PROXY` — set to your real proxy hop count (nginx=1, edge+nginx=2); wrong values break IP-based rate limiting
- [ ] `ALLOW_OPEN_REGISTRATION` / `REGISTRATION_ALLOWED_DOMAINS` — lock down signup for enterprise deployments
- [ ] AI (optional) — set at least one of `GEMINI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`; consider `AI_MONTHLY_TOKEN_CAP` and `AI_MESSAGE_RETENTION_DAYS` for a shared key
- [ ] `TOKEN_ENCRYPTION_KEY` — exactly 32 bytes hex (`openssl rand -hex 32`)
- [ ] `INTERNAL_KEY` — min 16 chars for `/internal/*` routes (sequences/run, etc.)
- [ ] `CORS_ORIGIN` — set to your frontend domain (no trailing slash)
- [ ] `APP_URL` — set to your frontend domain (used in password reset emails)
- [ ] `N0CRM_API_URL` — set on the frontend/nginx if not using localhost (runtime proxy target)
- [ ] **PgBouncer configured** in `infra/pgbouncer/` — generate MD5-hashed `userlist.txt` before first deploy; API connects via `pgbouncer:6432` not directly to postgres
- [ ] Redis: enable persistence (`appendonly yes`) to survive restarts; Socket.io Redis adapter requires Redis for multi-node deployments
- [ ] Set up SSL termination (nginx / Caddy) — do not expose port 3001 directly
- [ ] Configure `GOOGLE_CALENDAR_WEBHOOK_URL` if using Calendar push notifications
- [ ] Run `npm install` in `api/` after pulling — new packages added: `@socket.io/redis-adapter`, `prom-client`
- [ ] Review `docker-entrypoint.sh` to confirm migrations run automatically
- [ ] Prometheus running and scraping `/metrics` endpoint on port 9090
- [ ] Grafana up on port 3002 with Prometheus auto-provisioned as datasource

---

## Internal Routes

Protected by `x-internal-key` header (must match `INTERNAL_KEY` env var).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/internal/sequences/run` | Manually trigger sequence runner (for testing). Returns `{ processed: number, errors: number }`. |

**Example:**
```bash
curl -X POST http://localhost:3001/internal/sequences/run \
  -H "x-internal-key: $INTERNAL_KEY" \
  -H "Content-Type: application/json"
```

---

## Monitoring

The API exports Prometheus metrics, health checks, and request-correlation IDs to support observability at scale.

### Request correlation

Every request carries a stable id: Fastify's `genReqId` continues a well-formed upstream `x-request-id` (trace continuity) or mints a UUID, and the same value is echoed back in the `x-request-id` response header and included on error responses (`{ error, requestId }`). Unhandled errors are sent through `captureException`, which emits a structured `unhandled_error` log; when `SENTRY_DSN` is set the same hook is the place to forward to an error-tracking SDK.

### Health Checks

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /health` | — | Full readiness probe (DB + Redis). Kept for back-compat with container healthchecks. |
| `GET /health/ready` | — | Same readiness probe — 200 `ok` / 503 `degraded`. |
| `GET /health/live` | — | Liveness only — process is up, no dependency checks (won't restart-loop on a transient DB/Redis blip). |

`/health` and `/health/ready` return:
```json
{
  "status": "ok|degraded",
  "timestamp": "2026-06-11T10:00:00Z",
  "db": "ok|error",
  "redis": "ok|error",
  "uptime": 12345
}
```

They return 503 Service Unavailable if either database or Redis is down. `/health/live` returns `{ "status": "ok", "uptime": <seconds> }`.

### Metrics

**Endpoint:** `GET /metrics` (Prometheus format, gated)

**Access control:** the endpoint is served only when the request **either** originates from a loopback peer (the raw socket `remoteAddress`, which cannot be spoofed via `X-Forwarded-For`) **or** presents a matching `x-internal-key` header (`INTERNAL_KEY` env). Cross-container scrapers such as Prometheus use the `x-internal-key` path; same-host curl/healthchecks use the loopback path. All other requests get 403.

**Metrics exposed:**
- `n0crm_http_requests_total` — Total HTTP requests by method/route/status
- `n0crm_http_request_duration_seconds` — Request latency histogram
- `n0crm_db_query_duration_seconds` — Database query latency
- `n0crm_active_websocket_connections` — Real-time connections currently open
- `nodejs_*` — Node.js process metrics (memory, CPU, GC)

### Prometheus Configuration

In Docker Compose, Prometheus scrapes:
- `http://api:3001/metrics` (application metrics) — every 15s
- `http://postgres-exporter:9187/metrics` (PostgreSQL metrics) — every 15s
- `http://node-exporter:9100/metrics` (host metrics) — every 15s

See `infra/prometheus/prometheus.yml` for configuration.

### Grafana Dashboard

Access Grafana at `http://localhost:3002` (default credentials: `admin` / `$GRAFANA_PASSWORD`).

Prometheus is auto-provisioned as the default datasource. Build dashboards to visualize:
- API response times
- Database query performance
- WebSocket connection count
- PostgreSQL replication lag (if applicable)
- Memory/CPU utilization

---

## Troubleshooting

### API won't start

```
Error: Cannot connect to PostgreSQL
```
→ Verify `DATABASE_URL` is correct and PostgreSQL is running. Test: `psql $DATABASE_URL -c '\l'`

```
Error: JWT_SECRET must be at least 32 characters
```
→ Set `JWT_SECRET` in `.env` with `openssl rand -hex 32`

### 500 on template create/patch

Was previously caused by `text[]` vs `jsonb` confusion with `variables`. Fixed in current version. If you see it again, check `email_templates.variables` column type with `\d email_templates`.

### API key lookups fail

API keys are hashed in Node.js with SHA-256 before storage. Do **not** enable pgcrypto and do **not** mix SQL-level hashing. The current implementation in `publicApi.ts` uses `createHash('sha256')` from `node:crypto`.

### Socket.io not connecting

- Ensure the frontend `VITE_API_URL` matches the API origin (including port).
- CORS: `CORS_ORIGIN` must match the browser origin exactly (no trailing slash).
- **Redis must be running** — Socket.io Redis adapter is required for multi-node deployments. If Redis is down, Socket.io connections will fail. Check `REDIS_URL` in `.env` and verify `docker compose ps redis` shows `healthy`.

### Google OAuth callback fails

- `GOOGLE_REDIRECT_URI` must exactly match the URI registered in Google Cloud Console.
- After changing the redirect URI in `.env`, restart the API.
- For local dev: `http://localhost:5173/auth/gmail/callback`

### Migrations fail

```bash
npx tsx scripts/migrate.ts    # check output for which migration failed
psql $DATABASE_URL -c "SELECT filename, applied_at FROM _migrations ORDER BY applied_at"
```

If a migration partially applied, manually drop the incomplete table and re-run.

### Slack test message fails (502)

- The webhook URL must match `https://hooks.slack.com/services/...` exactly.
- Verify the webhook is still active in the Slack app settings (Apps → Incoming Webhooks).
- If the channel was deleted or the workspace plan changed, the webhook may have been revoked.

---

*Last updated: 2026-06-11*
