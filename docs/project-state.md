# Project state: two layers of truth

This file **bridges** the long-form product/engineering docs in `docs/master-*.md` and the **milestone tracker** under [`.planning/`](../.planning/) (phases, `DEPLOY-*` requirements, `STATE.md`).

## When to read what

| Need | Primary source | Notes |
|------|----------------|--------|
| v1.0 phase completion, next phase gate, session notes | [`.planning/STATE.md`](../.planning/STATE.md), [`.planning/ROADMAP.md`](../.planning/ROADMAP.md) | Engineering milestone view (Phases 1–10). |
| Checked requirements IDs (`AUTH-*`, `DEPLOY-*`, …) | [`.planning/REQUIREMENTS.md`](../.planning/REQUIREMENTS.md) | Single checklist for v1 scope. |
| **Pro** roadmap (30/60/90), execution backlog, GTM matrix | [`master-roadmap-backlog.md`](./master-roadmap-backlog.md) | Product horizon beyond the v1 phase list. |
| What shipped, in narrative form (Parts A + B) | [`master-implementation-history.md`](./master-implementation-history.md) | Archive-stable Part A; active Part B (sections 13–21). |
| Go-live, QA matrices, production handoff | [`master-release-qa.md`](./master-release-qa.md) | Especially [Production handoff checklist](master-release-qa.md#production-handoff-checklist). |
| Auth/SSO contracts, evidence index, Supabase external checklist | [`master-security-compliance.md`](./master-security-compliance.md) | Includes OAuth redirect / CORS reminders. |
| Lead maintenance jobs, retention, ops | [`master-lead-management.md`](./master-lead-management.md) | Edge function `lead-score-maintenance`, runbooks. |
| Resend/DNS, mailbox privacy, email smoke | [`master-email-operations.md`](./master-email-operations.md) | Deliverability + release gates for mail. |
| Layout shells, navigation, profile display names | [`master-design-ui.md`](./master-design-ui.md) | UI conventions for new screens. |

**Rule of thumb:** if the question is *“is v1 Phase 10 done?”* start in **`.planning/`**. If it is *“what do we build next for Pro?”* start in **`master-roadmap-backlog`**.

---

## v1 release / hosting (vendor-neutral)

`.planning/REQUIREMENTS.md` still lists `DEPLOY-01`–`DEPLOY-05` with example filenames from one host; the **intent** is:

1. **SPA routing** — every client-side route must resolve to the built `index.html` on cold load (configure the static host or reverse proxy accordingly). **Repo examples:** [`vercel.json`](../vercel.json), [`public/_redirects`](../public/_redirects) — explained in [`docs/deployment-spa-and-env.md`](./deployment-spa-and-env.md).
2. **Build-time env** — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` per environment (production vs preview/staging), aligned with [`src/lib/supabase.ts`](../src/lib/supabase.ts). See [`docs/deployment-spa-and-env.md`](./deployment-spa-and-env.md) and [`.env.example`](../.env.example).
3. **Preview ↔ Supabase** — preview origins and OAuth redirects must match Supabase Auth allowlists and any Edge Function CORS (see research in `.planning/research/` if present).
4. **Production pipeline** — deploy from protected `main` (or your release branch) with a recorded smoke pass — [`docs/smoke-checklist-production.md`](./smoke-checklist-production.md).
5. **Custom domain + TLS** — DNS and certificate as required by your provider.

**Gmail verification kickoff:** [`docs/google-gmail-oauth-verification.md`](./google-gmail-oauth-verification.md).

Operational detail for env vars and schedulers overlaps [`master-release-qa.md` — Production handoff](./master-release-qa.md#production-handoff-checklist).

---

## Gaps (not fully owned by a single master today)

Track these explicitly until each is either implemented or moved into the right master.

| Gap | Why it matters | Where to track / fix |
|-----|----------------|----------------------|
| **Google Cloud: restricted-scope verification** (Gmail APIs for production users) | Long lead time (weeks); blocks trustworthy Gmail outside test users | [`.planning/STATE.md`](../.planning/STATE.md) Notes; align Supabase Auth + Google Cloud Console with Edge Functions `gmail-oauth-exchange` / refresh flow. |
| **Org-wide member identity in UI** (email/name for peers) | Team pages and assignee pickers need an RLS-safe source beyond `organization_members` alone | **Shipped:** RPC `list_organization_members_with_identity` (migration `20260415120000_*`) + [`authStore.fetchOrgUsers`](../src/store/authStore.ts). Planning context: [`.planning/codebase/CONCERNS.md`](../.planning/codebase/CONCERNS.md). UX: [`master-design-ui.md` — User profile](./master-design-ui.md#user-profile-display-names). |
| **Email open/click “truth” for analytics** | Server tracking exists, but product-level reporting may still be “demo depth” per concerns audit | [`.planning/codebase/CONCERNS.md`](../.planning/codebase/CONCERNS.md); implementation context: [`master-implementation-history.md`](./master-implementation-history.md) Part A §6 + Part B §15–17. |
| **Residual research docs naming one host** | Older notes may still say “Vercel” while requirements are neutral | Prefer `.planning/research/deploy-testing.md` as **optional** reference; canonical DEPLOY wording is `.planning/REQUIREMENTS.md` + Phase 10 in `ROADMAP.md`. |

---

## Codebase map (for doc authors)

- App entry and data bootstrap: `src/App.tsx`, `src/hooks/useDataInit.ts`, `src/lib/realtimeSubscriptions.ts`.
- Supabase client gate: `src/lib/supabase.ts`.
- Planning artifacts: `.planning/PROJECT.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/CONVENTIONS.md` (UI canon points at `master-design-ui`).

---

*Last updated: 2026-04-15 — deployment artifacts (`vercel.json`, `public/_redirects`), deploy/Gmail/smoke docs, org-member RPC + `fetchOrgUsers` hydration; gaps table updated for member identity.*
