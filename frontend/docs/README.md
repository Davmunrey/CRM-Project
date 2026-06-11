# n0CRM — product documentation

**Canonical product and engineering narrative** for n0CRM: nine consolidated **`master-*.md`** documents plus a **project bridge** that ties this folder to `.planning/`.

## Start here

| If you… | Open |
|--------|------|
| Need **v1 phases**, deploy checklist IDs, or latest milestone note | [`.planning/STATE.md`](../.planning/STATE.md) · [`.planning/ROADMAP.md`](../.planning/ROADMAP.md) · [`.planning/REQUIREMENTS.md`](../.planning/REQUIREMENTS.md) |
| Want **one map** of “docs vs `.planning`”, hosting intent, and **known gaps** | [**`project-state.md`**](./project-state.md) |
| Need a **file-by-file map** of the whole codebase (API + frontend + migrations + infra) | [**`../../docs/CODEBASE-MAP.md`**](../../docs/CODEBASE-MAP.md) |
| Need **who closes which `[ ]`** (code vs ops vs legal vs evidence) | [`project-state.md` — Checkbox ownership](./project-state.md#checkbox-ownership) |
| Ship **static hosting** (SPA rewrites, `VITE_APP_CHANNEL`, env vars, optional API E2E smoke) | [`deployment-spa-and-env.md`](./deployment-spa-and-env.md) |
| Sequences **flow editor**, `flow_definition` JSON, enrollments, the linear runner | [`sequences-flow.md`](./sequences-flow.md) |
| Set up **Google / Gmail** OAuth (Client ID/Secret, self-hosted frontend callback, deploy) + **restricted-scope** verification | Setup: [`google-gmail-oauth-verification.md#operator-setup-google-oauth`](./google-gmail-oauth-verification.md#operator-setup-google-oauth) · Pending: [`#outstanding-google-integration`](./google-gmail-oauth-verification.md#outstanding-google-integration) |
| Stand up **enterprise SSO / SCIM** for an IdP (Entra / Okta / OneLogin) | [`../../docs/sso-and-scim.md`](../../docs/sso-and-scim.md) |
| Run **production smoke** after deploy | [`smoke-checklist-production.md`](./smoke-checklist-production.md) |
| Own **roadmap / backlog** (30–60–90, GTM matrix) | [`master-roadmap-backlog.md`](./master-roadmap-backlog.md) |
| Compare **Pipedrive vs n0CRM**, webhooks parity, group priorities | [`master-pipedrive-velo-comparison.md`](./master-pipedrive-velo-comparison.md) |
| Need **what shipped** (chronological handoff) | [`master-implementation-history.md`](./master-implementation-history.md) |
| Understand the **tenant-isolation / RLS** decision | [`../../docs/adr/0001-tenant-isolation-and-rls.md`](../../docs/adr/0001-tenant-isolation-and-rls.md) |

Verify consolidated `docs/` layout (no legacy split sources; masters present; **only allowlisted** `docs/*.md`): `npm run docs:verify-consolidation`. Normalize phase snapshot headers: `npm run docs:fix-phase-headers`.

---

## Master documents (by topic)

| Topic | Master | Main sections |
|-------|--------|----------------|
| Security, compliance, SSO/SCIM, MFA, RBAC, evidence | [`master-security-compliance.md`](./master-security-compliance.md) | Password checklist + Zustand hygiene, auth + OIDC SSO + SCIM handoff, MFA, server-side RBAC, hardening matrix, evidence index, DSAR (GDPR export/erasure), SOC2/GDPR mapping |
| Email (deliverability, privacy, release, smoke) | [`master-email-operations.md`](./master-email-operations.md) | SMTP/Resend + DNS, mailbox privacy, tracking, release checklist, 15‑min smoke |
| Leads: CRUD backend, public capture, retention | [`master-lead-management.md`](./master-lead-management.md) | Lead CRUD, public capture (`POST /public/v1/leads`), scoring, data retention |
| Design system, theme, navigation, profiles | [`master-design-ui.md`](./master-design-ui.md) · [`design-system-reference.md`](./design-system-reference.md) | Page shells, **main canvas** (`.app-main-surface`), mobile drawer + command palette; **reference** adds tokens, motion buckets, charts/locale loading, `ui:lint`, density |
| Release, QA, go/no-go, production handoff | [`master-release-qa.md`](./master-release-qa.md) | Sell-ready checklist, QA evidence, go/no-go, production handoff |
| Implementation history (full handoff) | [`master-implementation-history.md`](./master-implementation-history.md) | Part A §1–12 · Part B §13–31+ |
| Public REST API (phase 1) | [`public-api-phase1.md`](./public-api-phase1.md) | `POST /public/v1/leads` · `x-api-key` header (`leads:write` scope) |
| Public lead capture | [`lead-capture-public-endpoint.md`](./lead-capture-public-endpoint.md) | `POST /public/v1/leads`, `x-api-key`, honeypot, duplicate handling |
| Roadmap 30/60/90 + execution backlog | [`master-roadmap-backlog.md`](./master-roadmap-backlog.md) | Horizon roadmap · execution backlog (legacy section IDs, not the old product name) |
| Competitive / integration parity (Pipedrive, webhooks, API) | [`master-pipedrive-velo-comparison.md`](./master-pipedrive-velo-comparison.md) | Benchmark tables · Webhooks spec · Top gaps · Executive summary (n0CRM vs Pipedrive) |
| Manager `/manager` KPI definitions (MQL/SQL, aging, first-touch) | [`master-implementation-history.md` §23 + data contract](./master-implementation-history.md#manager-dashboard-data-contract) | Section 23 narrative; [subsection](./master-implementation-history.md#manager-dashboard-data-contract) for tables, i18n keys, tests |

---

## By role (quick paths)

- **Product / PM** — [`master-roadmap-backlog.md`](./master-roadmap-backlog.md) · [`master-pipedrive-velo-comparison.md`](./master-pipedrive-velo-comparison.md) · [`.planning/REQUIREMENTS.md`](../.planning/REQUIREMENTS.md) · [`project-state.md`](./project-state.md#gaps-not-fully-owned-by-a-single-master-today)
- **Engineering (feature work)** — [`master-implementation-history.md`](./master-implementation-history.md) Part B · [`master-design-ui.md`](./master-design-ui.md#design-system-and-layout) · [`../../docs/CODEBASE-MAP.md`](../../docs/CODEBASE-MAP.md) · [`.planning/CODEBASE.md` (Conventions)](../.planning/CODEBASE.md#coding-conventions)
- **Ops / SRE / release** — [`master-release-qa.md`](./master-release-qa.md#production-handoff-checklist) · [`../../docs/disaster-recovery.md`](../../docs/disaster-recovery.md) · [`master-lead-management.md`](./master-lead-management.md)
- **Security / buyer reviews** — [`master-security-compliance.md`](./master-security-compliance.md) · [`../../docs/sso-and-scim.md`](../../docs/sso-and-scim.md) · [`master-email-operations.md`](./master-email-operations.md#email-deliverability)

---

## Status snapshot (high level)

| Area | State | Document |
|------|--------|----------|
| Security, compliance, SSO/SCIM, MFA, RBAC, evidence | Enterprise P0 shipped (2026-06) | [`master-security-compliance.md`](./master-security-compliance.md) |
| Email (deliverability, privacy, release, smoke) | Active runbooks (self-hosted API) | [`master-email-operations.md`](./master-email-operations.md) |
| Lead CRUD, public capture, retention | Active | [`master-lead-management.md`](./master-lead-management.md) |
| Design system, theme, navigation, profiles, **list toolbars** | UI reference | [`master-design-ui.md`](./master-design-ui.md#entity-list-toolbars-contacts-companies-deals) |
| Release, QA, go/no-go, production handoff | Gates and evidence | [`master-release-qa.md`](./master-release-qa.md) |
| Implementation history (full handoff) | Part A + Part B (§1–12 + §13–31+) | [`master-implementation-history.md`](./master-implementation-history.md) |
| Roadmap 30/60/90 + execution backlog | Forward plan | [`master-roadmap-backlog.md`](./master-roadmap-backlog.md) |
| Pipedrive comparison, webhooks/API parity | Active narrative | [`master-pipedrive-velo-comparison.md`](./master-pipedrive-velo-comparison.md) |
| v1 milestone + deploy IDs + bridge / gaps | Tracker + explainer | [`.planning/`](../.planning/) · [`project-state.md`](./project-state.md) |

---

## Other entry points

- Main app overview + dev setup: [`../README.md`](../README.md)
- Repo overview + quick start: [`../../README.md`](../../README.md)
- API (Fastify backend, PostgreSQL, JWT auth): [`../../api/README.md`](../../api/README.md)
- Full codebase map: [`../../docs/CODEBASE-MAP.md`](../../docs/CODEBASE-MAP.md)
- Deploy + env + Docker full-stack: [`deployment-spa-and-env.md`](./deployment-spa-and-env.md) · Browser smoke: set `E2E_STAGING_URL` (see [`../e2e/smoke.spec.ts`](../e2e/smoke.spec.ts))

---

## Conventions

- Prefer editing **`master-*.md`** for narrative and runbooks; use **`.planning/`** for phase status and requirement checkboxes.
- Cross-links inside masters use relative paths: `./master-….md#anchor-id`.
- Avoid duplicating long “done” narratives in the roadmap master; point to [`master-implementation-history.md`](./master-implementation-history.md) instead.
- **Language:** prose in `docs/` is **English** engineering narrative. End-user UI strings are localized via [`src/i18n`](../src/i18n) (`useTranslations` / `getTranslations`); see [`design-system-reference.md`](./design-system-reference.md) (*i18n guardrails* / `i18n:lint`) — do not mirror locale catalogs in Markdown.

### Formatting standard (applies to all Markdown in this repo)

- **One canonical home:** before adding a new file, prefer extending an existing **master** or a single allowlisted doc. Consolidate; do not duplicate narratives.
- **Heading structure:** exactly one `#` title; use `##` / `###` for sections; no skipped levels.
- **Links:** use **relative** links inside the repo (e.g. `./file.md#anchor`), and avoid linking to deleted or renamed planning artifacts.
- **“Last updated” metadata:** every doc must have either:
  - a `## Document control` block with `- **Last updated:** YYYY-MM-DD`, or
  - a git footer `*Last updated (git): **YYYY-MM-DD***` (maintained by `node scripts/md-chronology.mjs apply-footers`).
- **Tables:** include a header row + separator row; keep date columns ISO (`YYYY-MM-DD`).
- **Checklists:** use `- [ ]` only for items that have a clear owner and closure evidence path; otherwise use bullets.

---

## Adding documentation

- **Do not** add a new `docs/*.md` file unless you **extend** [`scripts/verify-docs-consolidation.mjs`](../scripts/verify-docs-consolidation.mjs) (`DOCS_MD_ALLOWLIST`) and update this README index. CI fails on unexpected Markdown files under `docs/`.
- Prefer extending the relevant **`master-*.md`**, [`deployment-spa-and-env.md`](./deployment-spa-and-env.md) (hosting, env vars, optional Playwright API smoke), or [`project-state.md`](./project-state.md). Stable narrative lives here; phase checklists stay under [`.planning/`](../.planning/).

---

## Document control

- **Status:** Active  
- **Owner:** Engineering  
- **Last updated:** 2026-06-11  
- **Canonical:** Yes
