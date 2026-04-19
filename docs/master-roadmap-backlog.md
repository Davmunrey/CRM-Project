# Roadmap & backlog (master)

> Consolidated **2026-04-15**. 30/60/90 roadmap plus execution backlog in one place.

**Replaces:** pro-roadmap-30-60-90, pro-backlog.

## Table of contents

- [Roadmap (30 / 60 / 90 days)](#pro-roadmap-30-60-90)
- [PRO backlog (execution board)](#pro-backlog)

---


<a id="pro-roadmap-30-60-90"></a>
## Roadmap (30 / 60 / 90 days)

This roadmap starts from the current implemented baseline and prioritizes features that move the product closer to HubSpot/Pipedrive-level value.

> **Status refresh (2026-04-16):** Navigation customization, core i18n (EN/ES/PT + partial FR/DE/IT), sell-ready **product** baseline (checklist + QA + go/no-go), sell-ready **security/compliance** engineering baseline (section **19** in `docs/master-implementation-history.md#implementation-history`), **Workflow Automations v1 + Lead Scoring v2** (section **21**), and **Manager Dashboard Pack + Onboarding** (section **23**) are shipped. This roadmap tracks **remaining** horizons (API, SSO depth, AI, org-wide email rollups). **Ola C (docs):** i18n execution waves, per-release translation QA template, **Next**→release assignment table, deploy research neutrality — see [`master-implementation-history` — section 22](./master-implementation-history.md#implementation-history-section-22).

## Document Control

- Status: Active
- Owner: Product
- Last updated: 2026-04-16
- Canonical: Yes

## 0-30 days (Revenue + execution fundamentals)

### Objective

Improve sales execution quality and manager visibility with measurable weekly impact.

### Deliverables

1. ~~**Workflow Automations v1**~~ **Shipped** — see `docs/master-implementation-history.md#implementation-history` (Part B, section 21).
2. ~~**Lead Scoring v2**~~ **Shipped** — same section.

3. ~~**Manager Dashboard Pack**~~ **Shipped** — route `/manager`, definitions in [`docs/manager-dashboard-metrics.md`](./manager-dashboard-metrics.md), narrative in [`master-implementation-history` — section 23](./master-implementation-history.md#implementation-history-section-23).
   - MQL/SQL snapshot, stage aging heatmap, owner first-touch KPI (see metrics doc).

4. ~~**Onboarding + Activation**~~ **Shipped** — Settings `?tab=onboarding`, Dashboard banner, persisted checklist per org (`onboardingStore`); same section **23** link.
   - Guided checklist + first-value links (contacts, deals, sequences).

### Success criteria

- 80% of new tenants complete setup checklist in first session.
- measurable reduction in stale leads/deals.
- manager weekly report can be generated from built-in dashboards only.

## 31-60 days (Enterprise readiness)

### Objective

Reduce enterprise sales blockers and increase deployability in managed environments.

### Deliverables

1. **SSO/SCIM Readiness Pack**
   - provider diagnostics UI
   - SSO connection health checks
   - user-provisioning hooks (SCIM-compatible contract for backend).

2. **Governance and Security v2**
   - field-level visibility controls for sensitive data
   - tenant-automated retention / delete jobs (engineering runbooks: `docs/master-lead-management.md#data-retention-runbook`, `docs/master-security-compliance.md#dsar-playbook` — product automation still to build)
   - expanded audit coverage for auth/admin changes.

3. **API + Webhooks**
   - stable public API surface for core entities
   - outbound webhook subscriptions (lead/deal/activity lifecycle events)
   - replay/dead-letter strategy.

4. **Reliability Controls**
   - retry and idempotency for critical async flows
   - runbooks for auth/onboarding/integration incidents
   - migration safety checklist automation.

### Success criteria

- enterprise pilot can complete security checklist without custom patches.
- external systems can sync entities via API/webhooks reliably.
- admin actions are fully auditable by workspace.

## 61-90 days (Differentiation and intelligence)

### Objective

Move from “feature parity” toward differentiation through intelligence and velocity.

### Deliverables

1. **AI Copilot v2**
   - account summary
   - next-best-action recommendations
   - meeting prep briefs
   - contextual email draft generation.

2. **Forecasting and Revenue Intelligence**
   - weighted forecast by confidence and historical conversion
   - commit/best-case/worst-case views
   - slippage prediction baseline.

3. **Advanced Sequences**
   - multi-channel sequence steps
   - pause/resume + branching rules
   - outcome analytics by step.

4. **Pro UX polish**
   - role-based workspace home
   - bulk operations with preview/undo for sensitive actions
   - template library for automations and views.

### Success criteria

- forecast variance reduced month-over-month.
- users complete common sales workflows with fewer manual steps.
- tenant expansion signals improve (more active seats, more automation usage).

## Execution order recommendation

1. ~~Automations v1~~ (done)
2. ~~Lead Scoring v2~~ (done)
3. ~~Manager Dashboard Pack~~ (done)
4. ~~Onboarding + Activation~~ (done)
5. SSO/SCIM readiness
6. API/Webhooks
7. AI Copilot v2 + Forecasting

## Immediate sprint start (next coding block)

~~**Manager Dashboard Pack**~~ and ~~**Onboarding + Activation**~~ **(done)** — see [`master-implementation-history` — section 23](./master-implementation-history.md#implementation-history-section-23) and [`manager-dashboard-metrics.md`](./manager-dashboard-metrics.md).

1. ~~Define KPI queries and empty/loading states per dashboard widget.~~
2. ~~Ship MQL→SQL + stage aging + response-time views with role-aware visibility.~~
3. ~~Guided setup checklist: persistence model + Settings entry point + completion telemetry.~~
4. ~~First-value milestones (import, first deal, first sequence) with progress persistence.~~

---


<a id="pro-backlog"></a>
## PRO backlog (execution board)

This is the actionable backlog derived from the 30/60/90 roadmap.

> **Status refresh (2026-04-16):** This board lists **remaining** execution work. Shipped items live in **`docs/master-implementation-history.md#implementation-history-sections-01-12`** (Part A) + **`docs/master-implementation-history.md#implementation-history`** (Part B) and in the status table in **`docs/README.md`**. Keep long “done” narratives out of this file.

## Document Control

- Status: Active
- Owner: Product/Engineering
- Last updated: 2026-04-16
- Canonical: Yes

## Shipped tracks (do not duplicate here)

All previously listed “in progress” packs (automations v1, scoring v2, lead maintenance ops, ops docs, email privacy/Ola 3, navigation, app shell, sell-ready security wave) are **done**. Narrative and ordering:

- **`docs/master-implementation-history.md#implementation-history-sections-01-12`** — sections **1–12** (includes **section 7** leads baseline).  
- **`docs/master-implementation-history.md#implementation-history`** (Part B) — sections **13–24** (status, maintenance, email hardening, navigation, UI shell, sell-ready, sprint archive, automations/scoring, Ola C docs, manager dashboard + onboarding, April 2026 UI quality pass).
- **`docs/README.md`** — status snapshot table.

## Reference docs (team register)

- **Planning vs product docs:** [`docs/project-state.md`](./project-state.md) — when to use `.planning/` vs `master-*`, v1 deploy intent, and documented gaps.
- **Layout, shells, and empty states:** `docs/master-design-ui.md#design-system-and-layout` — when to use `crm-page` vs `crm-page-full`, `PanelEmpty` vs `EmptyState`, auth surfaces, and pre-merge checks.
- **User profile, display names, CRM consistency:** `docs/master-design-ui.md#user-profile-display-names` — what is implemented (`user_metadata` persistence), manual test checklist, and open gaps (CRM rows with plain-text names, editing other users from admin, etc.).

## Next

<a id="i18n-regionalization-execution-waves"></a>
### i18n / regionalization — execution waves

Ship **incrementally** after the 0–30 manager + onboarding focus; do not block releases on “100% keys” unless a sell-ready gate explicitly requires it. Implementation lives in [`src/i18n`](../src/i18n) (`useTranslations`, locale formatters). **Per-release QA:** [`master-release-qa` — Translation QA checklist](./master-release-qa.md#translation-qa-checklist-per-release).

| Wave | Goal | Exit signal |
|------|------|-------------|
| **W1 — Audit + critical paths** | Remove hardcoded strings in **high-traffic** screens (auth, deals, contacts, Settings tabs touched by roadmap work); extend keys in EN first, then ES/PT. | PR grep policy: no new literals in touched files; EN/ES/PT pass Translation QA. |
| **W2 — FR / DE / IT parity** | Bring partial locales to **parity** with EN for the same key set (empty key = bug); keep fallback strategy documented in QA evidence. | FR/DE/IT columns filled for the same flows as the EN matrix row in QA evidence. |
| **W3 — Locale depth** | Date/time **timezone defaults** (org or user), currency/number edge cases, long-lived list exports; align with `date-fns` usage and formatter tests. | Formatter tests extended if new patterns; Dashboard/Reports spot-check signed in QA. |

- [ ] Productization Baseline (sell-ready across industries)
  - [x] Pipeline configurability **(MVP shipped)** — extend with templates / industry packs
    - [x] Rename stages/entities per organization (no fixed "deal/prospect" wording)
    - [x] Stage probability + SLA defaults configurable in Settings
    - [ ] Multiple pipeline templates (SaaS, Services, Real Estate, Insurance)
  - [x] Dynamic RBAC and permission profiles **(preset matrix shipped)** — extend with full custom role builder
    - [ ] Role builder per organization (module/action matrix) beyond preset clone/edit
    - [x] Preset bundles: Admin, Manager, Rep, Read-only
    - [x] Audit trail for permission changes
  - [ ] Full regionalization (i18n + locale)
    - [ ] Remove remaining hardcoded UI strings
    - [ ] Locale-aware dates, currencies, number formats, timezone defaults
    - [ ] Translation QA checklist per release (EN/ES/PT + fallback strategy) — template: [`master-release-qa` — Translation QA checklist](./master-release-qa.md#translation-qa-checklist-per-release)
  - [x] White-label starter pack **(baseline shipped)**
    - [x] Tenant branding (logo, colors, app name)
    - [x] Custom domain/subdomain strategy
    - [x] Custom legal links (privacy/terms) per tenant
- [ ] Integration and ecosystem baseline
  - [ ] Provider abstraction (Google/Microsoft email, calendar)
  - [ ] CRM import/export hardening (mapping presets per industry)
  - [ ] Webhooks v1 with retry policy and signed payloads
- [ ] Enterprise trust and compliance baseline
  - [x] Engineering runbooks: `docs/master-lead-management.md#data-retention-runbook`, `docs/master-security-compliance.md#dsar-playbook`, `docs/master-security-compliance.md#supabase-external-hardening-checklist` (external evidence + procedures)
  - [ ] **Product:** per-tenant retention schedules and automated purge where required by contract
  - [ ] **Product:** in-app or operator-assisted DSR tooling (export/delete) beyond manual Supabase procedures
  - [ ] Backup/restore and DR **test cadence** executed and logged (checklist in Supabase doc; calendar owner = Ops)
- [x] Manager Dashboard Pack **(shipped)**
  - [x] MQL/SQL snapshot + mix KPI (see metrics doc)
  - [x] Stage aging heatmap (open deals × `updatedAt` buckets)
  - [x] Owner first-touch / response-time KPI (median hours, completed touch activities)
- [ ] API + Webhooks baseline
  - [ ] Public endpoint policy and versioning
  - [ ] Webhook subscriptions with retries

## Later

- [ ] SSO/SCIM enterprise readiness
- [ ] Governance and field-level security
- [ ] AI copilot v2
- [ ] Forecasting intelligence

## Sell-Readiness Matrix (Go-To-Market)

Use this matrix as release gates before onboarding broader customer segments.

| Capability | Current | Target | Priority |
|---|---|---|---|
| Multi-industry adaptability | Pipeline MVP (rename stages/probabilities) + custom fields; **industry templates** not shipped | Tenant-configurable pipelines + naming + templates | P0 |
| Language/locale quality | EN/ES/PT + formatter baseline + sell-ready QA; FR/DE/IT partial; **residual hardcoded strings** possible in edge screens | 100% UI i18n + locale-aware formatting | P0 |
| Manager / activation | **Shipped:** `/manager` KPI pack ([`manager-dashboard-metrics.md`](./manager-dashboard-metrics.md)) + onboarding checklist/banner ([section 23](./master-implementation-history.md#implementation-history-section-23)) | Org-wide analytics (e.g. cross-rep email rollups), deeper cohort MQL→SQL | P0 |
| Enterprise permissions | Preset matrix + audit shipped; custom role builder open | Dynamic RBAC with profile presets + auditability | P0 |
| Branding/white-label | Baseline shipped (logo, color, domain, legal links) | Deeper white-label + partner flows | P1 |
| Integrations | Partial (email-focused) | Connector abstraction + webhooks + import mapping | P1 |
| Compliance operations | Runbooks + evidence index shipped; external DNS/RLS sign-off pending per tenant | Executable **tenant** automation + logged DR drills | P1 |
| Sales enablement packaging | Low | Vertical onboarding templates + deployment playbooks | P2 |

Execution order for GTM priorities matches **[Pro roadmap 30–60–90](#pro-roadmap-30-60-90)** (avoid duplicating here).

<a id="release-assignment-next-backlog"></a>
### Release assignment — “Next” items outside the immediate 0–30 sprint

Use this table so **large** backlog rows have a single agreed horizon; execution order inside a horizon still follows **[Execution order recommendation](#execution-order-recommendation)** (SSO/API/AI after dashboard + onboarding).

| Backlog item | Target horizon | Notes |
|---------------|----------------|-------|
| Multiple pipeline templates (industry packs) | **31–60 days** | Extends shipped pipeline MVP; pairs with vertical onboarding later. |
| Role builder per organization (full matrix) | **31–60 days** | Enterprise readiness; builds on preset RBAC + audit shipped today. |
| Full regionalization (remainder: hard strings, locale depth) | **Parallel** (0–30 **safe** + continues through **31–60**) | Follow [i18n waves](#i18n-regionalization-execution-waves); does not preempt manager dashboard / onboarding. |
| Provider abstraction (Google / Microsoft email, calendar) | **31–60 days** | Integration baseline in roadmap. |
| CRM import/export hardening | **31–60 days** | Same track as integration baseline / enterprise pilots. |
| Webhooks v1 (retries, signed payloads) | **31–60 days** | Listed under **API + Webhooks** in [31–60 days](#pro-roadmap-30-60-90). |
| Per-tenant retention schedules + automated purge | **31–60 days** | Governance pack; engineering runbooks already exist. |
| In-app / operator-assisted DSR tooling | **31–60 days** | Enterprise trust; playbook exists, product automation open. |
| Backup/restore + DR **test cadence** logged | **31–60 days** (Ops) | Calendar owner; evidence in compliance / ops docs per tenant. |

## Archived sprint (sell-ready product baseline)

The completed **two-week sprint** (stories, acceptance criteria, execution board) is archived in **`docs/master-implementation-history.md#implementation-history` (section 20)**. Decision: **`docs/master-release-qa.md#go-no-go-sell-ready-baseline`**.

## Work-In-Progress Limits (recommended)

- Max 2 concurrent tasks per engineer
- No new feature start if critical QA bug is open
- Merge gate: acceptance checklist + i18n/locale smoke pass
