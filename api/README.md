# api/

Fastify REST API for n0CRM — self-hosted B2B CRM backend. This is the `api/` subdirectory of the **velo-crm monorepo** (see parent [`../README.md`](../README.md) for monorepo structure).

| Layer | Tech |
|-------|------|
| Runtime | Node.js 22, TypeScript |
| Framework | Fastify 5 |
| Database | PostgreSQL 16 via `postgres.js` (camelCase transform) |
| Auth | HS256 JWT — `{ sub, org, role, jti }` claims; per-token Redis denylist |
| Queues | BullMQ + Redis (ioredis) |
| Realtime | Socket.io — org-scoped rooms, JWT-verified middleware |
| Validation | Zod on every route |
| Encryption | AES-256-GCM for OAuth tokens, SMTP passwords, webhook secrets |

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
| POST | `/auth/login` | — | Email + password → JWT |
| POST | `/auth/register` | — | Create account (org: null) |
| GET | `/auth/me` | ✓ | Restore session |
| PATCH | `/auth/me` | ✓ | Update profile (name, jobTitle, phone, avatarUrl) |
| POST | `/auth/refresh` | ✓ | Rotate JWT — old jti revoked in Redis denylist |
| PATCH | `/auth/password` | ✓ | Change password (requires current password) |
| POST | `/auth/admin/reset-password` | ✓ owner/admin | Set another org member's password |
| POST | `/auth/forgot-password` | — | Send password reset email (always 200) |
| POST | `/auth/reset-password` | — | Verify token + update password |
| POST | `/auth/logout` | ✓ | Revoke JWT + clear session |
| GET | `/auth/resolve-org/:slug` | — | Resolve org slug → org metadata |

### Core CRM

| Resource | Base path | Notes |
|----------|-----------|-------|
| Contacts | `/contacts` | `GET ?search=&type=&limit=&offset=` — count includes search filter |
| Companies | `/companies` | `GET ?search=&industry=&status=` |
| Deals | `/deals` | `GET ?pipelineId=`. Stage auto-resolves from pipeline on create. |
| Activities | `/activities` | CRUD |
| Notifications | `/notifications` | `POST /mark-all-read`, `DELETE /` (clear all for user) |
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
| GET | `/integrations/api-keys` | ✓ | List org API keys |
| POST | `/integrations/api-keys` | ✓ | Create (raw value returned once, stored as SHA-256) |
| POST | `/integrations/api-keys/:id/rotate` | ✓ | Revoke + reissue |
| DELETE | `/integrations/api-keys/:id` | ✓ | Revoke |
| GET | `/integrations/lead-capture-tokens` | ✓ | List capture tokens |
| POST | `/integrations/lead-capture-tokens` | ✓ | Create |
| DELETE | `/integrations/lead-capture-tokens/:id` | ✓ | Delete |

### Public API (API key auth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/public/v1/leads` | `X-Api-Key` | Create lead from external form (upserts by email) |

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

---

## Database

Migrations in `migrations/` — pure PostgreSQL, applied in filename order.

| File | Tables created |
|------|---------------|
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

```bash
npm run db:migrate   # apply all pending migrations (idempotent)
npm run db:seed      # seed default org + admin
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✓ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✓ | — | Min 64 chars — `openssl rand -hex 32` |
| `TOKEN_ENCRYPTION_KEY` | ✓* | — | 32-byte hex — AES-256-GCM key for OAuth tokens, SMTP passwords, webhook secrets. Required to use Gmail/Calendar/SMTP features. |
| `REDIS_URL` | | `redis://localhost:6379` | BullMQ + Socket.io + JWT denylist |
| `PORT` | | `3001` | HTTP listen port |
| `CORS_ORIGIN` | | `http://localhost:5173` | Allowed browser origin(s) — comma-separated in production |
| `JWT_EXPIRES_IN` | | `7d` | Token lifetime |
| `APP_URL` | | `http://localhost:5173` | Frontend URL for email links (reset, invite) |
| `EMAIL_FROM` | | `noreply@n0crm.com` | From address for transactional emails |
| `RESEND_API_KEY` | | — | Resend.com (optional — falls back to SMTP) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | | — | Global SMTP fallback (optional) |
| `GOOGLE_CLIENT_ID` | | — | Google OAuth — enables Gmail + Calendar features |
| `GOOGLE_CLIENT_SECRET` | | — | Google OAuth secret |
| `GOOGLE_REDIRECT_URI` | | — | Must match Google Cloud console (e.g. `http://localhost:5173/auth/gmail/callback`) |
| `GOOGLE_CALENDAR_WEBHOOK_URL` | | — | Public HTTPS base URL for Google push notifications (production only) |
| `ANTHROPIC_API_KEY` | | — | Optional — AI features |

---

## Scripts

```bash
npm run dev          # tsx watch, hot-reload
npm run build        # compile TypeScript → dist/
npm run start        # production: node dist/index.js
npm run db:migrate   # apply pending SQL migrations
npm run db:seed      # seed default org + admin
npm test             # vitest
```

---

## Security Notes

- All PATCH/DELETE routes verify `organization_id` ownership before mutation.
- JWTs are denied at request time via Redis denylist (logout + token rotation).
- OAuth refresh tokens and SMTP passwords are encrypted AES-256-GCM at rest.
- Webhook secrets are encrypted at rest; HMAC-SHA256 signatures are verified with `timingSafeEqual`.
- API keys are stored as SHA-256 hashes — raw value never stored.
- Public inbound webhook requires HMAC signature when a secret is registered.
- Rate limiting on auth routes: 10 req / 15 min.
- Slack webhook URLs are encrypted AES-256-GCM at rest in `organizations.settings`.

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
| 403 | No organization claim on JWT, or insufficient role |
| 404 | Record not found, or doesn't belong to your org |
| 429 | Rate limit exceeded (10 req/15 min on auth routes, 200 req/min elsewhere) |
| 500 | Server error — check API logs |
| 502 | External service error (Slack, Gmail, SMTP) |

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
cp api/.env.example api/.env   # set JWT_SECRET, TOKEN_ENCRYPTION_KEY, CORS_ORIGIN
docker-compose up -d

# Services:
#   postgres  → internal DB (port 5432 not exposed)
#   redis     → internal cache
#   api       → Fastify on port 3001
#   web       → nginx + frontend (port 80)
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

- [ ] `JWT_SECRET` — at least 64 chars (`openssl rand -hex 32`)
- [ ] `TOKEN_ENCRYPTION_KEY` — exactly 32 bytes hex (`openssl rand -hex 32`)
- [ ] `CORS_ORIGIN` — set to your frontend domain (no trailing slash)
- [ ] `APP_URL` — set to your frontend domain (used in password reset emails)
- [ ] `N0CRM_API_URL` — set on the frontend/nginx if not using localhost (runtime proxy target)
- [ ] Database: enable connection pooling (PgBouncer) for > 50 concurrent users
- [ ] Redis: enable persistence (`appendonly yes`) to survive restarts
- [ ] Set up SSL termination (nginx / Caddy) — do not expose port 3001 directly
- [ ] Configure `GOOGLE_CALENDAR_WEBHOOK_URL` if using Calendar push notifications
- [ ] Rate limit at nginx level in addition to application rate limiting
- [ ] Review `docker-entrypoint.sh` to confirm migrations run automatically

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
- Redis must be running for Socket.io adapter.

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

*Last updated: 2026-05-18*
