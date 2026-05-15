## SLO Baseline (Phase 2)

- Public API p95 latency `< 500ms`, error rate `< 0.1%`.
- Login success rate `> 99%`.
- Inbox sync p95 `< 3s` for connected Gmail accounts.
- Alert routing: Sentry issue alerts + weekly trend review in release QA.

# Release & QA (master)

> Consolidated **2026-04-15**. Sell-ready checklists, QA evidence, go/no-go records, and production handoff.

**Replaces:** sell-ready-release-checklist, qa-evidence-sell-ready-baseline, qa-evidence-template, go-no-go-sell-ready-baseline, production-handoff-checklist.

## Table of contents

- [Sell-ready release checklist](#sell-ready-release-checklist)
- [Cross-doc checklist closure plan](#cross-doc-checklist-closure-plan)
- [Translation QA checklist (per release)](#translation-qa-checklist-per-release)
- [Onboarding UAT (workspace checklist)](#onboarding-uat-workspace-checklist)
- [QA evidence — sell-ready baseline](#qa-evidence-sell-ready-baseline)
- [QA evidence template](#qa-evidence-template)
- [Go / No-Go — sell-ready baseline](#go-no-go-sell-ready-baseline)
- [Production handoff checklist](#production-handoff-checklist)

---


<a id="cross-doc-checklist-closure-plan"></a>
## Cross-doc checklist closure plan

Use this operational plan to close unchecked items across `docs/**/*.md`, `.planning/**/*.md`, and other markdown files without creating false positives.

### 1) Weekly checklist inventory

- Build a single inventory of all `- [ ]` and `- [x]` items.
- Group each check as one of:
  - **repo-evidence** (code/workflow/test evidence exists in git),
  - **runtime-evidence** (needs deployed env proof),
  - **human-signoff** (ops/product/security approval).

### 2) Strict marking policy

- Mark `[x]` only when evidence is attached in the same PR/release ticket.
- Keep `[ ]` when the check depends on Supabase/Google dashboard state, DNS records, or manual sign-off.
- If partially complete, keep `[ ]` and append a short blocker note in the related section.

### 3) Closure order (high to low leverage)

1. `master-security-compliance` (external hardening + advisor-zero controls)
2. `master-release-qa` and `smoke-checklist-production` (release gates)
3. `master-email-operations` and `master-lead-management` (ops runbooks)
4. `.planning/ROADMAP.md` and `.planning/REQUIREMENTS.md` (phase traceability)

### 4) Release gate integration

- No release is closed until `smoke-checklist-production` has dated evidence.
- Every deployment records: commit SHA, channel, environment URL, smoke result, operator.
- Runtime/human checks remain unchecked until evidence is archived.

### 5) Monthly hygiene pass

- Remove stale or duplicate checklist items and link to the canonical master section.
- Revalidate checks that are sensitive to infra drift (OAuth redirects, CORS, RLS, secrets).
- Publish a short “checks closed / checks pending / blockers” summary in release notes.

### 6) Current closure status (2026-04-28)

- Repo-evidence checks executed in this cycle:
  - `npm run -s lint:ci`
  - `npm run -s i18n:lint`
  - `npm run -s ui:lint`
  - `npx tsc --noEmit`
  - `npm run -s test:run`
  - `npm run -s test:coverage`
  - `npm run -s test:run -- tests/utils/formatters.test.ts`
  - `npm run -s build` (production) and `npm run -s build -- --mode development`
- Checks updated to `[x]` with this evidence:
  - `docs/master-email-operations.md`: lint gate closed
  - `docs/master-release-qa.md`: formatter regression gate closed
  - `.planning/ROADMAP.md`: test and coverage gates closed
- Remaining unchecked inventory after this pass:
  - `docs/**/*.md`: 110
  - `.planning/**/*.md`: 49
- Active blockers (external/runtime):
  - Supabase Edge Function deploy (`supabase-remote-deploy.yml`) blocked until `SUPABASE_ACCESS_TOKEN` and Google OAuth secrets are set in GitHub Actions secrets.
  - Password reset email delivery not yet implemented (token created in DB; SMTP/Resend integration pending).

---


<a id="sell-ready-release-checklist"></a>
## Sell-ready release checklist

Use this checklist before shipping a "sell-ready" baseline release.

## Document Control

- Status: Active
- Owner: Product/QA
- Last updated: 2026-05-15
- Canonical: Yes

## Scope and Planning

- [x] Version/tag and release window confirmed.
- [x] Scope frozen with linked backlog items.
- [x] Rollback owner and rollback steps defined.

## Productization Baseline

- [x] Pipeline settings allow stage rename/probability updates.
- [x] Stage labels render consistently across board/list/detail flows.
- [x] Locale formatting validated for EN/ES/PT.
- [x] No mixed-language UI in critical paths.

## Access and Security

- [x] Permission model validated for Admin/Manager/Rep/Read-only.
- [x] Audit log captures permission-changing operations.
- [x] Email/privacy controls validated for user isolation.

## QA and Regression

- [x] Smoke tests passed: login, contacts, companies, deals, activities, reports.
- [x] Formatter tests pass in CI.
- [x] Manual multilingual regression signed off.
- [x] Known issues documented with severity and owner.
- [x] Layout and theme spot-check (dark + light) on Dashboard, Deals, Inbox, and Settings per [`master-design-ui` — design system](./master-design-ui.md#design-system-and-layout).
- [x] **UI/UX regression gate:** `npm run ui:lint` green; Vitest + `vitest-axe` smoke on auth flows (`tests/auth/*`) and chart/list pages (`tests/a11y/key-pages.test.tsx` — Dashboard + Contacts in dark and light); theme preference persists via `useSettingsStore` (see `tests/components/Topbar.theme.test.tsx`, `tests/store/themePreferencePersistence.test.ts`). Canonical reference: [`design-system-reference.md`](./design-system-reference.md).

## Operations and Handoff

- [x] Runbooks updated (incident, maintenance, release).
- [x] Monitoring/alerts reviewed for release window.
- [x] Support handoff notes delivered.
- [x] Go/No-Go decision recorded.

## Founder-speed weekly shipping cadence (solo + AI)

Use this cadence when operating with a single engineering owner:

- **Monday:** choose one strategic initiative + one stability initiative from the scorecard in [`master-roadmap-backlog.md`](./master-roadmap-backlog.md).
- **Wednesday:** shipping checkpoint (scope trim allowed; quality gates not negotiable).
- **Friday:** production release + smoke + KPI review + retro notes.

Non-negotiable merge/release gates:

- `npm run ui:lint`
- `npm run i18n:lint`
- `npm run lint:ci` (full ESLint on `src/`)
- `npx tsc --noEmit`
- `npm run test:run` (or `npx vitest run` in CI)
- `npm run build -- --mode development` (Vite compile gate; production deploys use `VITE_APP_CHANNEL` + Supabase secrets)
- Release smoke from [`smoke-checklist-production.md`](./smoke-checklist-production.md)

### Branch protection (Gitea / GitHub)

When enabling **required status checks** on the default branch (`master`):

- Require all jobs from **`.github/workflows/ci.yml`** (or the equivalent Gitea workflow): **ui:lint**, **i18n:lint**, **ESLint (full)**, **Type check**, **Run tests**, **Vite build (CI)**, plus **Dependency audit (critical+)**.
- Optional: add **`build-production.yml`** / deploy workflow as an additional check only if that pipeline is always green on `master`.
- Document the policy owner in [`master-security-compliance` — Gitea](./master-security-compliance.md#gitea-operations).

## Security and compliance baseline (Apr 2026)

Cross-check before any **external** customer rollout (evidence lives in linked docs; platform tasks are org-specific):

- [x] Outbound Resend function abuse controls and logging (`supabase/functions/resend-send-email`, index: [`master-security-compliance` — evidence](./master-security-compliance.md#sell-ready-security-evidence-index)).
- [x] Deploy channels: `VITE_APP_CHANNEL` (`src/lib/envChannel.ts`), auth fail-closed (`src/App.tsx`), build validation (`vite.config.ts`), `.env.example`.
- [x] Auth store does not restore stale or demo credentials on rehydrate (`src/store/authStore.ts`).
- [x] Email send state matches provider outcome (`failed` + audit path where applicable).
- [x] CI includes critical-level `npm audit` (`.gitea/workflows/ci.yml`, `.github/workflows/ci.yml`).
- [ ] **Per deployment:** External hardening checklist signed, SPF/DKIM/DMARC evidence, branch protection in Gitea (see [`master-security-compliance` — hardening checklist](./master-security-compliance.md#supabase-external-hardening-checklist), [`master-email-operations` — deliverability](./master-email-operations.md#email-deliverability-resend), [`master-security-compliance` — Gitea](./master-security-compliance.md#gitea-operations)).

---

<a id="translation-qa-checklist-per-release"></a>
## Translation QA checklist (per release)

Use this **short gate** on every release candidate when UI copy or locale behavior changed. Full matrices for major baselines live in [#qa-evidence-sell-ready-baseline](#qa-evidence-sell-ready-baseline); this section is the **repeatable minimum**.

**Regionalization waves** (engineering plan, not a single RC): see [Pro backlog — i18n regionalization execution waves](./master-roadmap-backlog.md#i18n-regionalization-execution-waves).

### Pre-flight

- [ ] Release notes list **languages touched** (minimum: EN/ES/PT; note FR/DE/IT if keys changed).
- [ ] No **new** user-visible hardcoded strings in changed files (grep / PR review); new copy uses `src/i18n` keys.
- [x] **Formatter paths** unchanged or re-run: `npm run test:run -- tests/utils/formatters.test.ts` (or full CI).

### Per-language smoke (15–30 min)

For each locale in scope, spot-check: **login**, **create contact**, **create/move deal**, **one Settings tab** touched by the release. If **`/manager`** or `managerDashboard` / `common.unassigned` keys changed in the release, also spot-check **Manager dashboard** (Reports read): nav label, methodology hints, heatmap headers, response list, unassigned row label, and SQL share empty state.

- [ ] **EN** — no mixed-language fragments in those flows.
- [ ] **ES** — same.
- [ ] **PT** — same.
- [ ] **FR / DE / IT** (if marked “supported this RC”) — no empty labels; fallbacks acceptable only where documented.

### Locale and data

- [ ] Dates and numbers match **org + user locale** expectations on Dashboard or Reports if those areas changed.
- [ ] Currency sample (if deals/reports touched): symbol position and decimals look correct for the locale.
- [ ] If company industries changed: company form, companies filters/list, company detail, and CSV import render localized labels consistently for all supported locales.
- [ ] If industry taxonomy changed: no hardcoded industry arrays remain outside `src/lib/industries.ts`; legacy values are normalized without breaking existing records/views.

### Sign-off line

- [ ] Owner initials + date recorded in RC QA evidence (or PR checklist comment).

---

<a id="onboarding-uat-workspace-checklist"></a>
## Onboarding UAT (workspace checklist)

Use after changes to **Dashboard**, **Settings → Getting started**, or [`onboardingStore`](../src/store/onboardingStore.ts).

### Preconditions

- [ ] Signed-in user belongs to an organization (`organizationId` present in JWT claims).

### Flow

1. [ ] Open **Dashboard** — if checklist incomplete, **workspace setup** banner appears; **Open checklist** navigates to `/settings?tab=onboarding`.
2. [ ] **Dismiss** hides the banner for this org+browser until reset (stored with onboarding flags).
3. [ ] On **Settings → Getting started**, mark each milestone **Done** / **To-do**; reload — state persists (`localStorage` key `crm_onboarding_v1`).
4. [ ] Links open **Contacts**, **Deals**, and **Sequences** in-app (`Link` targets).
5. [ ] **Reset checklist** clears milestones for the active org (banner may reappear if steps incomplete).

### Telemetry (non-blocking)

- [ ] Optional: after QA, inspect `localStorage` key `crm_ux_metrics_v1` for `onboarding_*` events when toggles/dismiss/reset were exercised (local UX queue only; not server audit).

---


<a id="qa-evidence-sell-ready-baseline"></a>
## QA evidence — sell-ready baseline

## Document Control

- Status: Active
- Owner: QA/Engineering
- Last updated: 2026-04-16
- Canonical: Yes

**Status:** Baseline evidence for the **product** sell-ready GO ([#go-no-go-sell-ready-baseline](#go-no-go-sell-ready-baseline)). Post–Apr 2026 **security** checks are listed in [#sell-ready-release-checklist](#sell-ready-release-checklist) (Security section) and [`master-security-compliance` — evidence](./master-security-compliance.md#sell-ready-security-evidence-index).

## Build Metadata

- Release candidate: `sell-ready-baseline-rc1`
- Commit SHA: `working-tree-local`
- Test environment: `local / mock mode + unit test suite`
- Tester(s): `engineering`
- Date: `2026-04-13`

## Language Matrix

| Flow | EN | ES | PT | Notes |
|---|---|---|---|---|
| Login/logout | [x] | [x] | [x] | Core labels and locale controls are i18n-backed. |
| Create contact | [x] | [x] | [x] | Form labels/options migrated to translation keys. |
| Create company | [x] | [x] | [x] | Core CRUD labels translated; fallback strategy in place. |
| Create/move deal | [x] | [x] | [x] | Dynamic stage labels + localized deal UI copy. |
| Create/complete activity | [x] | [x] | [x] | Activity forms and timeline labels localized. |
| Dashboard/reports formatting | [x] | [x] | [x] | Formatter utilities + tests validate locale behavior. |
| Manager dashboard (`/manager`) | [x] | [x] | [x] | `managerDashboard.*` + `common.unassigned` / `notAvailable`; FR/DE/IT have explicit `managerDashboard` bundles (see [`master-implementation-history` — Manager dashboard data contract](./master-implementation-history.md#manager-dashboard-data-contract)). |

## Role Matrix

| Scenario | Admin | Manager | Rep | Read-only | Notes |
|---|---|---|---|---|---|
| Access settings | [x] | [x] | [ ] | [ ] | Controlled via `settings:read` permission profile. |
| Create/update records | [x] | [x] | [x] | [ ] | Enforced by dynamic permission profiles. |
| Delete records | [x] | [x] | [ ] | [ ] | Rep/viewer default presets restrict delete actions. |
| Export/import actions | [x] | [x] | [ ] | [ ] | Verified from permission matrix defaults. |
| View audit trail | [x] | [x] | [ ] | [ ] | `audit:read` granted to admin/manager presets. |

## Automated Verification Evidence

- `npm run test:run -- tests/utils/permissions.test.ts tests/utils/formatters.test.ts`
- Result: `2 files passed`, `52 tests passed` (scoped subset only — not the full suite)
- Full regression: `npm run test:run` (Vitest — last verified **36** files / **183** tests, 0 failures, exit 0 on 2026-04-21)
- Lint diagnostics on modified files: no errors

## Defects

| ID | Severity | Area | Language/Role | Status | Owner |
|---|---|---|---|---|---|
| SR-001 | Low | UX polish | All | Open | Product/Design |
| SR-002 | Low | White-label validation (URL format) | Admin | Open | Frontend |

## Sign-off

- QA lead: `Engineering proxy`
- Product owner: `Pending`
- Engineering owner: `Completed`
- Go / No-Go: `See go/no-go review document`

---


<a id="qa-evidence-template"></a>
## QA evidence template

Fill this document for each release candidate.

## Document Control

- Status: Active
- Owner: QA
- Last updated: 2026-04-16
- Canonical: Yes

**Example (filled):** [#qa-evidence-sell-ready-baseline](#qa-evidence-sell-ready-baseline) — copy structure from this template for new releases.

## Build Metadata

- Release candidate:
- Commit SHA:
- Test environment:
- Tester(s):
- Date:

**Language / role matrices:** Copy the table structure (same rows/columns) from [QA evidence — sell-ready baseline](#qa-evidence-sell-ready-baseline) and reset checkboxes for this RC. Keeping one filled reference avoids two parallel empty matrices in the template.

## Defects

| ID | Severity | Area | Language/Role | Status | Owner |
|---|---|---|---|---|---|
| | | | | | |

## Sign-off

- QA lead:
- Product owner:
- Engineering owner:
- Go / No-Go:

---


<a id="go-no-go-sell-ready-baseline"></a>
## Go / No-Go — sell-ready baseline

## Document Control

- Status: Active
- Owner: Product/Engineering
- Last updated: 2026-04-16
- Canonical: Yes

## Decision

- Decision: **GO (internal/beta rollout)**
- Date: `2026-04-13`
- Scope: P0/P1 sell-ready baseline (i18n+locale, pipeline configurability, RBAC profiles, white-label starter)

## Evidence Reviewed

- Release checklist: [#sell-ready-release-checklist](#sell-ready-release-checklist)
- QA evidence matrix: [#qa-evidence-sell-ready-baseline](#qa-evidence-sell-ready-baseline)
- QA template reference: [#qa-evidence-template](#qa-evidence-template)
- Security / compliance evidence index: [`master-security-compliance`](./master-security-compliance.md#sell-ready-security-evidence-index) (post–Apr 2026 hardening wave; external sign-offs still per environment)
- Key tests:
  - `npm run test:run -- tests/utils/permissions.test.ts tests/utils/formatters.test.ts`

## Exit Criteria Status

- [x] Localization baseline implemented for EN/ES/PT paths
- [x] Locale formatters and fallback behavior validated in tests
- [x] Tenant pipeline labels and probabilities configurable
- [x] RBAC presets editable with audit events on changes
- [x] White-label starter available (name/color/logo/domain/legal links)
- [x] Release checklist and QA evidence documents generated

## Risks and Mitigations

- Risk: Some manual exploratory scenarios can still uncover edge-case UX issues.
  - Mitigation: Run smoke pass from checklist before external customer rollout.
- Risk: Legal link URLs are free-text and may contain malformed values.
  - Mitigation: Add URL validation pass in next hardening slice.

## Follow-up Actions (Post-Go)

1. Add URL validation for branding legal/domain fields.
2. Run full customer-journey smoke in staging before broad external rollout.
3. Attach final commit SHA and environment details to QA evidence for release tag.

---


<a id="production-handoff-checklist"></a>
## Production handoff checklist

This checklist is the operational handoff for go-live and post-go-live stabilization.

## Document Control

- Status: Active
- Owner: Ops/Engineering
- Last updated: 2026-04-16
- Canonical: Yes

**Related:** Security/compliance evidence map [`master-security-compliance`](./master-security-compliance.md#sell-ready-security-evidence-index); Supabase external checklist [`master-security-compliance`](./master-security-compliance.md#supabase-external-hardening-checklist); repo CI [`master-security-compliance`](./master-security-compliance.md#gitea-operations).

## 1) Pre-Go-Live (T-7 to T-1 days)

- [ ] **Environment Variables — Frontend**
  - [ ] `VITE_API_URL` points to production velo-api (`/api` for Docker nginx; full URL for external hosting)
  - [ ] `VITE_APP_CHANNEL` (`production` on prod; `staging` on preview/UAT)
  - [ ] `VITE_GMAIL_CLIENT_ID` (if Gmail integration enabled)
- [ ] **Environment Variables — velo-api**
  - [ ] `JWT_SECRET` min 32 chars (`openssl rand -hex 32`)
  - [ ] `DATABASE_URL` points to production PostgreSQL
  - [ ] `CORS_ORIGIN` matches frontend production origin
  - [ ] `REDIS_URL` (for BullMQ/Socket.io)
  - [ ] `LEAD_MAINTENANCE_SECRET`
- [ ] **Environment Variables — Supabase Edge Functions** (if deployed)
  - [ ] `SUPABASE_FUNCTIONS_URL` + `SUPABASE_ANON_KEY`
  - [ ] Google OAuth secrets set in Edge
- [ ] **Database**
  - [ ] Latest migrations applied (`npm run db:migrate`)
  - [ ] Seed applied (`npm run db:seed`)
  - [ ] Tenant isolation smoke test completed
  - [ ] `lead_score_maintenance_runs` table visible per tenant
- [ ] **Edge Functions**
  - [ ] `lead-score-maintenance` deployed
  - [ ] `track-open` deployed
  - [ ] `track-click` deployed
  - [ ] `promote-lead` deployed
  - [ ] `create-org` deployed (or RPC path validated)
- [ ] **Schedulers**
  - [ ] `maintenance:lead:all` scheduled every 30 min
  - [ ] `maintenance:lead:sla` scheduled every 30-60 min
  - [ ] `maintenance:lead:health` monitored every 15-30 min
- [ ] **Monitoring**
  - [ ] Alert route defined for SLA breaches
  - [ ] On-call owner assigned
  - [ ] Incident channel and escalation contacts confirmed

## 2) Go-Live Day (T0)

- [ ] Run manual baseline commands:
  - [ ] `npm run maintenance:lead:all`
  - [ ] `npm run maintenance:lead:health`
  - [ ] `npm run maintenance:lead:sla`
- [ ] Validate Settings panel:
  - [ ] `Settings -> Lead Maintenance Ops` loads
  - [ ] last successful run updates
  - [ ] no unexpected error bursts
- [ ] Validate auth/login:
  - [ ] email/password
  - [ ] at least one enabled SSO provider
- [ ] Validate core flows:
  - [ ] create organization
  - [ ] add lead
  - [ ] recompute lead score
  - [ ] convert lead to contact/company/deal

## 3) Post-Go-Live (T+1 to T+7 days)

- [ ] Daily checks:
  - [ ] stale tenant count trend is stable/down
  - [ ] telemetry run status mostly `success`
  - [ ] error messages triaged within SLA
- [ ] Capacity checks:
  - [ ] velo-api rate limits acceptable (PostgreSQL + Redis load under expected traffic)
  - [ ] SMTP/email provider health stable
  - [ ] edge function latency acceptable
- [ ] Product checks:
  - [ ] smart views localization consistent
  - [ ] lead scoring confidence behavior acceptable
  - [ ] workflow automation logs consistent

## 4) Rollback and Recovery

- [x] Recovery path documented in [`master-lead-management` — runbook](./master-lead-management.md#lead-maintenance-runbook)
- [ ] Last known good deployment references stored
- [ ] Database backup/restore process validated

## 5) Sign-Off

- [ ] Backend owner sign-off
- [ ] Frontend owner sign-off
- [ ] Ops/Infra owner sign-off
- [ ] Product owner sign-off

## Related Docs

- [`master-lead-management` — score backend](./master-lead-management.md#lead-score-maintenance-backend)
- [`master-lead-management` — runbook](./master-lead-management.md#lead-maintenance-runbook)
- [`master-lead-management` — Ops dashboard](./master-lead-management.md#lead-maintenance-ops-dashboard)
- [`master-security-compliance` — auth / SSO](./master-security-compliance.md#auth-sso-backend-handoff)
- [`master-implementation-history` — Part A](./master-implementation-history.md#implementation-history-sections-01-12)
- [`master-implementation-history` — Part B](./master-implementation-history.md#implementation-history)
