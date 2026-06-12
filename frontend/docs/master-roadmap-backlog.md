# Roadmap & backlog (master)

> Consolidated **2026-04-15**. 30/60/90 roadmap plus execution backlog in one place.

**Replaces:** pro-roadmap-30-60-90, pro-backlog.

> **Naming note:** `PRO` / `pro-backlog` / `pro-roadmap` are **legacy internal document IDs** from the pre-consolidation doc split. They are **not** the retired commercial product name.

## Table of contents

- [Roadmap (30 / 60 / 90 days)](#pro-roadmap-30-60-90)
- [PRO backlog (execution board)](#pro-backlog)

---


<a id="pro-roadmap-30-60-90"></a>
## Roadmap (30 / 60 / 90 days)

This roadmap starts from the current implemented baseline and prioritizes features that move the product closer to HubSpot/Pipedrive-level value.

> **Status refresh (2026-06-11):** Monorepo restructure complete (frontend/ + api/ + docker-compose.yml). Navigation customization, core i18n (EN/ES/PT + partial FR/DE/IT), sell-ready **product** baseline, security hardening (Redis JWT denylist, Socket.io JWT verification, AES-256-GCM encryption, rate limiting), **Workflow Automations v1 + Lead Scoring v2**, **Manager Dashboard Pack + Onboarding**, Gmail fully self-hosted (api/src/routes/gmail.ts + calendar.ts), **LinkedIn URL enrichment on contacts** (migration 012), Slack/Zoom/Google Calendar integrations, Public REST API (`POST /api/public/v1/leads`, `x-api-key` + `leads:write` scope), API key management are shipped. The **enterprise readiness wave is now shipped**: **MFA (TOTP)**, **OIDC SSO**, **SCIM 2.0 provisioning**, **server-side RBAC + member lifecycle**, **GDPR data-subject endpoints**, **multi-provider AI agent + governance**, **observability stack** — see the new **[Shipped (enterprise readiness)](#shipped-enterprise-readiness)** section. This roadmap now tracks only genuinely-open horizons (SAML, broader SSO provider testing, field-level security, forecasting, AI v2, industry pipeline templates, HA/DR drills, certifications). **Ola C (docs):** i18n execution waves, per-release translation QA template — see [`master-implementation-history` — section 22](./master-implementation-history.md#implementation-history-section-22).

## Document Control

- Status: Active
- Owner: Product
- Last updated: 2026-06-11
- Canonical: Yes

<a id="shipped-enterprise-readiness"></a>
## ✅ Shipped (enterprise readiness)

The 31-60 and 61-90 horizons below have substantially shipped. These tracks are **done** and tracked in code, not in the roadmap — kept here so they are not re-planned:

| Capability | Status | Where it lives |
|---|---|---|
| **MFA (TOTP, RFC 6238)** | Shipped | `/auth/mfa/setup·enable·disable`; enroll in Settings > Security; login code prompt; AES-256-GCM secret; migration 019 |
| **OIDC SSO** | Shipped | `/auth/sso/status·start·callback`; PKCE S256, JWKS RS256 verify, JIT provisioning, `OIDC_DEFAULT_ROLE`; frontend SSO button gated by `/auth/sso/status` |
| **SCIM 2.0 provisioning** | Shipped | `/scim/v2` Users CRUD + ServiceProviderConfig; Bearer api-key scoped `scim`; soft-deprovision + session revoke; last-active-owner protected; audit-logged |
| **Server-side RBAC** | Shipped | `requirePermission` / `requireCrudPermission` across CRM CRUD + member/API-key/webhook mgmt; roles owner/admin/manager/sales_rep/viewer (`api/src/middleware/rbac.ts`, `api/src/services/permissions.ts`) |
| **Member lifecycle** | Shipped | `PATCH /orgs/me/members/:id/role·status` with safety rules (last-active-owner protected) |
| **Public API scopes** | Shipped | `POST /api/public/v1/leads`, header `x-api-key`, requires scope `leads:write` (403 otherwise); minted in Settings > Integrations with scope selector (`leads:write`, `scim`) |
| **GDPR data-subject endpoints** | Shipped | `/privacy` org export (Art. 20), subject export (Art. 15), erasure/anonymize (Art. 17); owner/admin gated; audit-logged |
| **Multi-provider AI + governance** | Shipped | Gemini (free default) / OpenAI / Anthropic; tool-using CRM agent, persisted conversations, assistant drawer, next-best-action, Inbox summarize + draft-reply; per-org kill switch `settings.ai.enabled`, `AI_MONTHLY_TOKEN_CAP`, `AI_MESSAGE_RETENTION_DAYS` purge; migration 018 |
| **Security-event audit log** | Shipped | `security_events` table + `recordSecurityEvent`; migration 020 |
| **Observability** | Shipped | `x-request-id` correlation, `captureException`, `/health` `/health/ready` `/health/live`, optional `SENTRY_DSN`, `/metrics` (loopback/internal-key gated), Prometheus + Grafana |
| **Updates & @mentions** (Monday-style) | Shipped | Threaded `/updates` on contacts/companies/deals/leads; @mention autocomplete → notifications; replies + soft-delete; migration 021 (`item_updates`) |
| **Calendar + Timeline views** (Monday-style) | Shipped | Deals board view modes (alongside Kanban/List): month Calendar by `expectedCloseDate` + Gantt Timeline, stage-colour-coded |
| **Composable dashboard widgets** (Monday-style) | Shipped | Overview/Custom toggle; drag-and-drop number/bar/funnel/list widgets computed from stores; per-user layout via `PATCH /preferences/me/dashboard` (migration 022) |
| **Automation recipe center** (Monday-style) | Shipped | Visual builder + searchable template library + starter templates + "when → then" recipe lines on rule/template cards (over the existing `automation_rules` backend) |
| **Web-to-lead form builder** (HubSpot/Pipedrive-style) | Shipped | Public `GET/POST /public/forms/:token` (honeypot + rate limit) + hosted form `{origin}/forms/<token>` → leads (`source: web_form`); migration 023. Builder UI in Settings → Integrations: title/success/field toggles saved via `PATCH /integrations/lead-capture-tokens/:id`, plus form URL + iframe embed snippet. |
| **Deal rotting + activity-based selling** (Pipedrive-style) | Shipped | Kanban flags: "Rotting" (open deal idle ≥ 14d) + "No next activity scheduled"; `utils/dealRot.ts` (computeDealRot, hasUpcomingActivity) |
| **Help desk / tickets** (HubSpot Service / Zoho Desk-style) | Shipped | `tickets` entity (status/priority/assignee, contact/company links) + `/tickets` CRUD (RBAC `tickets` resource, migration 024) + Tickets page (status-filtered queue, inline edit, create slide-over) |

> **Tenant isolation note:** app-layer org scoping is the authoritative control; RLS is opt-in defense-in-depth (see `docs/adr/0001-tenant-isolation-and-rls.md`).

## 0-30 days (Revenue + execution fundamentals)

### Objective

Improve sales execution quality and manager visibility with measurable weekly impact.

### Deliverables

1. ~~**Workflow Automations v1**~~ **Shipped** — see `docs/master-implementation-history.md#implementation-history` (Part B, section 21).
2. ~~**Lead Scoring v2**~~ **Shipped** — same section.

3. ~~**Manager Dashboard Pack**~~ **Shipped** — route `/manager`, definitions in [`master-implementation-history` — Manager dashboard data contract](./master-implementation-history.md#manager-dashboard-data-contract), narrative in [`master-implementation-history` — section 23](./master-implementation-history.md#implementation-history-section-23).
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

1. ~~**SSO/SCIM Readiness Pack**~~ **Shipped (core)** — OIDC SSO (`/auth/sso`, PKCE S256, JWKS verify, JIT provisioning) and SCIM 2.0 (`/scim/v2` Users CRUD + ServiceProviderConfig) are live; see [Shipped (enterprise readiness)](#shipped-enterprise-readiness) and `docs/sso-and-scim.md`.
   - **Still open:** provider diagnostics UI, broader SSO provider testing / connection health checks, SAML federation.

2. **Governance and Security v2** — _partially shipped_
   - ~~expanded audit coverage for auth/admin changes~~ **Shipped** — `security_events` table + `recordSecurityEvent` (migration 020); permission-change audit trail.
   - **Still open:** field-level visibility controls for sensitive data.
   - **Still open:** tenant-automated retention / delete jobs (engineering runbooks: `docs/master-lead-management.md#data-retention-runbook`, `docs/master-security-compliance.md#dsar-playbook` — product automation still to build). _Note: ad-hoc GDPR subject export/erasure (Art. 15/17/20) is shipped at `/privacy`; scheduled per-tenant purge remains open._

3. **API + Webhooks** — _partially shipped_
   - ~~stable public API surface~~ **Shipped** — `POST /api/public/v1/leads` (header `x-api-key`, scope `leads:write`); API keys minted in Settings > Integrations with scope selector.
   - **Still open:** broader public surface for additional core entities, outbound webhook subscriptions (lead/deal/activity lifecycle events), replay/dead-letter strategy.

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

1. **AI Copilot** — _v1 shipped, v2 open_
   - ~~next-best-action recommendations~~ **Shipped** — multi-provider AI agent (Gemini/OpenAI/Anthropic), tool-using CRM agent, persisted conversations, assistant drawer, Inbox summarize + draft-reply; governance kill switch + token cap + retention purge.
   - **Still open (v2):** account summary, meeting prep briefs, deeper contextual email draft generation.

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
5. ~~SSO/SCIM readiness~~ (OIDC SSO + SCIM 2.0 done; SAML + provider diagnostics open)
6. ~~Public API (leads:write scope)~~ (done; outbound webhooks open)
7. AI Copilot v2 + Forecasting

## Immediate sprint start (next coding block)

~~**Manager Dashboard Pack**~~ and ~~**Onboarding + Activation**~~ **(done)** — see [`master-implementation-history` — section 23](./master-implementation-history.md#implementation-history-section-23) and [Manager dashboard data contract](./master-implementation-history.md#manager-dashboard-data-contract).

1. ~~Define KPI queries and empty/loading states per dashboard widget.~~
2. ~~Ship MQL→SQL + stage aging + response-time views with role-aware visibility.~~
3. ~~Guided setup checklist: persistence model + Settings entry point + completion telemetry.~~
4. ~~First-value milestones (import, first deal, first sequence) with progress persistence.~~

---


<a id="pro-backlog"></a>
## PRO backlog (execution board)

This is the actionable backlog derived from the 30/60/90 roadmap.

> **Status refresh (2026-06-11):** This board lists **remaining** execution work. The enterprise readiness wave (MFA, OIDC SSO, SCIM 2.0, server-side RBAC + member lifecycle, GDPR endpoints, multi-provider AI + governance, observability) has **shipped** — see [Shipped (enterprise readiness)](#shipped-enterprise-readiness). Other shipped items live in **`docs/master-implementation-history.md#implementation-history-sections-01-12`** (Part A) + **`docs/master-implementation-history.md#implementation-history`** (Part B) and in the status table in **`docs/README.md`**. Keep long “done” narratives out of this file.

## Document Control

- Status: Active
- Owner: Product/Engineering
- Last updated: 2026-06-11
- Canonical: Yes

## Shipped tracks (do not duplicate here)

All previously listed “in progress” packs (automations v1, scoring v2, lead maintenance ops, ops docs, email privacy/Ola 3, navigation, app shell, sell-ready security wave, monorepo restructure, backend hardening) are **done**. Narrative and ordering:

- **`docs/master-implementation-history.md#implementation-history-sections-01-12`** — sections **1–12** (includes **section 7** leads baseline).  
- **`docs/master-implementation-history.md#implementation-history`** (Part B) — sections **13–28** (status, maintenance, email hardening, navigation, UI shell, sell-ready, sprint archive, automations/scoring, Ola C docs, manager dashboard + onboarding, April 2026 UI quality pass, Supabase-only shell + password UX + integrations/API waves, May 2026 monorepo + API hardening).
- **`docs/README.md`** — status snapshot table.

## Reference docs (team register)

- **Planning vs product docs:** [`docs/project-state.md`](./project-state.md) — when to use `.planning/` vs `master-*`, v1 deploy intent, and documented gaps.
- **Layout, shells, and empty states:** `docs/master-design-ui.md#design-system-and-layout` — when to use `crm-page` vs `crm-page-full`, `PanelEmpty` vs `EmptyState`, auth surfaces, and pre-merge checks.
- **User profile, display names, CRM consistency:** `docs/master-design-ui.md#user-profile-display-names` — what is implemented (`user_metadata` persistence), manual test checklist, and open gaps (CRM rows with plain-text names, editing other users from admin, etc.).

## Next

### Founder-led category strategy (90-day execution lock)

This section is the operating reference for the founder-led push to "top-tier" execution quality without scaling headcount.

#### 1) ICP and battlefield

- **Primary ICP:** founder-led and small revenue teams (2-20 seats) that need faster outbound execution and simpler workflows than heavy CRMs.
- **Secondary ICP:** SMB teams graduating from spreadsheets/notion-style pipelines that need process discipline without enterprise overhead.
- **Competitive stance:** beat HubSpot/Salesforce on speed-to-value, beat Pipedrive on execution intelligence and trust posture.

#### 2) Killer promise

- **Promise:** "From first login to first predictable pipeline action in under 10 minutes, with enterprise-grade trust defaults."

#### 3) Anti-roadmap (explicit NO list for this quarter)

- No horizontal "platform rebuild" work that does not improve activation, retention, or trust evidence.
- No broad integration matrix expansion before core journey reliability and onboarding conversion targets are hit.
- No generic AI assistant: only workflow-linked recommendations with measurable impact.

#### 4) Priority scorecard (must pass to enter sprint)

Score each candidate initiative from 1-5:

| Dimension | Description |
|---|---|
| Revenue impact | Expected effect on conversion, expansion, or retention |
| User pain relief | Severity/frequency of current friction |
| Trust leverage | Security/compliance/reliability improvement visible to buyers |
| Founder effort | Total implementation + ops burden for solo-founder execution |
| Time to evidence | How fast we can measure success/failure after shipping |

Execution rule: only initiatives with high combined score and low founder burden enter active sprint.

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
  - [x] Engineering runbooks: `docs/master-lead-management.md#data-retention-runbook`, `docs/master-security-compliance.md#dsar-playbook` (procedures + evidence index)
  - [x] **Product:** in-app / operator-assisted DSR tooling — `/privacy` endpoints for org export (Art. 20), subject export (Art. 15), erasure/anonymize (Art. 17), owner/admin gated, audit-logged
  - [x] **Product:** security-event audit log (`security_events` table + `recordSecurityEvent`, migration 020)
  - [ ] **Product:** per-tenant *scheduled* retention / automated purge where required by contract
  - [ ] Backup/restore and DR **test cadence** executed and logged (restore runbook at `docs/disaster-recovery.md`; calendar owner = Ops)
- [x] Manager Dashboard Pack **(shipped)**
  - [x] MQL/SQL snapshot + mix KPI (see metrics doc)
  - [x] Stage aging heatmap (open deals × `updatedAt` buckets)
  - [x] Owner first-touch / response-time KPI (median hours, completed touch activities)
- [ ] API + Webhooks baseline
  - [x] Public endpoint policy and versioning — `POST /api/public/v1/leads` (versioned `/v1`), `x-api-key` auth + `leads:write` scope, keys minted in Settings > Integrations
  - [ ] Broader public surface for additional core entities
  - [ ] Webhook subscriptions with retries

## Later (remaining horizons)

Reduced to genuinely-open work — the enterprise readiness wave above has shipped.

- [x] ~~SSO/SCIM enterprise readiness~~ — OIDC SSO + SCIM 2.0 shipped; see [Shipped (enterprise readiness)](#shipped-enterprise-readiness)
- [ ] SAML federation
- [ ] Broader SSO provider testing / diagnostics UI / connection health checks
- [ ] Field-level security (sensitive-field visibility controls)
- [ ] Forecasting intelligence (weighted forecast, commit/best/worst views, slippage prediction)
- [ ] AI copilot v2 (account summaries, meeting prep briefs)
- [ ] Industry pipeline templates (SaaS, Services, Real Estate, Insurance)
- [ ] HA/DR automated failover + logged DR drills (restore runbook at `docs/disaster-recovery.md`)
- [ ] Formal certifications (SOC 2 / ISO 27001 audits)
- [ ] Real background job queue (BullMQ present but unused)

## Differentiation wedge and growth loop (founder-led)

### Wedge definition

- **Wedge product:** Revenue Execution Copilot
  - next-best-action prompts from current pipeline context,
  - contextual email draft starters linked to the exact stage/task,
  - manager-facing operational forecast cues (slippage and attention risk).

### Growth loop

- Weekly cycle:
  - collect top friction and top "aha" from active users,
  - ship one conversion-focused improvement and one retention-focused improvement,
  - review onboarding completion, first-value time, and WAU delta.
- Packaging cycle (bi-weekly):
  - refine plan tiers around trust and execution outcomes,
  - update demo narrative from real shipped value (no aspirational sales deck claims).

## Sell-Readiness Matrix (Go-To-Market)

Use this matrix as release gates before onboarding broader customer segments.

| Capability | Current | Target | Priority |
|---|---|---|---|
| Multi-industry adaptability | Pipeline MVP (rename stages/probabilities) + custom fields; **industry templates** not shipped | Tenant-configurable pipelines + naming + templates | P0 |
| Language/locale quality | EN/ES/PT + formatter baseline + sell-ready QA; FR/DE/IT partial; **residual hardcoded strings** possible in edge screens | 100% UI i18n + locale-aware formatting | P0 |
| Manager / activation | **Shipped:** `/manager` KPI pack ([data contract](./master-implementation-history.md#manager-dashboard-data-contract)) + onboarding checklist/banner ([section 23](./master-implementation-history.md#implementation-history-section-23)) | Org-wide analytics (e.g. cross-rep email rollups), deeper cohort MQL→SQL | P0 |
| Enterprise permissions | Preset matrix + audit shipped; custom role builder open | Dynamic RBAC with profile presets + auditability | P0 |
| Branding/white-label | Baseline shipped (logo, color, domain, legal links) | Deeper white-label + partner flows | P1 |
| Integrations | Partial (email-focused) | Connector abstraction + webhooks + import mapping | P1 |
| Compliance operations | Runbooks + evidence index shipped; GDPR subject export/erasure (`/privacy`) + security-event audit log shipped; scheduled per-tenant purge + logged DR drills open | Scheduled **tenant** retention automation + logged DR drills + formal certs | P1 |
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
| ~~In-app / operator-assisted DSR tooling~~ | **Shipped** | `/privacy` org/subject export + erasure (GDPR Art. 15/17/20). |
| Per-tenant *scheduled* retention + automated purge | **31–60 days** | Governance pack; ad-hoc DSR shipped, scheduled purge open; engineering runbooks exist. |
| Backup/restore + DR **test cadence** logged | **31–60 days** (Ops) | Calendar owner; restore runbook at `docs/disaster-recovery.md`. |

## Archived sprint (sell-ready product baseline)

The completed **two-week sprint** (stories, acceptance criteria, execution board) is archived in **`docs/master-implementation-history.md#implementation-history` (section 20)**. Decision: **`docs/master-release-qa.md#go-no-go-sell-ready-baseline`**.

## Work-In-Progress Limits (recommended)

- Max 2 concurrent tasks per engineer
- No new feature start if critical QA bug is open
- Merge gate: acceptance checklist + i18n/locale smoke pass
