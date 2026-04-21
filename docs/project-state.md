# Project state: two layers of truth

This file **bridges** the long-form product/engineering docs in `docs/master-*.md` and the **milestone tracker** under [`.planning/`](../.planning/) (phases, `DEPLOY-*` requirements, `STATE.md`).

## When to read what

| Need | Primary source | Notes |
|------|----------------|--------|
| v1.0 phase completion, next phase gate, session notes | [`.planning/STATE.md`](../.planning/STATE.md), [`.planning/ROADMAP.md`](../.planning/ROADMAP.md) | Engineering milestone view (Phases 1–10). |
| Checked requirements IDs (`AUTH-*`, `DEPLOY-*`, …) | [`.planning/REQUIREMENTS.md`](../.planning/REQUIREMENTS.md) | Single checklist for v1 scope. |
| **Pro** roadmap (30/60/90), execution backlog, GTM matrix | [`master-roadmap-backlog.md`](./master-roadmap-backlog.md) | Product horizon beyond the v1 phase list. |
| Pipedrive parity, webhooks/API spec, group killer gaps | [`master-pipedrive-crm-pro-comparison.md`](./master-pipedrive-crm-pro-comparison.md) | Benchmark + v1 webhook acceptance criteria + interview template. |
| What shipped, in narrative form (Parts A + B) | [`master-implementation-history.md`](./master-implementation-history.md) | Archive-stable Part A; active Part B (sections 13–24). |
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
2. **Build-time env** — `VITE_APP_CHANNEL` (`production` \| `staging` \| `demo`) plus `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` where required; see [`src/lib/envChannel.ts`](../src/lib/envChannel.ts), [`src/lib/supabase.ts`](../src/lib/supabase.ts), and [`vite.config.ts`](../vite.config.ts). Canonical copy: [`docs/deployment-spa-and-env.md`](./deployment-spa-and-env.md) and [`.env.example`](../.env.example).
3. **Preview ↔ Supabase** — set **`VITE_APP_CHANNEL=staging`** on preview builds and point keys at a **non-production** Supabase project; add preview origins and OAuth redirects to Supabase Auth allowlists and Edge Function CORS (see research in `.planning/research/` if present).
4. **Production pipeline** — deploy from protected `main` (or your release branch) with a recorded smoke pass — [`docs/smoke-checklist-production.md`](./smoke-checklist-production.md).
5. **Custom domain + TLS** — DNS and certificate as required by your provider.

**Gmail verification kickoff:** [`docs/google-gmail-oauth-verification.md`](./google-gmail-oauth-verification.md).

Operational detail for env vars and schedulers overlaps [`master-release-qa.md` — Production handoff](./master-release-qa.md#production-handoff-checklist).

---

## Gaps (not fully owned by a single master today)

Track these explicitly until each is either implemented or moved into the right master.

| Gap | Why it matters | Where to track / fix |
|-----|----------------|----------------------|
| **Google Cloud: restricted-scope verification** (Gmail APIs for production users) | Long lead time (weeks); blocks trustworthy Gmail outside test users | [`.planning/STATE.md`](../.planning/STATE.md) Notes; **redirect checklist:** [`google-gmail-oauth-verification.md`](./google-gmail-oauth-verification.md) (Gmail callback URIs per origin); align Google Cloud OAuth client + Edge Functions `gmail-oauth-exchange` / refresh flow. |
| **Org-wide member identity in UI** (email/name for peers) | Team pages and assignee pickers need an RLS-safe source beyond `organization_members` alone | **Shipped:** RPC `list_organization_members_with_identity` (migration `20260415120000_*`) + [`authStore.fetchOrgUsers`](../src/store/authStore.ts). Planning context: [`.planning/codebase/CONCERNS.md`](../.planning/codebase/CONCERNS.md). UX: [`master-design-ui.md` — User profile](./master-design-ui.md#user-profile-display-names). |
| **Email open/click “truth” for analytics** | Server path: Edge `track-open` / `track-click` → `email_tracking_events` (RLS per sender). **Reports** surfaces server counts for the signed-in user; org-wide manager rollups still future work. | [`.planning/codebase/CONCERNS.md`](../.planning/codebase/CONCERNS.md); [`master-implementation-history.md`](./master-implementation-history.md) Part A §6 + Part B §15–17; Reports UI + [`master-email-operations.md`](./master-email-operations.md). |
| **Residual research docs naming one host** | Older notes used a single vendor while `DEPLOY-*` intent is neutral | `.planning/research/deploy-testing.md` was **neutralized** (2026-04-16) and points to [`docs/deployment-spa-and-env.md`](./deployment-spa-and-env.md). Canonical DEPLOY wording remains `.planning/REQUIREMENTS.md` + Phase 10 in `ROADMAP.md`. |
| **Pipedrive / group integration parity** (outbound webhooks, public API) | Blocks ERP, RevOps, and iPaaS expectations when the group compares CRM Pro to Pipedrive | **Spec + matrix:** [`master-pipedrive-crm-pro-comparison.md`](./master-pipedrive-crm-pro-comparison.md) · **Execution:** [`master-roadmap-backlog.md`](./master-roadmap-backlog.md) (API + Webhooks) · **Audit:** [`.planning/codebase/INTEGRATIONS.md`](../.planning/codebase/INTEGRATIONS.md). Remove or shrink this gap row when product webhooks ship and the master is updated. |

---

## Codebase map (for doc authors)

- App entry, lazy routes, and Suspense: `src/App.tsx`.
- Data bootstrap, visibility-aware polling, and realtime: `src/hooks/useDataInit.ts`, `src/lib/realtimeSubscriptions.ts`.
- `date-fns` locale loading: `src/lib/dateFnsLocale.ts`, `src/hooks/useDateLocale.ts`.
- Chart theming (CSS variables → Recharts): `src/lib/chartTheme.ts`.
- Deploy channel + Supabase client gate: `src/lib/envChannel.ts`, `src/lib/supabase.ts`.
- Build splitting: `vite.config.ts` (`manualChunks` for heavy chart/date libraries).
- Planning artifacts: `.planning/PROJECT.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/CONVENTIONS.md` (UI canon points at `master-design-ui`).

---

*Last updated: 2026-04-20 — Pipedrive comparison master ([`master-pipedrive-crm-pro-comparison.md`](./master-pipedrive-crm-pro-comparison.md)), new gap row for integration parity, and prior 2026-04-18 UI quality pass notes in [`master-implementation-history.md`](./master-implementation-history.md#implementation-history-section-24) / [`master-design-ui.md`](./master-design-ui.md#main-canvas-and-responsive-shell).*

---

*Last updated (git): **2026-04-20***
