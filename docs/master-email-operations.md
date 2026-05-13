# Email operations (master)

> Consolidated **2026-04-15**. Deliverability, mailbox privacy, release gates, and smoke testing for email features.

**Replaces:** email-deliverability-resend, email-mailbox-privacy-runbook, email-release-checklist, email-smoke-test-15min. Standalone `docs/email-deliverability.md` (Gmail / in-app outbound) is merged into [In-app outbound and Gmail](#in-app-outbound-and-gmail).

## Table of contents

- [Email deliverability (Resend)](#email-deliverability-resend)
- [BYO‑SMTP outbound (per organization)](#byo-smtp-outbound)
- [Transactional auth emails (velo-api)](#transactional-auth-emails)
- [In-app outbound and Gmail](#in-app-outbound-and-gmail)
- [Email mailbox privacy runbook](#email-mailbox-privacy-runbook)
- [Email release checklist](#email-release-checklist)
- [Email 15-minute smoke test](#email-smoke-test-15min)

---


<a id="transactional-auth-emails"></a>
## Transactional auth emails (velo-api)

Auth is now handled by velo-api (Fastify + PostgreSQL). Supabase Auth is no longer used for login/registration.

### Current state

- `POST /auth/forgot-password` creates a 1-hour reset token in `password_reset_tokens` table. **Email delivery not yet implemented** — SMTP/Resend integration is a pending blocker.
- `POST /auth/reset-password` consumes the token.

### Operator checklist (pending)

- [ ] Wire Resend (or SMTP) into velo-api `POST /auth/forgot-password` to send the reset link.
- [ ] HTML template for password reset email with branded design.
- [ ] Test email received for forgot-password flow.
- [ ] CTA button opens `{FRONTEND_URL}/reset-password?token=<token>`.
- [ ] Copy includes "ignore if you did not request this" language.
- [ ] SPF/DKIM/DMARC verified for sender domain.

### Acceptance criteria

- Reset email arrives within 60 seconds of request.
- Token in email link is valid for 1 hour and single-use.
- Renders cleanly in Gmail and Outlook web clients.

---

<a id="email-deliverability-resend"></a>
## Email deliverability (Resend)

Evidence for buyers and ops: domain authentication, alignment, and monitoring.

**Doc hub:** `docs/README.md` (status snapshot and full index).

## 1. DNS authentication

1. **SPF** — Publish the TXT records Resend provides for your sending domain / return-path subdomain.
2. **DKIM** — Complete domain verification in the Resend dashboard; install the DKIM TXT record(s).
3. **DMARC** — Start with a monitoring policy, then tighten:

   - Initial: `p=none` with aggregate reports (`rua=`).
   - Later: move toward `quarantine` or `reject` once SPF/DKIM are stable.

References: [Resend: email authentication for developers](https://resend.com/blog/email-authentication-a-developers-guide).

## 2. From / reply alignment

- [ ] `RESEND_FROM` in Supabase Edge Function env matches a verified domain in Resend.
- [ ] Optional: `RESEND_ALLOWED_REPLY_DOMAIN` set on the function to restrict `Reply-To` domains (see function code).
- [ ] Tracking links and open pixels use your Supabase function URLs; ensure link domains are consistent with your trust story.

## 3. Content and reputation

- [x] Send both **text** and **html** where possible (Velo sends `body` + `htmlBody` when provided).
- [ ] Bounce and complaint handling process defined (who monitors Resend dashboard).
- [ ] Warm-up plan for new dedicated IPs (if applicable — Resend shared infra is typical).

## 4. Evidence to attach for sales / security reviews

- [ ] Screenshot: Resend domain **Verified**.
- [ ] Screenshot or dig output: SPF + DKIM + DMARC TXT records live.
- [ ] Sample headers from a received message showing `spf=pass`, `dkim=pass`, `dmarc=pass` (mailbox dependent).

## Sign-off

| Role | Name | Date |
|------|------|------|
| Ops  |      |      |

---

<a id="in-app-outbound-and-gmail"></a>
## In-app outbound and Gmail

CRM-specific outbound and inbox behavior (complements the Resend DNS checklist above). Gmail OAuth users still need **SPF, DKIM, and DMARC** on the sending domain (see [Email deliverability (Resend)](#email-deliverability-resend)).

**Operator setup (Google Cloud OAuth client, Supabase Edge secrets, deploy, troubleshooting):** [`google-gmail-oauth-verification.md`](./google-gmail-oauth-verification.md#operator-setup-google-oauth). **What is still to do (Console, verification, Calendar product work):** [`Outstanding work`](./google-gmail-oauth-verification.md#outstanding-google-integration) in the same file.

### Production reliability gate (Google)

- **`create-org` fix (2026-04-29):** `create-org` Edge Function now uses `adminClient.auth.admin.updateUserById` to set JWT claims instead of the `set_claim` RPC, which was revoked from all roles by migration `20260427123000_security_rpc_execute_grants.sql`. Org creation was broken until this fix. `src/pages/OrgSetup.tsx` dead `/api/create-org` Vercel proxy fallback also removed.
- On every push to `master`, [`.github/workflows/supabase-remote-deploy.yml`](../.github/workflows/supabase-remote-deploy.yml) now applies DB migrations, sets required Google OAuth Edge secrets, deploys the full function set, and runs `npm run supabase:smoke:google-edge`.
- Smoke check script [`../scripts/verify-google-edge-health.mjs`](../scripts/verify-google-edge-health.mjs) verifies that `google-oauth-start`, `google-integration-status`, `gmail-oauth-exchange`, `gmail-refresh-token`, and `gmail-disconnect` are reachable at `functions/v1/*`.
- If required secrets are missing or endpoint checks fail, the workflow fails hard (release-blocking).

### What the app does

- **Gmail API sends** build MIME with `multipart/alternative` (plain + HTML) when HTML is present, which improves compatibility with spam filters compared with HTML-only payloads.
- **Hybrid inbox search:** Gmail `threads.list` receives a stripped query (CRM-only operators removed). Filters such as `is:tracked`, `is:opened`, `is:clicked`, and `in:mine` (thread owner in CRM) run client-side using CRM emails linked by `gmailThreadId`.

### What you must configure (domain and product)

- **SPF, DKIM, DMARC** on the domain you send from (Google Workspace for Gmail OAuth users, or your DNS when using Resend or another ESP).
- **Reputation:** avoid sudden high volume from a single mailbox; use the **communication_jobs** queue with spacing for bulk sends.
- **Marketing:** only queue contacts with `marketing_opt_in`; provide a real unsubscribe URL before adding `List-Unsubscribe` headers (future hardening).

### Limits

- Inbox placement is decided by recipients and providers; no client change guarantees avoiding spam or Promotions.

---


<a id="byo-smtp-outbound"></a>
## BYO‑SMTP outbound (per organization)

Velo can route outbound mail through an organization's own SMTP server in addition to Gmail OAuth and Resend. Use this when a customer must send "from" a verified corporate domain managed outside Resend (e.g., Microsoft 365, Google Workspace SMTP relay, AWS SES SMTP, Postmark SMTP, dedicated Postfix).

### Selection

Set `VITE_EMAIL_PROVIDER=smtp` in the deployment that should default to SMTP. Settings can be saved per‑org regardless of this flag, but only sends from the active provider go through `smtp-send-email`.

### Operator setup

1. Apply migration `20260512100000_email_smtp_settings.sql` — creates `public.email_smtp_settings` and the safe view `public.email_smtp_settings_public`.
2. Deploy Edge Function `smtp-send-email` (`supabase functions deploy smtp-send-email`).
3. Ensure existing Edge secrets are set on the project: `TOKEN_ENCRYPTION_KEY` (64 hex chars, shared with the Gmail token cipher), Supabase publishable/secret keys, and `EDGE_CORS_ORIGINS`.
4. Optional throttling secrets: `SMTP_RATE_MAX_PER_USER_PER_HOUR` (default 60) and `SMTP_RATE_MAX_PER_ORG_PER_HOUR` (default 500).

### What admins do in the app

In **Settings → Email → SMTP outbound (BYO)**, an org `owner` or `admin` enters:

- Host, port (587 default), username, password
- From address (must be valid) and optional From name + Reply‑To
- Security mode: `starttls` (port 587), `ssl` (port 465 implicit TLS) or `none` (testing only)

Hitting **Save** stores the row as the new active configuration; older rows are kept (`is_active = false`) for audit. The password is AES‑256‑GCM ciphertext (`base64(iv):base64(ciphertext)`) and never returned to the browser. Editing settings without retyping the password reuses the existing ciphertext.

Hitting **Send test** dispatches a small "SMTP test" message to a recipient of the admin's choice using the saved (or inline) credentials, and writes the outcome to `last_test_at` / `last_test_ok` / `last_test_error`.

### What happens on outbound send

`smtpEmailProvider` (`src/services/emailProviders/smtpEmailProvider.ts`) calls `smtp-send-email` with `action: send`. The function:

1. Authenticates the caller via the Supabase Bearer token.
2. Validates recipient/CC/BCC counts, subject length, body size, and attachment limits (max 10 attachments, 10 MB total).
3. Applies a rolling‑hour rate limit per user and per org.
4. Decrypts the stored password and sends via [`denomailer`](https://deno.land/x/denomailer).
5. Records the send in `audit_log` (`smtp_send_email`).

### Security notes

- Direct write access to `email_smtp_settings` is denied to end users — every mutation goes through the Edge Function with the service role key, which guarantees encryption before persistence.
- The Settings UI reads from the `email_smtp_settings_public` view which excludes `password_cipher`.
- Failed sends do **not** rotate the credentials automatically; admins must re‑enter the password if a provider rotates it.

---


<a id="email-mailbox-privacy-runbook"></a>
## Email mailbox privacy runbook

This runbook helps support and operations teams validate and troubleshoot per-user mailbox privacy in Velo.

## Document Control

- Status: Active
- Owner: Support/Ops
- Last updated: 2026-04-15
- Canonical: Yes

## Scope

- Inbox visibility for local CRM emails (`sent`, `scheduled`)
- Tracking visibility (opens/clicks) linked to local emails
- Thread workspace metadata privacy behavior
- User-scoped quick replies (`quick_replies`) visibility/editability

## Expected Behavior

- Each authenticated user only sees their own mailbox data.
- Tracking counters only include events for emails owned by the current user.
- Inbox header shows private mailbox scope.
- Settings Ops shows mailbox scope as private per user.
- Quick replies created by one user do not appear for other users.

## Quick Verification

1. Sign in as User A and send a tracked email.
2. Confirm email appears in User A `Sent`.
3. Sign in as User B in the same organization.
4. Confirm User B does not see User A local email in `Sent` / `Scheduled`.
5. Trigger or wait for tracking events.
6. Confirm User A sees updated counters and User B does not.

## Troubleshooting

### Issue: user sees no historical tracking after privacy rollout

- Cause: legacy rows may have `user_id` null.
- Action: open Inbox as the intended owner and trigger refresh.
- Expected: app invokes `backfill_email_tracking_user` and claims eligible legacy rows.

### Issue: cross-user visibility suspected

- Verify account context:
  - active authenticated user
  - active organization
- Verify data ownership fields:
  - local email `ownerUserId`
  - tracking tables `user_id`
- Verify RLS policies are user-scoped (`user_id = auth.uid()`).

### Issue: tracking events not updating

- Check tracking functions deployment:
  - `track-open`
  - `track-click`
- Verify events are stored with matching `user_id`.
- Re-run local mailbox refresh and confirm counters change.

<a id="email-openclick-analytics-inventory"></a>
## Email open/click analytics inventory

**Purpose (Ola B2):** single map from **UI → client helpers → Edge → Postgres** so “estimated” vs **server-backed** metrics stay honest.

| Layer | Responsibility | Key paths |
|-------|------------------|-----------|
| **Outbound HTML** | Rewrite links + inject open pixel | [`src/lib/emailTracking.ts`](../src/lib/emailTracking.ts) (`rewriteLinksForTracking`, `injectOpenPixel`, `normalizeBodyToHtml`) consumed when sending tracked mail from [`emailStore`](../src/store/emailStore.ts). |
| **Ingestion** | Stateless open/click endpoints | Supabase Edge `track-open`, `track-click` → `email_tracking_events` (see migrations + RLS in repo). |
| **Persistence** | Per-message/link rows + events | `email_tracking_messages`, `email_tracking_links`, `email_tracking_events` (user-scoped RLS — see [`.planning/CODEBASE.md` (Concerns)](../.planning/CODEBASE.md#codebase-concerns)). |
| **UI — Reports** | Shows **server** counts for the signed-in user’s sends | [`src/pages/Reports.tsx`](../src/pages/Reports.tsx); copy includes reliability note where applicable. |
| **Demo / mock** | Simulated opens/clicks | Contact detail actions in non-Supabase mode only — **not** recipient truth. |

**Future (optional):** org-wide manager rollups (RPC/materialized view), bot dedupe — tracked in Pro backlog / `CONCERNS.md`.

## Escalation Data

When escalating to backend, include:

- Organization id
- User id
- Email id(s)
- Event timestamps (open/click)
- Screenshot of Inbox mailbox privacy badges
- Confirmation of build/version currently deployed

---


<a id="email-release-checklist"></a>
## Email release checklist

Use this checklist before promoting CRM email changes to production.

## Document Control

- Status: Active
- Owner: QA/Ops
- Last updated: 2026-04-15
- Canonical: Yes

## Functional checks

- [ ] Compose flow works for `to`, `cc`, `bcc`, `reply-to`.
- [ ] Invalid recipient formats are blocked with clear feedback.
- [ ] `Ctrl/Cmd + Enter` sends correctly from composer.
- [ ] Subject presets and quick snippets insert as expected.
- [ ] Quick replies are persisted per user and editable.
- [ ] Sent and Scheduled folders render correctly.
- [ ] Inbox advanced filters and saved views work end-to-end.
- [ ] Inbox sync status badge transitions correctly (syncing/healthy/stale/error).
- [ ] Open/click tracking counters update after refresh.

## Privacy checks

Reproducible steps live in **[15-minute smoke test](#email-smoke-test-15min)** (Flow B + Flow C) and **[Mailbox privacy runbook](#email-mailbox-privacy-runbook)**. For release, confirm:

- [ ] Smoke test Flow B + C completed (no cross-user visibility; legacy backfill safe).
- [ ] Support has acknowledged the runbook escalation path.

## Backend checks

- [ ] `track-open` deployed and healthy.
- [ ] `track-click` deployed and healthy.
- [ ] Tracking tables include `user_id`.
- [ ] User-scoped RLS policies are active on tracking tables.
- [ ] User-scoped RLS policy is active on `gmail_thread_workspace`.

## QA/verification checks

- [x] Targeted regression tests pass:
  - `tests/stores/emailStore.trackingBatch.test.ts`
- [x] Production build passes:
  - `npm run build`
- [x] No new lint issues in touched files.

## Support readiness

- [x] Support team has runbook: [#email-mailbox-privacy-runbook](#email-mailbox-privacy-runbook)
- [ ] Ops knows expected mailbox behavior and escalation data required.

---


<a id="email-smoke-test-15min"></a>
## Email 15-minute smoke test

Purpose: quick manual validation for Inbox + tracking + per-user privacy before release.

## Document Control

- Status: Active
- Owner: QA/Support
- Last updated: 2026-04-15
- Canonical: Yes

## Preconditions (2 min)

- Two active users in the same organization (`User A`, `User B`).
- Email tracking functions deployed (`track-open`, `track-click`).
- A test lead/contact email reachable from the browser.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured.

## Flow A - Send + Tracking (6 min)

1. Sign in as `User A`.
2. Go to `Inbox` and send a tracked email to test recipient.
3. Confirm the email appears in sent list with tracking indicators.
4. Open the email from recipient inbox (loads tracking pixel).
5. Click one tracked link from the same email.
6. Back in CRM, run tracking refresh (or wait auto-refresh) and verify:
   - Opens >= 1
   - Clicks >= 1
   - `openedAt` and `lastOpenedAt` are populated and coherent.
7. Open **Reports** with a date range that includes today and confirm the **server-based** outbound email section shows at least one open and one click for `User A` (RLS: only your own sends appear there).

## Flow B - Mailbox Privacy (4 min)

1. Keep `User A` email in inbox/sent list.
2. Sign out and sign in as `User B` (same org).
3. Open `Inbox`:
   - `User B` must NOT see `User A` private emails.
   - Privacy badges/hints should indicate per-user mailbox scope.
4. Send one tracked email as `User B`.
5. Sign back as `User A` and confirm `User B` email is not visible.

## Flow C - Legacy Backfill Safety (2 min)

1. Use an older email record (without `ownerUserId`) if available.
2. Trigger tracking metrics refresh in `Inbox`.
3. Confirm no errors in UI and metrics still load for current user.
4. Optional DB check: verify `user_id` backfill on related tracking rows.

## Pass Criteria

- Tracking events are reflected in UI metrics.
- No cross-user email visibility inside same organization.
- No console/runtime errors during refresh and navigation.
- Inbox privacy UI clearly communicates mailbox scope.

## If Failure

- Capture: user id, org id, email id, sent timestamp, and failing step.
- Check runbook: [#email-mailbox-privacy-runbook](#email-mailbox-privacy-runbook).
- Escalate with screenshots + network logs + edge function request ids.
