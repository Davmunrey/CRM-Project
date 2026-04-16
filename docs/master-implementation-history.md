# Implementation history (master)

> Consolidated **2026-04-15**. Full chronological handoff (foundation Part A + delivery Part B).

**Replaces:** implementation-history-sections-01-12, implementation-history (Part B).

## Table of contents

- [Part A — Sections 1–12 (foundation)](#implementation-history-sections-01-12)
- [Part B — Sections 13–21 (recent waves)](#implementation-history)

---


<a id="implementation-history-sections-01-12"></a>
## Part A — Sections 1–12 (foundation)

Foundation through operational notes (platform, tenancy, auth, tracking, leads, i18n, SSO, tests, ops). **Companion:** [Part B in this same file](#implementation-history) (sections 13–21).

## Document control

- **Status:** Active  
- **Owner:** Engineering  
- **Last updated:** 2026-04-16  
- **Canonical:** Yes (together with Part B)  

This file is an **archive-stable** slice: it should change rarely. Prefer editing Part B for ongoing delivery narrative.

## 1) Platform and foundation

- React + TypeScript + Vite application architecture consolidated.
- Zustand stores standardized for domain data and UI state.
- Supabase integration established as primary persistence/auth/runtime backend.
- Build pipeline stabilized with passing production build (`npm run build`).

## 2) Multi-tenancy and organization model

- Tenant model implemented with organization-scoped data access:
  - `organizations`
  - `organization_members`
  - `organization_domains`
  - `organization_join_requests`
- `organization_id` propagation added to tenant-owned entities.
- RLS model enforced by tenant context and JWT claims.
- JWT helper functions and membership-driven claims update flow implemented:
  - `set_claim`
  - `get_org_id`
  - `get_user_role`
  - membership trigger path.
- Domain-based onboarding behavior implemented:
  - new domain => tenant provisioning
  - existing domain => invitation/join request flow.

## 3) Authentication and onboarding

- **User profile persistence (Supabase):** saving name, job title, phone, and avatar from the profile screen now calls `supabase.auth.updateUser` so `user_metadata` (e.g. `full_name`) survives logout/login. See **[User profile display names](./master-design-ui.md#user-profile-display-names)** for full register, manual test checklist, and remaining gaps (CRM rows that still store display names as plain text, admin-editing other users, etc.).
- Supabase auth session bootstrap integrated into app startup.
- Login/register/forgot/reset flows connected to Supabase.
- Protected route gate implemented with tenant-resolution routing:
  - dashboard access for ready tenant
  - `/org-access-required` for invite-required users
  - `/org-setup` for users without tenant assignment.
- Tenant resolution status state added to auth store for deterministic gating.

## 4) Organization setup reliability hardening

- Original `create-org` edge-function path hardened with explicit error surfaces.
- Added self-service SQL RPC fallback path for robust org creation:
  - `create_org_self_service(p_org_name, p_slug)`
  - `SECURITY DEFINER`
  - validation + duplicate protection + membership + claim updates.
- Org setup page updated to use RPC path and show actionable error messages.

## 5) Security hardening

- Supabase advisor warning remediation applied for mutable search paths.
- Migration added to set explicit `search_path` on sensitive helper functions:
  - `handle_updated_at`
  - `set_claim`
  - `get_org_id`
  - `get_user_role`
  - `handle_new_member`.

## 6) Email tracking (HubSpot-like baseline)

- Tracking data model implemented with Supabase tables for:
  - tracking messages
  - tracking links
  - tracking events.
- Edge functions implemented:
  - `track-open`
  - `track-click`
- Outbound email flow updated to inject open pixel + rewrite links.
- Inbox tracking metrics refresh pipeline implemented.
- Timestamp semantics corrected (`openedAt` oldest, `lastOpenedAt` newest).

## 7) Leads engine (Pro baseline)

- Leads domain introduced with persistence and scoring infrastructure:
  - `leads`
  - `lead_events`
  - `lead_scoring_rules`
  - `lead_score_snapshots`.
- Leads store implemented with:
  - filtering
  - event ingestion
  - score recomputation
  - scoring-rule sync/update.
- Lead conversion path implemented:
  - local fallback conversion
  - robust server-side conversion via `promote-lead` edge function.
- Leads UI shipped with:
  - list/inbox view
  - timeline panel
  - manual scoring actions
  - scoring rules editor.
- Score safety behavior introduced:
  - hot threshold feasibility tuning
  - anti-silent-demotion guardrail
  - optional demotion mode for manual recompute.
- Batch recomputation behavior introduced for tracking-event bursts.

## 8) Localization and i18n

- Multi-language support expanded and normalized for:
  - English
  - Spanish
  - Portuguese
  - French
  - German
  - Italian.
- Login language selection available at entry point.
- Leads page i18n completed (removed hardcoded UI strings).
- Smart Views localization normalized:
  - runtime label resolution by `nameKey`
  - one-shot migration for legacy seed view names by ID and name variants
  - FR/DE/IT legacy name coverage added.
- Custom fields i18n metadata architecture implemented:
  - localized labels/placeholders/options
  - values remain language-agnostic.

## 9) UI/UX consistency improvements

- Global layout alignment unified across primary and secondary pages:
  - removed inconsistent centered `max-w-* mx-auto` wrappers where required.
- Visual consistency pass applied to settings/team/profile/detail pages.
- SSO area added in login with provider-specific logos and loading states.

## 10) SSO and enterprise auth readiness

- Login now supports provider actions for:
  - Google OAuth
  - Azure OAuth
  - Apple OAuth
  - SAML 2.0 (domain-based).
- Frontend provider feature flags added:
  - `VITE_AUTH_GOOGLE_ENABLED`
  - `VITE_AUTH_AZURE_ENABLED`
  - `VITE_AUTH_APPLE_ENABLED`
  - `VITE_AUTH_SAML_ENABLED`.
- Optional backend-driven SAML domain discovery contract added:
  - `VITE_AUTH_SAML_DISCOVERY_ENDPOINT`
  - `POST { email } -> { domain }`.
- Backend handoff doc added at [Auth / SSO backend handoff](./master-security-compliance.md#auth-sso-backend-handoff).

## 11) Test and regression coverage additions

- Auth store tests extended for tenant resolution states.
- Custom fields i18n tests added.
- Email tracking helper tests added.
- Views legacy-localization migration regression test added.
- Email tracking batch recompute regression test added.

## 12) Operational notes

- Some auth/email behavior depends on Supabase project configuration:
  - provider enablement
  - SMTP provider and rate limits
  - SSO/SAML provider setup.
- If user sign-up is constrained by Supabase email limits, operational mitigation is:
  - custom SMTP setup
  - temporary user creation through admin channels for QA.

---


<a id="implementation-history"></a>
## Part B — Sections 13–21 (recent waves)

**Part B** is the active delivery narrative (sections 13–21). **Part A** (sections 1–12, including leads section 7) is [above in this same document](#implementation-history-sections-01-12).

## Document control

- **Status:** Active  
- **Owner:** Engineering  
- **Last updated:** 2026-04-16  
- **Canonical:** Yes (Part A + Part B together)  

## Contents

| Part | Location | Sections |
|------|----------|----------|
| **A** | [Anchor `#implementation-history-sections-01-12`](#implementation-history-sections-01-12) | 1–12: platform, tenancy, auth, org setup, security, email tracking, **leads**, i18n, UI, SSO, tests, ops notes |
| **B** | *below in this section* | 13–21 |

Cross-references elsewhere in the repo to **“section 19”**, **“section 21”**, etc. mean **Part B** in this file. References to **section 7** (leads baseline) mean **Part A** above.

## 13) Current status summary

- CRM is multi-tenant, auth-protected, localized, and production-build stable.
- Leads + tracking + conversion baseline is implemented and functioning.
- SSO UI and backend handoff contract are in place.
- **Workflow Automations v1** and **Lead Scoring v2** refinements are shipped (see section 21).
- Remaining PRO work is primarily **manager analytics**, **onboarding depth**, **API/webhooks**,
  enterprise governance, and integration breadth.

## 14) Lead maintenance observability and operations

- Backend-first lead score maintenance shipped and deployed:
  - edge function `lead-score-maintenance`
  - system-mode auth via `x-maintenance-secret` + `LEAD_MAINTENANCE_SECRET`
  - tenant-specific and all-tenant execution modes.
- Health and telemetry support added:
  - `mode=health` for recent run inspection
  - telemetry persisted in `lead_score_maintenance_runs`.
- SLA guardrail shipped:
  - `mode=sla` stale-tenant detection
  - optional manager/admin notifications with cooldown control.
- Operational scripts added for backend/scheduler integration:
  - `scripts/run-lead-maintenance.mjs`
  - `scripts/check-lead-maintenance-health.mjs`
  - `scripts/check-lead-maintenance-sla.mjs`
  - npm commands: `maintenance:lead:org`, `maintenance:lead:all`, `maintenance:lead:health`, `maintenance:lead:sla`.
- Settings Ops dashboard added:
  - tenant-scoped run visibility (last success, SLA state, recent errors, run list)
  - filter by run status
  - i18n coverage for EN/ES/PT (+ inherited FR/DE/IT).
- Operations runbook added:
  - incident handling, recovery procedures, and escalation checklist for maintenance SLA.
- Production handoff checklist added:
  - pre-go-live validation
  - go-live execution checks
  - post-go-live stabilization controls.
- Hardening matrix added:
  - risk-by-domain register with impact/likelihood/priority
  - owner and ETA planning for remaining hardening gaps.
- Compliance mapping added:
  - SOC2 / GDPR-lite control-to-implementation mapping
  - evidence references and 30-day compliance action plan.

## 15) Email privacy hardening (per-user mailbox)

- Mailbox privacy model hardened so each user sees/tracks only their own email telemetry.
- Tracking schema updated with explicit `user_id` ownership in:
  - `email_tracking_messages`
  - `email_tracking_links`
  - `email_tracking_events`.
- RLS policies tightened from organization-wide access to user-scoped access:
  - `user_id = auth.uid()` plus tenant guard (`organization_id = get_org_id()`).
- Gmail thread workspace access tightened to user scope to prevent cross-user visibility.
- Tracking edge functions updated to propagate `user_id` through open/click events.
- Frontend mailbox model updated with `ownerUserId` and scoped inbox rendering.
- Inbox UX now explicitly surfaces privacy scope:
  - private mailbox badges
  - owner visibility panel in local email detail.
- Legacy data continuity path added:
  - `backfill_email_tracking_user(text[])` RPC claims old tracking rows (`user_id IS NULL`)
    for the authenticated user in the active organization.

## 16) Navigation pack (Settings tabs + customizable sidebar)

- Settings now supports internal tab navigation with deep-link query params:
  - `general`, `branding`, `pipeline`, `email`, `permissions`, `data`, `navigation`, `advanced`.
- Sidebar moved toward a declarative renderer based on persisted preferences.
- Navigation preferences model added with sanitizer + defaults:
  - `sectionOrder`, `hiddenSections`, `itemOrderBySection`, `hiddenBuiltinItems`, `customGroups`.
- New preference store added with boot-time loading in app init flow.
- Advanced sidebar editor integrated into `Settings > Navigation` for:
  - section/item ordering and visibility
  - custom groups
  - role-based visibility
  - submenu-ready custom items.
- Supabase persistence path introduced via `navigation_preferences` (organization + user scoped).
- Canonical technical/deployment runbook: [Navigation + Settings sidebar](./master-design-ui.md#navigation-settings-sidebar-runbook).
- Support/ops runbook added: [Email mailbox privacy](./master-email-operations.md#email-mailbox-privacy-runbook).
- Email release gate checklist added: [Email release checklist](./master-email-operations.md#email-release-checklist).
- Guided smoke validation script added: [Email 15-minute smoke test](./master-email-operations.md#email-smoke-test-15min) for QA/support reproducible verification.

## 17) Email Ola 3 (productivity + reliability visibility)

- Inbox advanced filters expanded with high-impact operators:
  - attachment-only
  - owner-only
  - tracking-state refinements for local mailbox views.
- Inbox saved views added for reusable query/filter presets.
- Sync-state observability surfaced in Inbox:
  - healthy/syncing/stale/error status
  - last sync error detail visibility for operators.
- Settings now exposes provider-health summary cards for email operations.
- Quick replies moved from hardcoded snippets to user-persisted data model:
  - `quick_replies` table (user + org scoped)
  - composer consumes dynamic quick replies
  - template surface supports quick reply CRUD.

## 18) UI shell, design consistency, and documentation (April 2026)

- **Page shells:** Global utilities `.crm-page` and `.crm-page-full` in `src/index.css` standardize max width (~1800px) and responsive padding for list/settings pages vs full-height views (Deals, Inbox, Calendar, Sequences, Email templates).
- **Layout:** `main` uses `id="main-content"`, `min-h-0`, and smooth scrolling; skip-to-content link with i18n key `common.skipToMain`.
- **Shared UI:** `PanelEmpty` component for panel/sidebar empty states; `EmptyState` retained for larger areas; `SlideOver` / `Modal` body padding unified (`px-6 py-5`).
- **Auth surfaces:** Forgot/reset/register and org/invite flows aligned with `auth-page-bg`, optional blobs, and **branding** from `useSettingsStore` where applicable; Accept invite states use `glass` + primary actions via `Button` / `btn-gradient`.
- **Style cleanup:** Broader migration from `zinc-*` to `slate-*` / theme-aligned surfaces in shared components (e.g. `ActivityItem`, `SkeletonRow`, `Badge`, `SearchBar`, `ErrorBoundary`, `Avatar`); `focus-visible` rings on `Input`, `Select`, `Textarea`, and key chrome buttons.
- **Headings:** Calendar and templates/sequences list screens avoid duplicate `h1` where the Topbar already names the route.
- **Canonical doc:** [Design system and layout](./master-design-ui.md#design-system-and-layout) (indexed from [README](./README.md)).

## 19) Sell-ready external + internal hardening (April 2026)

- **Outbound email (Edge):** `resend-send-email` hardened with payload limits, MIME allowlist, attachment size caps, optional sender/reply domain policy, per-user (and optional per-org) rate limits, structured logs, and post-success audit where service role is available.
- **Production auth / channels:** `VITE_APP_CHANNEL` (`production` \| `staging` \| `demo` \| local `development`); `vite build` requires Supabase env for **production** and **staging**; **demo** allows offline mock bundles. Runtime fail-closed via `isBootstrapFatalError` except hosted `demo`. Local mock: `VITE_ALLOW_DEMO_MODE`; hosted mock: `VITE_APP_CHANNEL=demo` (`src/lib/envChannel.ts`, `src/lib/supabase.ts`, `vite.config.ts`).
- **Auth persistence:** Zustand `partialize` / `merge` no longer restore demo `users` / `passwords` maps when Supabase is configured.
- **Email truthfulness:** Outbound messages transition to `sent` only after provider success; failures use `failed` + `sendError` and `email_send_failed` audit where applicable.
- **Tests / CI:** Vitest timeouts and deterministic worker policy in `vite.config.ts`; `npm audit --audit-level=critical` in `.gitea/workflows/ci.yml` and `.github/workflows/ci.yml`.
- **Documentation:** [Sell-ready evidence index](./master-security-compliance.md#sell-ready-security-evidence-index), [Supabase external hardening checklist](./master-security-compliance.md#supabase-external-hardening-checklist), [Email deliverability](./master-email-operations.md#email-deliverability-resend), [DSAR playbook](./master-security-compliance.md#dsar-playbook), [Data retention runbook](./master-lead-management.md#data-retention-runbook); [Compliance mapping](./master-security-compliance.md#compliance-mapping) and [Gitea operations](./master-security-compliance.md#gitea-operations) updated for evidence and branch-protection notes.

## 20) Sell-ready product baseline — archived two-week sprint (Q2 2026)

The following sprint targeted the first **sell-ready product** baseline (heterogeneous tenants). It is **complete**; see [Go / No-Go — sell-ready baseline](./master-release-qa.md#go-no-go-sell-ready-baseline). This section preserves acceptance detail; active backlog is [Pro backlog](./master-roadmap-backlog.md#pro-backlog).

### Goal

Ship the first sell-ready baseline for heterogeneous companies with measurable acceptance criteria.

### Sprint 1 (Week 1) — P0 foundation

- **Story: Remove hardcoded UI text in critical workflows** — Done. Scope: contacts, companies, deals, activities, auth, settings primary forms/modals. Acceptance: EN/ES/PT i18n keys, no mixed-language UI, regression on create/edit flows.
- **Story: Locale-aware formatting baseline** — Done. Scope: date/time, currency, number helpers. Acceptance: `en/es/pt` rendering, currency respects org + locale, formatter unit tests.
- **Story: Pipeline naming configurability (MVP)** — Done. Scope: per-tenant labels for key nouns/stages. Acceptance: rename from Settings, labels in list/board/detail, safe fallback.

### Sprint 2 (Week 2) — commercialization controls

- **Story: RBAC profile presets + matrix editor (MVP)** — Done. Presets Admin/Manager/Rep/Read-only; clone/edit/assign; permission changes audited.
- **Story: White-label starter** — Done. Logo, color, app name, domain, legal links; persisted per org; reset path.
- **Story: Release readiness and QA gate** — Done. Sell-ready checklist, QA evidence EN/ES/PT + roles, go/no-go linked.

### Definition of done (that cycle)

- Critical journey EN/ES/PT (login, create contact/company/deal/activity, reports) per QA + release checklist.
- Tenant customizable labels and basic branding; permission presets production-like; QA + release notes in [README](./README.md) and linked masters.

### Execution board snapshot (all done)

- i18n audit + locale wrappers + formatter tests; pipeline settings + dynamic labels; RBAC model, assignment UI, audit logging; white-label model + UI; release checklist + QA evidence template workstreams closed.

## 21) Workflow Automations v1 and Lead Scoring v2 (2026)

- **Automations v1:** execution logs persisted (status/errors); trigger evaluation on lead/deal transitions; actions for create-activity, assign owner, internal notification paths.
- **Lead Scoring v2:** recency decay on events; structured reason metadata in score snapshots; confidence threshold strategy for hot vs cold classification.
- **Backlog / roadmap:** execution board entries for these tracks are closed; forward scope is in [Pro backlog](./master-roadmap-backlog.md#pro-backlog) and phase deliverables in [Pro roadmap 30–60–90](./master-roadmap-backlog.md#pro-roadmap-30-60-90).
