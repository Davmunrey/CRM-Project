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

> **Status refresh (2026-04-15):** Navigation customization, core i18n (EN/ES/PT + partial FR/DE/IT), sell-ready **product** baseline (checklist + QA + go/no-go), sell-ready **security/compliance** engineering baseline (section **19** in `docs/master-implementation-history.md#implementation-history`), and **Workflow Automations v1 + Lead Scoring v2** (section **21**) are shipped. This roadmap tracks **remaining** 0–30 work (manager dashboards, onboarding) and later horizons (API, SSO depth, AI).

## Document Control

- Status: Active
- Owner: Product
- Last updated: 2026-04-15
- Canonical: Yes

## 0-30 days (Revenue + execution fundamentals)

### Objective

Improve sales execution quality and manager visibility with measurable weekly impact.

### Deliverables

1. ~~**Workflow Automations v1**~~ **Shipped** — see `docs/master-implementation-history.md#implementation-history` (Part B, section 21).
2. ~~**Lead Scoring v2**~~ **Shipped** — same section.

3. **Manager Dashboard Pack**
   - MQL->SQL conversion rate
   - stage aging heatmap
   - owner response-time KPI.

4. **Onboarding + Activation**
   - guided setup checklist per workspace,
   - first-value milestones (import contacts, create first deal, send first sequence).

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
3. Manager Dashboard Pack
4. Onboarding + Activation (parallel where capacity allows)
5. SSO/SCIM readiness
6. API/Webhooks
7. AI Copilot v2 + Forecasting

## Immediate sprint start (next coding block)

**Manager Dashboard Pack** first (unblocks 0–30 success criteria), then **Onboarding + Activation**:

1. Define KPI queries and empty/loading states per dashboard widget.
2. Ship MQL→SQL + stage aging + response-time views with role-aware visibility.
3. Guided setup checklist: persistence model + Settings entry point + completion telemetry.
4. First-value milestones (import, first deal, first sequence) with progress persistence.

---


<a id="pro-backlog"></a>
## PRO backlog (execution board)

This is the actionable backlog derived from the 30/60/90 roadmap.

> **Status refresh (2026-04-15):** This board lists **remaining** execution work. Shipped items live in **`docs/master-implementation-history.md#implementation-history-sections-01-12`** (Part A) + **`docs/master-implementation-history.md#implementation-history`** (Part B) and in the status table in **`docs/README.md`**. Keep long “done” narratives out of this file.

## Document Control

- Status: Active
- Owner: Product/Engineering
- Last updated: 2026-04-15
- Canonical: Yes

## Shipped tracks (do not duplicate here)

All previously listed “in progress” packs (automations v1, scoring v2, lead maintenance ops, ops docs, email privacy/Ola 3, navigation, app shell, sell-ready security wave) are **done**. Narrative and ordering:

- **`docs/master-implementation-history.md#implementation-history-sections-01-12`** — sections **1–12** (includes **section 7** leads baseline).  
- **`docs/master-implementation-history.md#implementation-history`** (Part B) — sections **13–21** (status, maintenance, email hardening, navigation, UI shell, sell-ready, sprint archive, automations/scoring).
- **`docs/README.md`** — status snapshot table.

## Reference docs (team register)

- **Layout, shells, and empty states:** `docs/master-design-ui.md#design-system-and-layout` — when to use `crm-page` vs `crm-page-full`, `PanelEmpty` vs `EmptyState`, auth surfaces, and pre-merge checks.
- **User profile, display names, CRM consistency:** `docs/master-design-ui.md#user-profile-display-names` — what is implemented (`user_metadata` persistence), manual test checklist, and open gaps (CRM rows with plain-text names, editing other users from admin, etc.).

## Next

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
    - [ ] Translation QA checklist per release (EN/ES/PT + fallback strategy)
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
- [ ] Manager Dashboard Pack
  - [ ] MQL->SQL conversion KPI
  - [ ] Stage aging heatmap
  - [ ] Owner response-time KPI
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
| Enterprise permissions | Preset matrix + audit shipped; custom role builder open | Dynamic RBAC with profile presets + auditability | P0 |
| Branding/white-label | Baseline shipped (logo, color, domain, legal links) | Deeper white-label + partner flows | P1 |
| Integrations | Partial (email-focused) | Connector abstraction + webhooks + import mapping | P1 |
| Compliance operations | Runbooks + evidence index shipped; external DNS/RLS sign-off pending per tenant | Executable **tenant** automation + logged DR drills | P1 |
| Sales enablement packaging | Low | Vertical onboarding templates + deployment playbooks | P2 |

Execution order for GTM priorities matches **[Pro roadmap 30–60–90](#pro-roadmap-30-60-90)** (avoid duplicating here).

## Archived sprint (sell-ready product baseline)

The completed **two-week sprint** (stories, acceptance criteria, execution board) is archived in **`docs/master-implementation-history.md#implementation-history` (section 20)**. Decision: **`docs/master-release-qa.md#go-no-go-sell-ready-baseline`**.

## Work-In-Progress Limits (recommended)

- Max 2 concurrent tasks per engineer
- No new feature start if critical QA bug is open
- Merge gate: acceptance checklist + i18n/locale smoke pass
