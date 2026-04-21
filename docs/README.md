# CRM documentation

**Canonical product and engineering narrative** for CRM Pro: eight consolidated **master** documents plus a **project bridge** that ties this folder to `.planning/`.

## Start here

| If you… | Open |
|--------|------|
| Need **v1 phases**, deploy checklist IDs, or latest milestone note | [`.planning/STATE.md`](../.planning/STATE.md) · [`.planning/ROADMAP.md`](../.planning/ROADMAP.md) · [`.planning/REQUIREMENTS.md`](../.planning/REQUIREMENTS.md) |
| Want **one map** of “docs vs `.planning`”, hosting intent, and **known gaps** | [**`project-state.md`**](./project-state.md) |
| Need **who closes which `[ ]`** (code vs ops vs legal vs evidence) | [`checkbox-ownership-matrix.md`](./checkbox-ownership-matrix.md) |
| Ship **static hosting** (SPA rewrites, `VITE_APP_CHANNEL`, `VITE_*` per env, preview vs prod) | [`deployment-spa-and-env.md`](./deployment-spa-and-env.md) |
| Start **Google Gmail** restricted-scope verification | [`google-gmail-oauth-verification.md`](./google-gmail-oauth-verification.md) |
| Run **production smoke** after deploy | [`smoke-checklist-production.md`](./smoke-checklist-production.md) |
| Own **roadmap / backlog** (30–60–90, GTM matrix) | [`master-roadmap-backlog.md`](./master-roadmap-backlog.md) |
| Compare **Pipedrive vs CRM Pro**, webhooks parity, group priorities | [`master-pipedrive-crm-pro-comparison.md`](./master-pipedrive-crm-pro-comparison.md) |
| Need **what shipped** (chronological handoff) | [`master-implementation-history.md`](./master-implementation-history.md) |

Verify consolidated `docs/` layout (no legacy split sources; masters present): `npm run docs:verify-consolidation`. Normalize phase snapshot headers: `npm run docs:fix-phase-headers`.

---

## Master documents (by topic)

| Topic | Master | Main sections |
|-------|--------|----------------|
| Security, compliance, SSO, evidence, Gitea | [`master-security-compliance.md`](./master-security-compliance.md) | Auth/SSO handoff, hardening matrix, evidence index, Supabase external checklist, DSAR, compliance mapping |
| Email (deliverability, privacy, release, smoke) | [`master-email-operations.md`](./master-email-operations.md) | Resend/DNS, mailbox privacy, release checklist, 15‑min smoke |
| Leads: scoring backend, maintenance, retention | [`master-lead-management.md`](./master-lead-management.md) | Edge maintenance contract, Ops dashboard, runbook, data retention |
| Design system, theme, navigation, profiles | [`master-design-ui.md`](./master-design-ui.md) · [`design-system-reference.md`](./design-system-reference.md) | Page shells, **main canvas** (`.app-main-surface`), mobile drawer + command palette; **reference** adds tokens, motion buckets, charts/locale loading, `ui:lint`, density |
| Release, QA, go/no-go, production handoff | [`master-release-qa.md`](./master-release-qa.md) | Sell-ready checklist, QA evidence, go/no-go, production handoff |
| Implementation history (full handoff) | [`master-implementation-history.md`](./master-implementation-history.md) | Part A §1–12 · Part B §13–24 |
| Roadmap 30/60/90 + execution backlog | [`master-roadmap-backlog.md`](./master-roadmap-backlog.md) | Horizon roadmap · Pro backlog board |
| Competitive / integration parity (Pipedrive, webhooks, API) | [`master-pipedrive-crm-pro-comparison.md`](./master-pipedrive-crm-pro-comparison.md) | Benchmark tables · Webhooks v1 spec · Top gaps · Executive summary |
| Manager `/manager` KPI definitions (MQL/SQL, aging, first-touch) | [`manager-dashboard-metrics.md`](./manager-dashboard-metrics.md) | Data contract + i18n key map (narrative in implementation history §23) |

---

## By role (quick paths)

- **Product / PM** — [`master-roadmap-backlog.md`](./master-roadmap-backlog.md) · [`master-pipedrive-crm-pro-comparison.md`](./master-pipedrive-crm-pro-comparison.md) · [`.planning/REQUIREMENTS.md`](../.planning/REQUIREMENTS.md) · [`project-state.md`](./project-state.md#gaps-not-fully-owned-by-a-single-master-today)
- **Engineering (feature work)** — [`master-implementation-history.md`](./master-implementation-history.md) Part B · [`master-design-ui.md`](./master-design-ui.md#design-system-and-layout) · [`.planning/codebase/CONVENTIONS.md`](../.planning/codebase/CONVENTIONS.md)
- **Ops / SRE / release** — [`master-release-qa.md`](./master-release-qa.md#production-handoff-checklist) · [`master-security-compliance.md`](./master-security-compliance.md#supabase-external-hardening-checklist) · [`master-lead-management.md`](./master-lead-management.md#lead-maintenance-runbook)
- **Security / buyer reviews** — [`master-security-compliance.md`](./master-security-compliance.md#sell-ready-security-evidence-index) · [`master-email-operations.md`](./master-email-operations.md#email-deliverability-resend)

---

## Status snapshot (high level)

| Area | State | Document |
|------|--------|----------|
| Security, compliance, SSO, Gitea, evidence | Baseline shipped Apr 2026 + external sign-offs per env | [`master-security-compliance.md`](./master-security-compliance.md) |
| Email (deliverability, privacy, release, smoke) | Active runbooks | [`master-email-operations.md`](./master-email-operations.md) |
| Lead maintenance, scoring backend, retention | Ops + telemetry + retention policy | [`master-lead-management.md`](./master-lead-management.md) |
| Design system, theme, navigation, profiles | UI reference | [`master-design-ui.md`](./master-design-ui.md) |
| Release, QA, go/no-go, production handoff | Gates and evidence | [`master-release-qa.md`](./master-release-qa.md) |
| Implementation history (full handoff) | Part A + Part B | [`master-implementation-history.md`](./master-implementation-history.md) |
| Roadmap 30/60/90 + execution backlog | Forward plan | [`master-roadmap-backlog.md`](./master-roadmap-backlog.md) |
| Pipedrive comparison, webhooks/API parity | Active narrative | [`master-pipedrive-crm-pro-comparison.md`](./master-pipedrive-crm-pro-comparison.md) |
| v1 milestone + deploy IDs + bridge / gaps | Tracker + explainer | [`.planning/`](../.planning/) · [`project-state.md`](./project-state.md) |

---

## Other entry points

- Main app overview: [`../README.md`](../README.md)
- Supabase SQL and migrations: [`../supabase/README.md`](../supabase/README.md)
- Deploy + env: [`deployment-spa-and-env.md`](./deployment-spa-and-env.md) · Hosted E2E: set `E2E_STAGING_URL` (see [`../e2e/smoke.spec.ts`](../e2e/smoke.spec.ts))

---

## Conventions

- Prefer editing **`master-*.md`** for narrative and runbooks; use **`.planning/`** for phase status and requirement checkboxes.
- Cross-links inside masters use relative paths: `./master-….md#anchor-id`.
- Avoid duplicating long “done” narratives in the roadmap master; point to [`master-implementation-history.md`](./master-implementation-history.md) instead.

---

## Document control

- **Status:** Active  
- **Owner:** Engineering  
- **Last updated:** 2026-04-21  
- **Canonical:** Yes  
