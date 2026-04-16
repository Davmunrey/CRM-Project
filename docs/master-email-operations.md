# Email operations (master)

> Consolidated **2026-04-15**. Deliverability, mailbox privacy, release gates, and smoke testing for email features.

**Replaces:** email-deliverability-resend, email-mailbox-privacy-runbook, email-release-checklist, email-smoke-test-15min.

## Table of contents

- [Email deliverability (Resend)](#email-deliverability-resend)
- [Email mailbox privacy runbook](#email-mailbox-privacy-runbook)
- [Email release checklist](#email-release-checklist)
- [Email 15-minute smoke test](#email-smoke-test-15min)

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

- [ ] Send both **text** and **html** where possible (CRM Pro sends `body` + `htmlBody` when provided).
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


<a id="email-mailbox-privacy-runbook"></a>
## Email mailbox privacy runbook

This runbook helps support and operations teams validate and troubleshoot per-user mailbox privacy in CRM Pro.

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
| **Persistence** | Per-message/link rows + events | `email_tracking_messages`, `email_tracking_links`, `email_tracking_events` (user-scoped RLS — see [`CONCERNS.md`](../.planning/codebase/CONCERNS.md)). |
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

- [ ] Targeted regression tests pass:
  - `tests/stores/emailStore.trackingBatch.test.ts`
- [ ] Production build passes:
  - `npm run build`
- [ ] No new lint issues in touched files.

## Support readiness

- [ ] Support team has runbook: [#email-mailbox-privacy-runbook](#email-mailbox-privacy-runbook)
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
