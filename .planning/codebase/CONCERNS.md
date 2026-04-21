# Codebase Concerns

**Analysis Date:** 2026-04-21

---

## Current High-Priority Risks

### Deployment Hardening Not Closed Yet
- Issue: Phase 10 release hardening remains open (hosting/env/domain checklist).
- Impact: App works locally, but production rollout risk remains until deployment/UAT is fully closed.
- Next step: complete static hosting + env + smoke checklist and lock the release runbook (`docs/master-release-qa.md`, `docs/project-state.md`).

### Team Directory Still Partially Session-Scoped
- Issue: Team/user lists can still be partially influenced by session-scoped store state in some UX flows.
- Impact: Potential mismatch between organization members and UI assignment options in edge cases.
- **Update (2026-04-15):** `list_organization_members_with_identity` RPC + `authStore.fetchOrgUsers` now hydrate peer email/display name from `auth.users` (org-scoped via JWT). Remaining risk: selectors that never call `fetchOrgUsers` after local mutations — audit assignee pickers on change.

### Email tracking — server path vs legacy local simulation
- **Shipped:** Edge Functions `track-open` / `track-click` persist to `email_tracking_events`; outbound sends with tracking insert `email_tracking_messages` / `email_tracking_links` ([`emailStore`](../../src/store/emailStore.ts)). Inbox refresh hydrates counts from the server.
- **Product nuance:** Per-user RLS on tracking tables means **Reports** shows server opens/clicks **for the signed-in user’s sends only** — not an org-wide dashboard yet.
- **Demo / offline:** Contact detail “simulate open/click” buttons only apply in mock (non-Supabase) mode; they do not represent recipient behavior in production.
- **Next step (optional):** manager/org rollup RPC or materialized view for cross-rep reporting; dedupe bot opens if needed.

---

## Security Posture Notes

- Gmail refresh tokens are server-side only (`gmail_tokens`); browser holds only short-lived access tokens.
- OAuth exchange/refresh is isolated to Edge Functions.
- UI still depends on client-side keys for selected AI workflows; keep this explicit in product/security docs.
- Continue enforcing accessibility/lint quality gates on touched files.

---

## Maintainability Watchlist

- Large route files (`Deals`, `Settings`, `Calendar`, etc.) still concentrate multiple concerns.
- Incremental extraction into focused components is recommended before major feature additions.
- Keep docs aligned after each phase to avoid stale historical assumptions leaking into active docs.

---

*Concerns audit: 2026-04-10; email tracking subsection refreshed 2026-04-16 (Ola B — server telemetry + Reports + RLS scope); document-control pass 2026-04-21.*
---

*Last updated (git): **2026-04-21***
