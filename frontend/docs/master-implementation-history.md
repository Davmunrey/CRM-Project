# Implementation history (master)

> Consolidated **2026-04-18**. Full chronological handoff (foundation Part A + delivery Part B).

**Replaces:** implementation-history-sections-01-12, implementation-history (Part B).

## Table of contents

- [Part A — Sections 1–12 (foundation)](#implementation-history-sections-01-12)
- [Part B — Sections 13–28 (recent waves)](#implementation-history)
- [Chronological index (oldest → newest)](#chronological-index-oldest--newest)

---

<a id="chronological-index-oldest--newest"></a>
## Chronological index (oldest → newest)

Approximate delivery dates for quick scanning. **Section numbers (1–12 in Part A, 13–30 in Part B) stay the canonical reading order** in the body below; this table only supports time-based discovery (anchors match Part B ids where present).

| Date | Section | Summary |
|------|---------|---------|
| 2026-03-31 | [Part A — §1–12](#implementation-history-sections-01-12) | Foundation: platform through operational notes (tenancy, auth, tracking, leads, i18n, SSO, tests). |
| 2026-05-18 | [§30](#implementation-history-section-30) | **Monorepo restructure:** n0crm-api merged into api/ subdirectory; frontend moved to frontend/; root docker-compose.yml; auth hardening (JWT HS256 pinning, SHA-256 reset tokens, bcrypt constant-time, rate-limit on reset, non-root Docker, CORS hardening, impersonation audit). |
| 2026-04-10 | [§13](#implementation-history-section-13) | Current status snapshot — multi-tenant CRM baseline. |
| 2026-04-10 | [§14](#implementation-history-section-14) | Lead maintenance observability, ops dashboard, SLAs, and runbooks. |
| 2026-04-10 | [§15](#implementation-history-section-15) | Email privacy hardening (per-user mailbox, RLS, tracking ownership). |
| 2026-04-10 | [§16](#implementation-history-section-16) | Navigation pack (Settings tabs, customizable sidebar, preferences persistence). |
| 2026-04-10 | [§17](#implementation-history-section-17) | Email Ola 3 — Inbox filters, saved views, sync observability, quick replies. |
| 2026-04-12 | [§18](#implementation-history-section-18) | UI shell, design consistency, and documentation (April 2026). |
| 2026-04-13 | [§19](#implementation-history-section-19) | Sell-ready external + internal hardening (April 2026). |
| 2026-04-14 | [§20](#implementation-history-section-20) | Sell-ready product baseline — archived two-week sprint (Q2 2026). |
| 2026-04-14 | [§21](#implementation-history-section-21) | Workflow Automations v1 and Lead Scoring v2 (2026). |
| 2026-04-15 | [§22](#implementation-history-section-22) | Ola C — information consistency (i18n waves, QA template, backlog sequencing, research neutrality). |
| 2026-04-16 | [§23](#implementation-history-section-23) | Manager Dashboard Pack + onboarding (`/manager`, checklist, UX telemetry). |
| 2026-04-18 | [§24](#implementation-history-section-24) | Cross-cutting UI quality pass — tokens, responsive shell, a11y, performance, i18n hygiene. |
| 2026-04-21 | [§25](#implementation-history-section-25) | Entity list UX — Deals toolbar, saved/distribution lists (Contacts & Companies), lead delete reliability, `companies:export`, i18n keys. |
| 2026-04-21 | [§26](#implementation-history-section-26) | Integration fabric: webhook DELETE payload parity, `listFailedOutbox` / `replayOutbox`, Edge Functions `api-keys`, `crm-public-api`, `lead-capture`, `lead-capture-tokens`; Settings tab **API & capture** + webhooks failed-queue UI; `npm run supabase:deploy:integrations` / `supabase:deploy:all-edge`. |
| 2026-04-22 | [§27](#implementation-history-section-27) | API & capture hardening: idempotent delete contracts, standardized error payloads (`error/code/status/request_id`), structured Edge logs, requestId propagation, resilient Settings feedback, Playwright smoke coverage, and English runbooks. |
| 2026-04-22 | [§28](#implementation-history-section-28) | Supabase-only SPA shell: remove offline/mock demo paths and SSO buttons; default settings from `defaultAppSettings.ts`; strong password UX (`SecurePasswordField`, `src/lib/securePassword.ts`, Team + auth forms); workspace host mismatch effect uses primitive deps; memoized `GmailTokenContext` value; **Dashboard** onboarding flags read `byOrg[id]` + `useMemo` (never `getFlags()` inside a Zustand selector — new object per tick caused React maximum update depth after login). |
| 2026-05-15 | [§29](#implementation-history-section-29) | Quality audit + LinkedIn enrichment: 35-page frontend audit, Supabase bypass fix (sbDelete → api.delete), double-invite fix, CSVImport assignedTo fix, LinkedIn enrichment (migration 012, backend + frontend), full .md documentation sweep. |

---


<a id="implementation-history-sections-01-12"></a>
## Part A — Sections 1–12 (foundation)

Foundation through operational notes (platform, tenancy, auth, tracking, leads, i18n, SSO, tests, ops). **Companion:** [Part B in this same file](#implementation-history) (sections 13–28).

## Document control

- **Status:** Active  
- **Owner:** Engineering  
- **Last updated:** 2026-04-22  
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
## Part B — Sections 13–28 (recent waves)

**Part B** is the active delivery narrative (sections 13–28). **Part A** (sections 1–12, including leads section 7) is [above in this same document](#implementation-history-sections-01-12).

## Document control

- **Status:** Active  
- **Owner:** Engineering  
- **Last updated:** 2026-04-22  
- **Canonical:** Yes (Part A + Part B together)  

## Contents

| Part | Location | Sections |
|------|----------|----------|
| **A** | [Anchor `#implementation-history-sections-01-12`](#implementation-history-sections-01-12) | 1–12: platform, tenancy, auth, org setup, security, email tracking, **leads**, i18n, UI, SSO, tests, ops notes |
| **B** | *below in this section* | 13–30 |

Cross-references elsewhere in the repo to **”section 19”**, **”section 21”**, etc. mean **Part B** in this file. References to **section 7** (leads baseline) mean **Part A** above. Section 30 (monorepo restructure, 2026-05-18) is the most recent addition to Part B.

<a id="implementation-history-section-13"></a>
## 13) Current status summary

- CRM is multi-tenant, auth-protected, localized, and production-build stable.
- Leads + tracking + conversion baseline is implemented and functioning.
- SSO UI and backend handoff contract are in place.
- **Workflow Automations v1** and **Lead Scoring v2** refinements are shipped (see section 21).
- **Manager Dashboard Pack** and **workspace onboarding** (checklist + home banner) are shipped (see section 23).
- **April 2026 UI quality pass** (tokens, responsive shell, accessibility, performance, i18n hygiene) is shipped (see section 24).
- Remaining PRO work is primarily **API/webhooks**, enterprise governance, and integration breadth.

<a id="implementation-history-section-14"></a>
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

<a id="implementation-history-section-15"></a>
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

<a id="implementation-history-section-16"></a>
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

<a id="implementation-history-section-17"></a>
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

<a id="implementation-history-section-18"></a>
## 18) UI shell, design consistency, and documentation (April 2026)

- **Page shells:** Global utilities `.crm-page` and `.crm-page-full` in `src/index.css` standardize max width (~1800px) and responsive padding for list/settings pages vs full-height views (Deals, Inbox, Calendar, Sequences, Email templates).
- **Layout:** `main` uses `id="main-content"`, `min-h-0`, and smooth scrolling; skip-to-content link with i18n key `common.skipToMain`.
- **Shared UI:** `PanelEmpty` component for panel/sidebar empty states; `EmptyState` retained for larger areas; `SlideOver` / `Modal` body padding unified (`px-6 py-5`).
- **Auth surfaces:** Forgot/reset/register and org/invite flows aligned with `auth-page-bg`, optional blobs, and **branding** from `useSettingsStore` where applicable; Accept invite states use `glass` + primary actions via `Button` / `btn-gradient`.
- **Style cleanup:** Broader migration from `zinc-*` to `slate-*` / theme-aligned surfaces in shared components (e.g. `ActivityItem`, `SkeletonRow`, `Badge`, `SearchBar`, `ErrorBoundary`, `Avatar`); `focus-visible` rings on `Input`, `Select`, `Textarea`, and key chrome buttons.
- **Headings:** Calendar and templates/sequences list screens avoid duplicate `h1` where the Topbar already names the route.
- **Canonical doc:** [Design system and layout](./master-design-ui.md#design-system-and-layout) (indexed from [README](./README.md)).

<a id="implementation-history-section-19"></a>
## 19) Sell-ready external + internal hardening (April 2026)

- **Outbound email (Edge):** `resend-send-email` hardened with payload limits, MIME allowlist, attachment size caps, optional sender/reply domain policy, per-user (and optional per-org) rate limits, structured logs, and post-success audit where service role is available.
- **Production auth / channels:** `vite build` gates **production** and **staging** on valid Supabase env vars; local dev defaults to **`development`**. **Current model (see [§28](#implementation-history-section-28)):** no `demo` channel and no `VITE_ALLOW_DEMO_MODE` mock CRM — `dataRuntime` is `supabase` \| `unconfigured` (`src/lib/envChannel.ts`, `src/lib/supabase.ts`, `vite.config.ts`).
- **Auth persistence:** Zustand `partialize` / `merge` do not restore local-only credential maps when Supabase owns the session.
- **Email truthfulness:** Outbound messages transition to `sent` only after provider success; failures use `failed` + `sendError` and `email_send_failed` audit where applicable.
- **Tests / CI:** Vitest timeouts and deterministic worker policy in `vite.config.ts`; `npm audit --audit-level=critical` in `.gitea/workflows/ci.yml` and `.github/workflows/ci.yml`.
- **Edge public surfaces + webhooks (follow-up, 2026-04-22):** `crm-public-api` / `lead-capture` — explicit column selects, in-memory rate limits, optional CORS via **`EDGE_CORS_ORIGINS`**, bounded bodies, generic JSON errors to clients; **`webhook-worker`** — URL validation against private/reserved targets and safe custom-header policy before outbound `fetch` (`_shared/webhook-url-safety.ts`, `_shared/webhook-safe-headers.ts`). **`api-keys`**, **`lead-capture-tokens`**, Google/Gmail, and public read/capture endpoints share **`_shared/cors-allowlist.ts`**; when **`EDGE_CORS_ORIGINS`** is set, disallowed browser `Origin` → **403** `cors_origin_not_allowed`. SPA: **DOMPurify** for signature preview, **`crypto.randomUUID()`** in stores (removed `uuid` dependency), baseline **`vercel.json`** + **`public/_headers`** response headers, removed unused **Google Identity Services** script from `index.html`.
- **Documentation:** [Sell-ready evidence index](./master-security-compliance.md#sell-ready-security-evidence-index), [Supabase external hardening checklist](./master-security-compliance.md#supabase-external-hardening-checklist), [Email deliverability](./master-email-operations.md#email-deliverability-resend), [DSAR playbook](./master-security-compliance.md#dsar-playbook), [Data retention runbook](./master-lead-management.md#data-retention-runbook); [Compliance mapping](./master-security-compliance.md#compliance-mapping) and [Gitea operations](./master-security-compliance.md#gitea-operations) updated for evidence and branch-protection notes.

<a id="implementation-history-section-20"></a>
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

<a id="implementation-history-section-21"></a>
## 21) Workflow Automations v1 and Lead Scoring v2 (2026)

- **Automations v1:** execution logs persisted (status/errors); trigger evaluation on lead/deal transitions; actions for create-activity, assign owner, internal notification paths.
- **Lead Scoring v2:** recency decay on events; structured reason metadata in score snapshots; confidence threshold strategy for hot vs cold classification.
- **Backlog / roadmap:** execution board entries for these tracks are closed; forward scope is in [Pro backlog](./master-roadmap-backlog.md#pro-backlog) and phase deliverables in [Pro roadmap 30–60–90](./master-roadmap-backlog.md#pro-roadmap-30-60-90).

<a id="implementation-history-section-22"></a>
## 22) Ola C — information consistency (April 2026)

- **i18n / GTM:** Documented [regionalization execution waves](./master-roadmap-backlog.md#i18n-regionalization-execution-waves) under Pro backlog **Next** (W1–W3: audit + critical paths, FR/DE/IT parity, locale depth).
- **Release QA:** Added a repeatable [Translation QA checklist (per release)](./master-release-qa.md#translation-qa-checklist-per-release) in `master-release-qa.md`, linked from the backlog i18n bullets.
- **Backlog sequencing:** Added [release assignment table](./master-roadmap-backlog.md#release-assignment-next-backlog) for large **Next** items (templates, role builder, webhooks, retention, DSR, etc.) mapped to **31–60** or **parallel** horizons so execution stays ordered after the shipped 0–30 dashboard + onboarding pack.
- **Research neutrality:** `.planning/research/deploy-testing.md` deleted (2026-05-13) — content consolidated into [`docs/deployment-spa-and-env.md`](./deployment-spa-and-env.md); `project-state.md` Gaps row updated.
- **i18n W1 (code):** `Forecast` pipeline health tier labels and related copy moved from hardcoded Spanish / English fragments to `forecast.*` keys in [`src/i18n`](../src/i18n) (EN/ES/PT; FR/DE/IT inherit EN via partial bundles until W2).
- **i18n W1 (code, continued):** `PipelineTimeline` conversion-rate label uses `reports.conversionRate`; `FollowUps` removes a hardcoded `createdBy` name (uses signed-in user), drops `nav.contacts.toLowerCase()` for the toolbar summary, and adds `followUps.daysSinceBadge` (`{days}` placeholder) for the idle-contact line.
- **i18n — stores + audit + seeded notifications:** Centralized `errors.*` (auth/login/invitation/validation), `auditMessages.*` (audit log detail strings), `attachments.*`, `dealSync.*`, `dealNotifications.*`, `notificationSeeds.*`, and `email.subjectPreset*` in [`src/i18n`](../src/i18n) (EN/ES/PT; partial locales inherit via `...en`). Wired [`getTranslations()`](../src/i18n/index.ts) into `authStore`, `activitiesStore`, `contactsStore`, `dealsStore` (including move notifications), `emailStore`, `leadsStore`, `notificationsStore` seeds, plus `AttachmentsList` and `EmailComposer` user-visible strings. **Remaining work:** continue sweeping `src/pages`, `src/components`, Zod messages, and placeholders until no literal UI language remains (see roadmap i18n waves).

<a id="implementation-history-section-23"></a>
## 23) Manager Dashboard Pack + Onboarding (April 2026)

- **Definitions / contract:** MQL/SQL snapshot from lead `lifecycleStage`, open-deal stage aging from `deal.updatedAt`, owner first-touch median hours from completed call/email/meeting on the same deal where `createdBy` matches `assignedTo`. Route **`/manager`** requires `reports:read` (see `src/utils/permissions.ts`). Canonical tables and heuristics: [Manager dashboard data contract](#manager-dashboard-data-contract) (subsection below).
- **UI:** lazy-loaded [`src/pages/ManagerDashboard.tsx`](../src/pages/ManagerDashboard.tsx) with methodology hints; unit tests in [`tests/utils/managerDashboardMetrics.test.ts`](../tests/utils/managerDashboardMetrics.test.ts).
- **i18n (Apr 2026):** Full `managerDashboard.*` strings for **EN/ES/PT/DE/FR/IT**; shared `common.unassigned` for unassigned deals; `managerDashboard.hoursAbbrev` for the median-hours suffix; SQL share null state uses `common.notAvailable`. Internal unassigned bucket uses **`MANAGER_DASHBOARD_UNASSIGNED_OWNER_KEY`** (`__unassigned__` in code; UI maps to `common.unassigned`). See [Manager dashboard data contract](#manager-dashboard-data-contract) for the full i18n key map and closed-stage rules.
- **Onboarding:** Zustand persist store [`src/store/onboardingStore.ts`](../src/store/onboardingStore.ts) (`crm_onboarding_v1`) keyed by `organizationId` — import contacts, first deal, first sequence, optional home-banner dismiss. **Settings** tab `?tab=onboarding` + **Dashboard** banner CTA; local UX telemetry via [`src/lib/uxMetrics.ts`](../src/lib/uxMetrics.ts) (`onboarding_*` actions, capped localStorage queue — not a substitute for server audit).
- **Ola B/C docs:** Gmail verification kickoff unchanged but cross-linked; email analytics inventory added under [`master-email-operations.md` — Email open/click analytics inventory](./master-email-operations.md#email-openclick-analytics-inventory); deploy research neutrality and release-assignment table remain as in section 22.

<a id="manager-dashboard-data-contract"></a>
### Manager dashboard — data contract

Implementation source: [`src/utils/managerDashboardMetrics.ts`](../src/utils/managerDashboardMetrics.ts) and [`src/pages/ManagerDashboard.tsx`](../src/pages/ManagerDashboard.tsx).

#### MQL / SQL (leads)

- **MQL:** `lead.lifecycleStage === 'mql'`.
- **SQL:** `lead.lifecycleStage === 'sql'`.
- **SQL share (%):** `sql / (mql + sql) × 100` when the denominator is > 0. This is a **snapshot** of the split between MQL/SQL stages, **not** a historical cohort conversion rate (there is no persisted transition event for every lead).

#### Stage aging (deals)

- **Open deals only** (stages that are not closed).
- **Closed:** stages whose `id` is `closed_won` / `closed_lost`, or the heuristic `probability === 100` with a name like “won”, and `probability === 0` with a name like “lost”.
- **Age:** calendar days from `deal.updatedAt` to “today” (a proxy for staleness since the last update).

#### Owner response time (deals)

- For each open deal with `assignedTo`: the first **completed** activity of type `call`, `email`, or `meeting` on that deal with `createdBy === assignedTo`.
- Metric: **hours** from `deal.createdAt` to `activity.completedAt` (median per owner).

#### Permissions

- Route **`/manager`**: same permission as reports — `reports:read` (see [`src/utils/permissions.ts`](../src/utils/permissions.ts)).
- Lazy route registration: [`src/App.tsx`](../src/App.tsx) (`ProtectedPage` + `reports:read`).
- Sidebar item: [`src/config/navigationDefaults.ts`](../src/config/navigationDefaults.ts) (`managerDashboard` id) and [`src/types/navigation.ts`](../src/types/navigation.ts).

#### Internationalization (i18n)

All **user-visible** strings on the Manager Dashboard page go through [`useTranslations()`](../src/i18n/index.ts) (React) or must not be hardcoded in that page.

**Translation keys**

| Area | TypeScript path | Files |
|------|-----------------|-------|
| Page copy (titles, hints, table headers, links) | `Translations['managerDashboard']` | [`src/i18n/types.ts`](../src/i18n/types.ts) (schema), [`src/i18n/en.ts`](../src/i18n/en.ts), [`src/i18n/es.ts`](../src/i18n/es.ts), [`src/i18n/pt.ts`](../src/i18n/pt.ts), [`src/i18n/de.ts`](../src/i18n/de.ts), [`src/i18n/fr.ts`](../src/i18n/fr.ts), [`src/i18n/it.ts`](../src/i18n/it.ts) |
| Nav label | `Translations['nav']['managerDashboard']` | Same locale files |
| SQL share when undefined | `Translations['common']['notAvailable']` | Same |
| Deals with no assignee in the response-time list | `Translations['common']['unassigned']` | Same |
| Hours suffix after median value | `Translations['managerDashboard']['hoursAbbrev']` | Same |

**Locale coverage:** `managerDashboard.*` is defined explicitly for **en**, **es**, **pt**, **de**, **fr**, and **it** (not only inherited from English). Other app areas may still use partial bundles (`...en`) for FR/DE/IT; see [Implementation history §22](#implementation-history-section-22) and [i18n regionalization waves](./master-roadmap-backlog.md#i18n-regionalization-execution-waves).

**Internal sentinel (not a translation key)**

Open deals without `assignedTo` are grouped under a stable internal key exported as **`MANAGER_DASHBOARD_UNASSIGNED_OWNER_KEY`** (`__unassigned__` in [`managerDashboardMetrics.ts`](../src/utils/managerDashboardMetrics.ts)). The UI maps that value to `common.unassigned` when rendering; do not show the raw sentinel to users.

#### Closed-stage detection (heatmap + response metrics)

[`ManagerDashboard.tsx`](../src/pages/ManagerDashboard.tsx) builds the set of closed stage IDs used by both the aging heatmap and owner first-touch metrics. Logic includes:

- Explicit pipeline stage ids `closed_won` and `closed_lost`.
- Heuristic match on stage **name** (case-insensitive) for English **won / lost** and Spanish **ganado / ganada / perdido / perdida** fragments, combined with `probability` (100 vs 0), so localized stage names still classify as closed when ids are custom.

Pure metric functions in `managerDashboardMetrics.ts` receive this set as a parameter; they do not read pipeline settings themselves.

#### Automated tests

- [`tests/utils/managerDashboardMetrics.test.ts`](../tests/utils/managerDashboardMetrics.test.ts) — `computeMqlSqlLeadSnapshot`, `computeDealStageAgingHeatmap`, `computeOwnerFirstTouchHours` (no React).

Run (from repo root): `npm test -- --run tests/utils/managerDashboardMetrics.test.ts`

#### Related runbooks

- [Smoke checklist — production](./smoke-checklist-production.md) (cold load `/manager` with Reports read).
- [Translation QA checklist (per release)](./master-release-qa.md#translation-qa-checklist-per-release) (spot-check when `managerDashboard` or `common.unassigned` keys change).
- [Pro backlog — Manager / activation](./master-roadmap-backlog.md) (forward scope vs shipped KPI pack).

<a id="implementation-history-section-24"></a>
## 24) Cross-cutting UI quality pass (April 2026)

Narrative layout and tokens: [`master-design-ui.md`](./master-design-ui.md#main-canvas-and-responsive-shell) · engineering reference: [`design-system-reference.md`](./design-system-reference.md).

- **Visual tokens (`src/index.css`, `src/styles/tokens.css`):** Skeleton, glass-hover, priority chips, themed-input focus, text gradients, backdrop/border-brand-glow, `.text-2xs`, unified **`.app-main-surface`** on `<main>` (single brand wash; removed route-specific “priority” main backdrops). Light-mode `--color-fg-subtle` tuned for AA on small text.
- **Tailwind:** `transitionDuration` buckets `duration-fast` / `duration-base` / `duration-slow` (150 / 200 / 500 ms); `minHeight.control` for consistent control heights.
- **Charts:** Shared `src/lib/chartTheme.ts` (`useChartTheme`) — Dashboard, Reports, Forecast read semantic colors from CSS variables instead of embedded hex.
- **Responsive shell:** Sidebar **drawer** below `md` (backdrop, body scroll lock, close on navigation / Escape / breakpoint); Topbar **hamburger** and compact **search** (icon opens command palette on narrow viewports). Command palette: dialog semantics, focus cycle, Escape.
- **Modals:** `Modal` / `SlideOver` support `titleId` for `aria-labelledby`; `ConfirmDialog` focus and mobile-friendly widths.
- **Components:** `PageHeader` subtitle uses `text-fg-subtle`; `Spinner` default `aria-label` from i18n; `Toolbar` / `ThemeSwitcher` motion aligned to token buckets; polish on `DealCard`, `EmailComposer`, and shared tables (horizontal scroll on wide grids).
- **Accessibility:** `src/utils/a11y.ts`; tables with `scope` / captions and keyboard-activated rows where applicable; CommandPalette and modal focus handling.
- **Performance:** Lazy routes + `Suspense` in `App.tsx`; dynamic `jspdf` import in Deals; Vite `manualChunks` for `recharts` and `date-fns`; `loadDateFnsLocale` + `useDateLocale` for locale-only bundles; visibility-aware polling and safer subscribe lifecycles in `useDataInit`; finer-grained Zustand selectors on hot paths.
- **i18n:** FR / DE / IT coverage extended where listed; Forecast / Notifications / Products key fixes.
- **Persistence / privacy:** `emailStore` `partialize` omits message bodies from persisted state; related cleanup flags in data init where applicable.
- **Lint:** `lint:ci` `max-warnings` set to **200** (tighter than the prior ceiling).

<a id="implementation-history-section-25"></a>
## 25) Entity lists, list toolbars, and lead delete hardening (April 2026)

- **Deals (`src/pages/Deals.tsx`):** Primary action **New deal** lives inside the glass **`Toolbar`** row with search, filters, and view toggles (same pattern as Contacts/Companies), not isolated in `PageHeader`.
- **Contacts & Companies — saved filters + distribution lists:**
  - **`EntityListsToolbar`** (`src/components/shared/EntityListsToolbar.tsx`): “Save filtered list” persists merged toolbar + smart-view criteria into **`viewsStore`** (`addView`); optional pin. **`distributionListsStore`** (`src/store/distributionListsStore.ts`, localStorage `crm_distribution_lists`) holds named **distribution lists** (member id snapshots) with selector, create-from-selection / create-from-current-results, delete.
  - **`src/lib/entityListFilters.ts`:** `mergeContactFiltersForSave` / `mergeCompanyFiltersForSave` combine `SmartViewBar` filters with toolbar fields for persistence.
  - Selecting a smart view clears conflicting toolbar filters via **`applyViewFiltersFromBar`** on each page.
  - Active distribution list restricts rows by id **and** other filters still apply.
- **`SmartViewBar`:** User-created views (non-seed ids) can be **deleted** from pinned chips and the “more views” dropdown (`Trash2`).
- **Companies parity with Contacts:** Same toolbar order (bulk actions → CSV → duplicates → list/grid → new company), **sort chips** (name / industry / updated), **grid cards**, **export CSV** gated by **`companies:export`** (`src/types/auth.ts`, `src/utils/permissionProfiles.ts`). **Duplicates** modal uses **`findDuplicateCompanies`** (`src/utils/duplicateDetection.ts`).
- **Leads (`src/store/leadsStore.ts`):** **`deleteLead`** awaits Supabase `DELETE`, returns **`Promise<boolean>`**; on failure shows **`leads.deleteFailed`** + **`fetchLeads()`** so rows do not stay falsely removed when RLS/network rejects delete. **`Leads.tsx`** shows success toast only when delete succeeds.
- **i18n:** `common.csv`; `entityLists.*` (EN/ES/PT); `companies.duplicates*`, `sortIndustry`, `sortUpdated`; `leads.deleteFailed`. Contacts/Companies CSV buttons use `t.common.csv`.

**Related:** [`master-design-ui.md` — Entity list toolbars](./master-design-ui.md#entity-list-toolbars-contacts-companies-deals) · [`master-lead-management.md`](./master-lead-management.md) (backend contract unchanged; UI delete behavior above).

<a id="implementation-history-section-26"></a>
## 26) Integration fabric — webhooks replay, API keys, lead capture (April 2026)

- **SQL:** `supabase/migrations/20260424120000_webhook_delete_payload_api_keys_lead_capture.sql` — DELETE webhook events enqueue JSON `null` for `data` (via `'null'::jsonb`) and prior row in `previous`; new tables `organization_api_keys`, `lead_capture_tokens`; index on failed outbox by org.
- **Edge:** `webhook-subscriptions` extended with `listFailedOutbox` and `replayOutbox` (JWT + org admin).
- **Docs:** [`public-api-phase1.md`](./public-api-phase1.md), [`lead-capture-public-endpoint.md`](./lead-capture-public-endpoint.md), updates to [`master-pipedrive-velo-comparison.md`](./master-pipedrive-velo-comparison.md), [`project-state.md`](./project-state.md), [`supabase/README.md`](../supabase/README.md).
- **Shipped in repo:** Edge Function sources under `supabase/functions/`, `config.toml` (`verify_jwt = false` for `crm-public-api` and `lead-capture`), Settings UI + i18n, `database.types.ts`, deploy scripts in `package.json`.

<a id="implementation-history-section-27"></a>
## 27) API & capture hardening — contracts, observability, UX, and smoke tests (April 2026)

- **Backend contracts (`api-keys`, `lead-capture-tokens`):**
  - Unified error envelope for management actions: `{ error, code, status, request_id }`.
  - `list` always returns `200` with collections.
  - `create` still returns one-time secret values.
  - `delete` on API keys and lead tokens is now idempotent (`200`, `deleted: true|false`).
- **Operational observability (`api-keys`, `lead-capture-tokens`, `crm-public-api`, `lead-capture`):**
  - Structured JSON logs with `request_id`, `action`, `organization_id`, `user_id` (when available), `result`, `status`, and `latency_ms`.
  - `request_id` is propagated in responses to correlate UI errors with Edge logs.
- **Settings UX resilience (`SettingsIntegrationsPanel`):**
  - Error feedback is now status-aware (`401`, `403`, `404`, `400/409`) with actionable English messaging.
  - Double-submit prevention for destructive actions through per-row in-flight states.
  - Success and failure handling aligned with idempotent backend behavior.
- **Automated regression coverage:**
  - New Playwright smoke suite `e2e/integrations-api-capture.spec.ts` validates create/use/delete lifecycle for API keys and lead tokens.
  - CI workflow runs this suite when integration E2E secrets are configured.
- **Documentation and runbooks (same delivery):**
  - Updated `docs/public-api-phase1.md`, `docs/lead-capture-public-endpoint.md`, and `supabase/README.md` with error maps, idempotency notes, and troubleshooting workflow.

<a id="implementation-history-section-28"></a>
## 28) Supabase-only shell, strong passwords, and Zustand selector hygiene (April 2026)

- **Runtime model (`src/lib/supabase.ts`, `src/lib/envChannel.ts`):** `dataRuntime` is `supabase` or `unconfigured`. There is **no** hosted `demo` channel or local `VITE_ALLOW_DEMO_MODE` mock CRM in this branch: production builds without valid Supabase env show the bootstrap fatal screen; development without vars logs a console warning and disables auth/data until env is set.
- **Default client settings:** `src/utils/defaultAppSettings.ts` is the single source for initial `settingsStore` shape (replaces removed `seedData` / demo sanitizer paths).
- **Auth UI:** Email + password only in the product shell (`Login`, `Register`, `ForgotPassword`, `ResetPassword`, `UserProfile`). **`SecurePasswordField`** (`src/components/auth/SecurePasswordField.tsx`) shows a live requirement checklist (i18n-backed), optional generator, and `enforceStrongPasswordMinLength={false}` on login so existing shorter passwords still submit HTML forms. Policy rules and generator live in **`src/lib/securePassword.ts`** (tests in `tests/lib/securePassword.test.ts`). **Team** create user and inline password reset use the same component and validation toasts.
- **Workspace hostname (`WorkspaceHostBootstrap`):** Mismatch sync effect depends on **`workspaceFromHost?.id`** (primitive) plus `organizationId` / pending flag, and skips `setState` when the boolean is unchanged — avoids effect storms when host context objects are replaced.
- **`GmailTokenContext`:** Provider `value` is memoized so consumers do not see a new object identity every parent render.
- **Onboarding store + Dashboard:** `getFlags()` always returns a **fresh object**; using `(s) => s.getFlags(orgId)` as a Zustand selector makes React re-enter updates forever after auth. **Fix:** select `s.byOrg[organizationId]` (stable reference in the store) and merge with exported **`EMPTY_ORG_ONBOARDING`** in `useMemo` (`src/store/onboardingStore.ts`, `src/pages/Dashboard.tsx`).
- **i18n:** Workflow template marketing strings moved from `src/i18n/seed/*.demo.ts` to **`src/i18n/workflowLibrary/`** (EN/ES/PT); automation rule English seeds remain under `src/i18n/seed/automationSeedRulesEn.ts`.

**Related:** [`deployment-spa-and-env.md`](./deployment-spa-and-env.md) (runtime table) · [`master-security-compliance.md` — Client password policy](./master-security-compliance.md#client-password-policy-and-zustand-selectors) · [`README.md`](../README.md) (quick start).

<a id="implementation-history-section-29"></a>
## 29) Quality audit, LinkedIn enrichment, and documentation sweep (May 2026)

### 35-page frontend audit

Audited all 35 frontend pages against n0crm-api routes. Result: 95%+ alignment. Critical issues found and fixed:

- **Supabase bypass deletes:** `contactsStore` and `companiesStore` used `sbDelete`/`sbBulkDelete` (direct Supabase PostgREST) instead of the REST API, bypassing auth and the audit log. Fixed: replaced with `api.delete('/contacts/:id')` and `api.delete('/companies/:id')`.
- **Double team invite:** `authStore.createInvitation()` called `api.post('/orgs/me/invite', ...)` AND `TeamManagement.tsx`'s `handleInvite` called the same endpoint — result was two DB rows per invite. Fixed: removed the API call from `createInvitation`, keeping only local state update; `handleInvite` remains the sole API caller.
- **CSVImport hardcoded assignedTo:** `assignedTo: 'u1'` was hardcoded, causing UUID validation failure on the backend. Fixed: replaced with `useAuthStore(s => s.currentUser?.id ?? '')`.

### LinkedIn enrichment (end-to-end)

- **Migration 012** (`n0crm-api/migrations/012_contacts_linkedin_url.sql`): `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_url text`
- **n0crm-api `contacts.ts`:** `linkedinUrl` added to Zod schema; included in `GET` list SELECT, `POST` INSERT, and `PATCH` updates (maps to `linkedin_url` column)
- **n0crm `types/index.ts`:** `Contact.linkedinUrl?: string`
- **`src/lib/schemas/contact.ts`:** `linkedinUrl: z.string().url().optional().or(z.literal(''))`
- **`ContactForm.tsx`:** LinkedIn URL input field with type=url, placeholder, and error display
- **`ContactDetail.tsx`:** LinkedIn link with `<Linkedin>` icon from lucide-react; strips `https://linkedin.com/in/` prefix for display
- **`contactsStore.ts`:** `mapContactFromSupabaseRow` maps `row.linkedinUrl ?? row.linkedin_url`

### Documentation sweep

All `.md` files in both repos updated to reflect 2026-05-15 state. Key updates:
- Gmail no longer blocked — fully self-hosted via n0crm-api
- JWT payload now includes `jti` claim
- Security hardening noted throughout (Redis denylist, Socket.io JWT, AES-256-GCM, rate limiting)
- LinkedIn enrichment referenced in README modules table, n0crm-api route docs, and planning docs
- CODEBASE.md Gmail flow updated to remove "blocked" note
- STATE.md, PROJECT.md, REQUIREMENTS.md all updated with current status

<a id="implementation-history-section-30"></a>
## 30) Monorepo restructure and auth hardening (May 2026)

### Repository structure consolidation

- **n0crm-api merged into api/ subdirectory:** Previously a separate repository (`n0crm-api`), the Fastify backend is now at `api/` in the same monorepo as `frontend/`.
- **Frontend moved to frontend/ subdirectory:** React 18 + TypeScript + Vite SPA now at `frontend/` (was at root).
- **Root docker-compose.yml:** Single orchestration file replaces separate compose configurations; services: frontend (port 3000), api (port 3001), postgres, redis.
- **CI/CD working directories:** 
  - `ci.yml` runs from `frontend/` (uses `frontend/package-lock.json` cache)
  - `build-production.yml` triggers on `frontend/**` changes only
  - `build-api.yml` triggers on `api/**` changes only
- **api/docker-entrypoint.sh auto-runs migrations:** No manual `npm run db:migrate` post-deploy needed; entrypoint runs migrations before server start.

### Authentication hardening (comprehensive audit 2026-05-18)

- **JWT HS256 algorithm pinning:** Algorithm hardcoded in `api/config/env.ts`; no `alg: none` attacks possible.
- **Password reset token hashing:** `password_reset_tokens` stored as SHA-256 hashes in DB (not plaintext); token consumed via secure comparison.
- **Login constant-time validation:** `POST /auth/login` uses bcrypt cost 12 with constant-time comparison; prevents timing-based user enumeration.
- **Password reset rate limiting:** `POST /auth/reset-password` limited to 10 requests per 15 minutes per IP.
- **JWT per-token revocation:** `jti` (JWT ID) claim enables individual token denylist in Redis; `POST /auth/logout` and `POST /auth/refresh` revoke old `jti` with TTL.
- **Impersonation audit enforcement:** Audit log INSERT must succeed before admin impersonation token is issued (fail-fast on log failure).
- **CORS hardening:** `CORS_ORIGIN` env parsed into array; each origin validated against exact match (not raw string); production guard checks all split values for `*`.
- **Docker non-root:** api/Dockerfile uses `USER node` (not root); prevents privilege escalation from container breakout.
- **Docker image purity:** api/.dockerignore prevents `.env` from leaking into image layers.
- **Compose secret guards:** `JWT_SECRET` and `TOKEN_ENCRYPTION_KEY` use `:?` fail-fast guards (deploy fails if unset).

### Documentation updates (2026-05-18)

- **master-security-compliance.md:** Hardening matrix expanded; External hardening checklist updated with new auth controls and Docker section.
- **master-release-qa.md:** Pre-go-live, go-live, and post-go-live checklists updated with monorepo deployment steps and new auth checks.
- **smoke-checklist-production.md:** Preconditions and flows updated; auth and security flows section added; deployment checklist added.
- **master-email-operations.md:** Transactional emails section updated; operator checklist marked with new security items completed; auth email security notes added.
- **master-implementation-history.md:** Section 30 added (this section) to document monorepo restructure and auth hardening snapshot.

### Related documentation

- Monorepo structure: [README](../README.md)
- CI/CD workflows: `.gitea/workflows/` (or `.github/workflows/`)
- Backend routes and auth contracts: `api/docs/` or `api/README.md` (n0crm-api)
- Frontend environment and channel setup: `frontend/docs/deployment-spa-and-env.md`
- Security baseline: [`master-security-compliance.md` — Hardening matrix](./master-security-compliance.md#hardening-matrix)
