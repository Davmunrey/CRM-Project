# Codebase Concerns

**Analysis Date:** 2026-04-10

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

### Email Tracking Is Demo-Level
- Issue: Open/click tracking is still local/demo oriented and not backed by reliable server telemetry.
- Impact: Metrics can be misleading for production sales reporting.
- Next step: add server-side event ingestion (pixel/webhook) and persist counters in Supabase.

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

*Concerns audit: 2026-04-10*
