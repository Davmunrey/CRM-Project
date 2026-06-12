# Email operations (master)

> Rewritten **2026-06-11** for the Fastify backend. Deliverability, mailbox privacy, release gates, and smoke testing for every email path in n0CRM.

**Architecture note:** n0CRM was migrated off Supabase. There are **no Edge Functions** and no `functions/v1/*` endpoints. All outbound mail, OAuth, and open/click tracking now run inside **n0crm-api** (Fastify 5 / Node 22, in the `api/` directory). This document maps the real routes.

## 📑 Table of contents

- [Transactional auth emails (n0crm-api)](#transactional-auth-emails)
- [Outbound transport and provider selection](#outbound-transport)
- [BYO-SMTP outbound (per organization)](#byo-smtp-outbound)
- [In-app outbound and Gmail](#in-app-outbound-and-gmail)
- [DNS deliverability (SPF / DKIM / DMARC)](#dns-deliverability)
- [Open/click analytics inventory](#email-openclick-analytics-inventory)
- [Mailbox privacy runbook](#email-mailbox-privacy-runbook)
- [Email release checklist](#email-release-checklist)
- [15-minute smoke test](#email-smoke-test-15min)

---

<a id="transactional-auth-emails"></a>
## ✉️ Transactional auth emails (n0crm-api)

Authentication mail is sent by n0crm-api through the shared `sendEmail` service (`api/src/services/email.ts`). There is no Supabase Auth.

### Current state

- **`POST /auth/forgot-password`** (`api/src/routes/auth.ts`) — always returns `200 { ok: true }` to prevent account enumeration. When the email matches an active user it stores a 1-hour reset token in `password_reset_tokens` as a **SHA-256 hash** of the raw token (never plaintext), then sends the reset email via `sendEmail`. Records a `password_reset_requested` security event.
- **`POST /auth/reset-password`** — re-hashes the supplied token, looks it up, enforces the 1-hour expiry, sets the new bcrypt password hash (cost 12), and deletes the token row (single-use). Records `password_reset_completed`.
- Both routes share the auth rate limit: **10 requests / 15 minutes** per client.
- **Invitations** — `POST /invitations` (`api/src/routes/invitations.ts`) sends a "You have been invited to join n0CRM" message with an `{APP_URL}/accept-invite?token=<token>` link via `sendEmail`. Org-member invites (`api/src/routes/orgs.ts`) use the same service.
- **Login** (`POST /auth/login`) uses bcrypt cost 12; failed logins feed account lockout. (Auth hardening lives in `api/src/routes/auth.ts`, not in this doc.)

### Reset email link

The CTA points at `{APP_URL}/reset-password?token=<rawToken>`, where `APP_URL` is the API env var (default `http://localhost:5173`).

### Operator checklist

- [x] `sendEmail` wired into `POST /auth/forgot-password`.
- [x] Reset tokens stored as SHA-256 hashes (not plaintext).
- [x] Rate limit on `/auth/forgot-password` and `/auth/reset-password`: 10 req / 15 min.
- [x] CTA opens `{APP_URL}/reset-password?token=<token>`.
- [ ] Branded HTML template for the reset email (current body is a minimal inline `<p>` + link).
- [ ] Confirm a test reset email is received within 60 seconds.
- [ ] "Ignore if you did not request this" copy added to the template.
- [ ] SPF/DKIM/DMARC verified for the sender domain (see [DNS deliverability](#dns-deliverability)).

### Acceptance criteria

- Reset email arrives within 60 seconds of request.
- Token in the link is valid for 1 hour and single-use.
- Renders cleanly in Gmail and Outlook web clients.

---

<a id="outbound-transport"></a>
## 🚚 Outbound transport and provider selection

All server-sent mail flows through `sendEmail(opts, smtpConfig?)` in `api/src/services/email.ts`, which builds a **nodemailer** transport. Transport precedence in `buildTransport`:

1. **Resend SMTP relay** — if `RESEND_API_KEY` is set, mail goes through `smtp.resend.com:465` (implicit TLS, user `resend`). This takes priority over everything else.
2. **Per-org SMTP config** — when a request passes an explicit `smtpConfig` (the BYO-SMTP path below).
3. **Global SMTP** — if `SMTP_HOST` is set, uses `SMTP_HOST` / `SMTP_PORT` (default 587, implicit TLS only on port 465) with optional `SMTP_USER` / `SMTP_PASS`.
4. **No transport** — if none of the above is configured, `sendEmail` logs a warning and silently no-ops (useful in dev).

The `From` address resolves in this order: explicit `opts.from` → org SMTP `fromName <fromAddress>` → org `fromAddress` → the `EMAIL_FROM` env default (`noreply@n0crm.com`).

### Relevant API env vars

| Var | Purpose |
|-----|---------|
| `RESEND_API_KEY` | Route all mail through the Resend SMTP relay. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Global fallback SMTP server. |
| `EMAIL_FROM` | Default sender (`noreply@n0crm.com`). |
| `APP_URL` | Base URL for reset/invite links and tracking pixel/click URLs. |
| `TOKEN_ENCRYPTION_KEY` | AES-256-GCM key (≥32 chars) shared by the SMTP password and Gmail token ciphers. |

---

<a id="byo-smtp-outbound"></a>
## 🏢 BYO-SMTP outbound (per organization)

n0CRM can route a tenant's in-app outbound mail through that organization's own SMTP server instead of the global transport. Use this when a customer must send "from" a verified corporate domain (Microsoft 365, Google Workspace SMTP relay, AWS SES SMTP, Postmark SMTP, a dedicated Postfix, etc.).

### Selection

Set `VITE_EMAIL_PROVIDER=smtp` in the frontend deployment that should send through the per-org SMTP path (`frontend/src/services/emailProviders/`). Settings can be saved per-org regardless of this flag; only sends from the active provider route through the org's SMTP credentials.

### Data model

- Table `org_smtp_settings` (migration `api/migrations/005_user_phone_smtp.sql`): one row per organization (`organization_id` is `UNIQUE`). The password is stored in `password_enc` as AES-256-GCM ciphertext and is **never returned to the browser**.
- There is no separate "public view" — the read route simply omits `password_enc` from its `SELECT`.

### API routes (`api/src/routes/smtp.ts`, all authenticated)

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/smtp` | Returns the org's current config without the password. |
| `POST` | `/smtp` | Upserts settings (`ON CONFLICT (organization_id)`). Validates the host through the **SSRF guard** (`resolvePublicIp`) to block loopback/private/reserved targets. Encrypts the password with `encryptToken`; an empty password on update reuses the stored ciphertext. |
| `POST` | `/smtp/test` | Sends an "n0CRM — SMTP test" message using inline or saved credentials. Re-resolves the host and **pins the connection to the resolved IP** to close the DNS-rebinding TOCTOU window. Writes the outcome to `last_test_at` / `last_test_ok` / `last_test_error`. |
| `DELETE` | `/smtp` | Removes the config and reverts the org to the global transport. |

### What admins do in the app

In **Settings → Integrations → SMTP outbound (BYO)**, an org `owner` or `admin` enters:

- Host, port (587 default), username, password
- From address (must be a valid email) plus optional From name and Reply-To
- Security mode: `starttls` (port 587, `requireTLS`), `ssl` (port 465, implicit TLS), or `none` (testing only)

**Save** upserts the row as the active config. **Send test** dispatches a probe message and records the result.

### What happens on an in-app send

`POST /email/send` (`api/src/routes/email.ts`, authenticated, rate-limited to **60 / minute**, **viewers blocked with 403**):

1. Looks up the org's active `org_smtp_settings` row; if present and decryptable, builds an `smtpConfig`.
2. Calls `sendEmail(...)`, which prefers Resend → org SMTP → global SMTP per the precedence above.
3. **Forces the `From` to the org's verified SMTP address** (or the `EMAIL_FROM` default) — the caller-supplied `from` is intentionally ignored to prevent sender spoofing through org credentials.
4. Returns `{ ok: true }`, or `502 { error: 'Email send failed' }` on transport error.

### Security notes

- All SMTP mutations go through the authenticated API; the browser never sees `password_enc`.
- Both the save and test paths run the host through the SSRF guard before connecting.
- Failed sends do **not** rotate credentials — if a provider rotates the password, an admin must re-enter it.

---

<a id="in-app-outbound-and-gmail"></a>
## 📬 In-app outbound and Gmail

CRM-specific outbound and inbox behavior. Gmail OAuth senders still need **SPF, DKIM, and DMARC** on their sending domain (see [DNS deliverability](#dns-deliverability)).

### Gmail OAuth flow (no Edge Functions)

The OAuth callback is a **frontend route**: `{origin}/auth/gmail/callback` (`frontend/src/pages/GmailCallback.tsx`). It postMessages the result back to the opener window and closes. The backend routes (all in `api/src/routes/gmail.ts`, authenticated unless noted) are:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/gmail/oauth-configured` | Public: tells the frontend whether `GOOGLE_CLIENT_ID`/`SECRET` are set, plus the configured `GOOGLE_REDIRECT_URI`. |
| `POST` | `/gmail/oauth-start` | Builds the Google authorization URL with **PKCE (`code_challenge_method=S256`)**, `access_type=offline`, `prompt=consent`, and a state nonce bound to the user in Redis. Scope bundle is `primary` (Gmail), `calendar`, or `contacts`. |
| `POST` | `/gmail/oauth-exchange` | Exchanges the code for tokens. Verifies the returned `state` was issued to this user (CSRF / token-injection guard). Stores the refresh token as AES-256-GCM ciphertext (`refresh_token_cipher`) in `gmail_tokens`. |
| `GET` | `/gmail/refresh-token` | Mints a fresh access token from the stored refresh token. |
| `POST` | `/gmail/disconnect` | Revokes the token at Google and deletes the `gmail_tokens` row. |
| `GET` | `/gmail/integration-status` | Connection status + which scopes (gmail/calendar/contacts) are granted. |
| `GET`/`POST`/`DELETE` | `/gmail/thread-links` | Per-user thread ↔ CRM-entity links (`gmail_thread_links`). |
| `GET`/`PUT`/`DELETE` | `/gmail/thread-workspace` | Per-user thread owner + internal note (`gmail_thread_workspace`). |
| `POST` | `/gmail/sync-contacts` | Imports Google Contacts (People API) into the `contacts` table; requires the `contacts` scope. |

Gmail tokens are encrypted with the same `TOKEN_ENCRYPTION_KEY` cipher (`api/src/services/tokenCipher.js`) used for SMTP passwords.

### What the app does

- **Gmail API sends** build MIME with `multipart/alternative` (plain + HTML) when HTML is present, improving spam-filter compatibility over HTML-only payloads.
- **Hybrid inbox search:** Gmail `threads.list` receives a stripped query (CRM-only operators removed). Filters such as `is:tracked`, `is:opened`, `is:clicked`, and `in:mine` (thread owner in CRM) run client-side using CRM emails linked by `gmailThreadId`.

### What you must configure (domain and product)

- **SPF, DKIM, DMARC** on the domain you send from (Google Workspace for Gmail OAuth users, or your DNS when using Resend / another ESP).
- **Reputation:** avoid sudden high volume from a single mailbox; space bulk sends (see `frontend/src/features/inbox/enqueueBulkSends.ts`).
- **Marketing:** only queue contacts with `marketing_opt_in`; provide a real unsubscribe URL before adding `List-Unsubscribe` headers (future hardening).
- **Auth email security:** reset token TTL is 1 hour and single-use (enforced in `/auth/reset-password`); password changes use bcrypt cost 12.

### Limits

- Inbox placement is decided by recipients and providers; no client change guarantees avoiding spam or the Promotions tab.

---

<a id="dns-deliverability"></a>
## 🌐 DNS deliverability (SPF / DKIM / DMARC)

Evidence for buyers and ops: domain authentication, alignment, and monitoring. This applies whichever transport you use — Resend relay, BYO-SMTP, or Gmail OAuth.

### 1. DNS authentication

1. **SPF** — Publish the TXT record for your sending domain / return-path subdomain. For Resend, use the records shown in the Resend dashboard; for BYO-SMTP, the record your SMTP provider documents; for Gmail OAuth, the Google Workspace SPF include.
2. **DKIM** — Complete domain verification with your sending provider and install the DKIM TXT record(s).
3. **DMARC** — Start with a monitoring policy, then tighten:
   - Initial: `p=none` with aggregate reports (`rua=`).
   - Later: move toward `quarantine` or `reject` once SPF/DKIM are stable.

### 2. From / reply alignment

- [ ] The active `From` domain (org `from_address`, or `EMAIL_FROM`, or the Resend-verified domain) is authenticated in DNS.
- [ ] For Resend, the `EMAIL_FROM` / org `from_address` domain is **Verified** in the Resend dashboard.
- [ ] Tracking pixel and click-redirect links are served from your `APP_URL` host — keep that domain consistent with your trust story.

### 3. Content and reputation

- [x] Send both **text** and **HTML** where possible (`sendEmail` carries `html` + `text`; `POST /email/send` accepts `htmlBody`/`html` and `body`/`text`).
- [ ] Bounce and complaint handling process defined (who monitors the provider dashboard).
- [ ] Warm-up plan for new dedicated IPs (if applicable — Resend shared infra is typical).

### 4. Evidence to attach for sales / security reviews

- [ ] Screenshot: sending domain **Verified** with the provider.
- [ ] Screenshot or `dig` output: SPF + DKIM + DMARC TXT records live.
- [ ] Sample headers from a received message showing `spf=pass`, `dkim=pass`, `dmarc=pass` (mailbox dependent).

### Sign-off

| Role | Name | Date |
|------|------|------|
| Ops  |      |      |

---

<a id="email-openclick-analytics-inventory"></a>
## 📊 Open/click analytics inventory

Single map from **UI → client helpers → API → Postgres** so "estimated" vs **server-backed** metrics stay honest. All ingestion now runs inside n0crm-api — there are no `track-open` / `track-click` Edge Functions.

| Layer | Responsibility | Key paths |
|-------|----------------|-----------|
| **Outbound HTML** | Rewrite links + inject open pixel | `frontend/src/lib/emailTracking.ts` (`rewriteLinksForTracking`, `injectOpenPixel`, `normalizeBodyToHtml`), consumed by `frontend/src/store/emailStore.ts` when sending tracked mail. |
| **Registration** | Mint open/click tokens (authed) | `POST /api/email-tracking/messages` returns an `open_token` + pixel URL; `POST /api/email-tracking/links` returns per-link `click_token`s + click URLs. Both org-scope and verify referenced entities. |
| **Ingestion** | Stateless open/click beacons (public, no auth) | `GET /api/email-tracking/open?token=...` returns a 1×1 GIF and records an `open` event; `GET /api/email-tracking/click?token=...` records a `click` and 302-redirects (http(s) only — `javascript:`/`data:` rejected). Both rate-limited to 60/min. (`api/src/routes/emailTracking.ts`) |
| **Persistence** | Per-message / per-link rows + events | `email_tracking_messages`, `email_tracking_links`, `email_tracking_events` (migration `api/migrations/003_gmail_webhooks_tracking.sql`), all org-scoped with a `user_id` owner column. |
| **UI — counts** | Per-email + aggregate counts for the signed-in org | `GET /api/email-tracking/messages/:emailId/stats` and `GET /api/email-tracking/stats?from=&to=` return `{ opens, clicks }`. The Inbox/Reports UI reads these. |
| **Demo / mock** | Simulated opens/clicks | Local non-server mode only — **not** recipient truth. |

Tokens, pixel URLs, and click URLs are all built against `APP_URL` (`{APP_URL}/api/email-tracking/...`).

**Future (optional):** org-wide manager rollups (materialized view), bot dedupe via `user_agent` / `ip_hash` (the `email_tracking_events.ip_hash` column exists but is not yet populated by the open/click handlers).

---

<a id="email-mailbox-privacy-runbook"></a>
## 🔒 Mailbox privacy runbook

Helps support and ops validate and troubleshoot per-user mailbox privacy.

### Document control

- Status: Active
- Owner: Support / Ops
- Last updated: 2026-06-11
- Canonical: Yes

### Scope

- Inbox visibility for local CRM emails (`sent`, `scheduled`)
- Tracking visibility (opens/clicks) linked to local emails
- Thread workspace metadata (`gmail_thread_workspace`) privacy behavior
- User-scoped quick replies (`quick_replies`) visibility/editability

### Expected behavior

- Each authenticated user sees only their own mailbox data; tracking, thread links, and thread-workspace rows are scoped by `user_id = req.user.sub` **and** `organization_id` in every query.
- Tracking counters only include events for emails owned by the current org/user.
- Inbox header shows private mailbox scope.
- Quick replies created by one user do not appear for other users.

### Quick verification

1. Sign in as User A and send a tracked email.
2. Confirm it appears in User A `Sent`.
3. Sign in as User B in the same organization.
4. Confirm User B does not see User A's local email in `Sent` / `Scheduled`.
5. Trigger or wait for tracking events.
6. Confirm User A sees updated counters and User B does not.

### Troubleshooting

**Issue: cross-user visibility suspected**

- Verify account context: active authenticated user and active organization.
- Verify ownership fields: local email `ownerUserId`; tracking/thread-link/workspace `user_id`.
- Confirm the route applies app-layer scoping (`user_id = ${req.user.sub} AND organization_id = ${req.user.org}`) — this is the authoritative isolation control. (Postgres RLS, where present, is opt-in defense-in-depth per `docs/adr/0001-tenant-isolation-and-rls.md`; do not rely on it as the only gate.)

**Issue: tracking events not updating**

- Confirm the API is reachable and `GET /api/email-tracking/open` / `/click` return (GIF / 302) — these are public, unauthenticated beacons.
- Verify events land in `email_tracking_events` with the matching `organization_id` and `email_id`.
- Re-run the Inbox mailbox refresh and confirm `messages/:emailId/stats` counters change.

### Escalation data

When escalating to backend, include:

- Organization id and user id
- Email id(s) and the tracking message id
- Event timestamps (open/click)
- Screenshot of the Inbox mailbox-privacy badges
- The `x-request-id` from the failing API response (correlation id)
- Build/version currently deployed

---

<a id="email-release-checklist"></a>
## ✅ Email release checklist

Use before promoting CRM email changes to production.

### Document control

- Status: Active
- Owner: QA / Ops
- Last updated: 2026-06-11
- Canonical: Yes

### Functional checks

- [ ] Compose flow works for `to`, `cc`, `bcc`, `reply-to`.
- [ ] Invalid recipient formats are blocked with clear feedback.
- [ ] `Ctrl/Cmd + Enter` sends correctly from the composer.
- [ ] Subject presets and quick snippets insert as expected.
- [ ] Quick replies are persisted per user and editable.
- [ ] Sent and Scheduled folders render correctly.
- [ ] Inbox advanced filters and saved views work end-to-end.
- [ ] Inbox sync status badge transitions correctly (syncing/healthy/stale/error).
- [ ] Open/click tracking counters update after refresh.

### Privacy checks

Reproducible steps live in the **[15-minute smoke test](#email-smoke-test-15min)** (Flow B + Flow C) and the **[Mailbox privacy runbook](#email-mailbox-privacy-runbook)**. For release, confirm:

- [ ] Smoke test Flow B + C completed (no cross-user visibility; ownership scoping intact).
- [ ] Support has acknowledged the runbook escalation path.

### Backend checks

- [ ] `POST /email/send` rejects viewers (403) and respects the 60/min rate limit.
- [ ] `GET /api/email-tracking/open` and `/click` are reachable and return GIF / 302.
- [ ] Tracking inserts carry `organization_id`, `user_id`, and `email_id`.
- [ ] Per-org SMTP host passes the SSRF guard on save and test.
- [ ] `org_smtp_settings.password_enc` and `gmail_tokens.refresh_token_cipher` are never returned to the browser.

### QA / verification checks

- [x] Targeted regression tests pass (frontend `tests/stores/emailStore.trackingBatch.test.ts`; API tracking/email route tests).
- [x] Production build passes (`npm run build` in `frontend/` and `api/`).
- [x] No new lint issues in touched files.

### Support readiness

- [x] Support team has the runbook: [Mailbox privacy runbook](#email-mailbox-privacy-runbook).
- [ ] Ops knows expected mailbox behavior and the escalation data required.

---

<a id="email-smoke-test-15min"></a>
## ⏱️ 15-minute smoke test

Quick manual validation for Inbox + tracking + per-user privacy before release.

### Document control

- Status: Active
- Owner: QA / Support
- Last updated: 2026-06-11
- Canonical: Yes

### Preconditions (2 min)

- Two active users in the same organization (`User A`, `User B`).
- n0crm-api running and reachable; `APP_URL` points at the SPA host so tracking pixel/click URLs resolve.
- An outbound transport configured (`RESEND_API_KEY`, global `SMTP_*`, or a per-org SMTP row) — or a connected Gmail account.
- A test lead/contact email reachable from the browser.

### Flow A — Send + tracking (6 min)

1. Sign in as `User A`.
2. Go to `Inbox` and send a tracked email to the test recipient.
3. Confirm the email appears in the sent list with tracking indicators.
4. Open the email from the recipient inbox (loads the tracking pixel → `GET /api/email-tracking/open`).
5. Click one tracked link (→ `GET /api/email-tracking/click`, which 302-redirects).
6. Back in CRM, run a tracking refresh (or wait for auto-refresh) and verify:
   - Opens ≥ 1
   - Clicks ≥ 1
   - `openedAt` / `lastOpenedAt` populated and coherent.
7. Confirm the counts returned by `messages/:emailId/stats` and the org `stats` endpoint reflect at least one open and one click (org-scoped).

### Flow B — Mailbox privacy (4 min)

1. Keep `User A`'s email in the inbox/sent list.
2. Sign out and sign in as `User B` (same org).
3. Open `Inbox`:
   - `User B` must NOT see `User A`'s private emails.
   - Privacy badges/hints should indicate per-user mailbox scope.
4. Send one tracked email as `User B`.
5. Sign back in as `User A` and confirm `User B`'s email is not visible.

### Flow C — Ownership safety (2 min)

1. Use an email record without an `ownerUserId` if one exists.
2. Trigger a tracking metrics refresh in `Inbox`.
3. Confirm no UI errors and that metrics still load for the current user.
4. Optional DB check: verify tracking rows carry the expected `organization_id` / `user_id`.

### Pass criteria

- Tracking events are reflected in UI metrics.
- No cross-user email visibility inside the same organization.
- No console/runtime errors during refresh and navigation.
- Inbox privacy UI clearly communicates mailbox scope.

### On failure

- Capture: user id, org id, email id, sent timestamp, failing step, and the response `x-request-id`.
- Check the runbook: [Mailbox privacy runbook](#email-mailbox-privacy-runbook).
- Escalate with screenshots + network logs + the correlation id.

---

_Last updated: 2026-06-11_
