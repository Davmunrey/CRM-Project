# Security & Compliance (master)

> Consolidated **2026-04-15**; password policy and selector hygiene added **2026-04-22**. Single reference for auth/SSO contracts, hardening matrix, sell-ready evidence index, Supabase external checklist, SOC2/GDPR mapping, DSAR procedures, and Gitea CI governance.

**Replaces:** auth-sso-backend-handoff, hardening-matrix, sell-ready-security-evidence-index, supabase-external-hardening-checklist, compliance-mapping, dsar-playbook, gitea-operations.

## Table of contents

- [Client password policy and Zustand selectors](#client-password-policy-and-zustand-selectors)
- [Auth / SSO backend handoff](#auth-sso-backend-handoff)
- [Hardening matrix (audit-ready)](#hardening-matrix)
- [Sell-ready security & compliance evidence index](#sell-ready-security-evidence-index)
- [Supabase external hardening checklist](#supabase-external-hardening-checklist)
- [Compliance mapping (SOC2 / GDPR-lite)](#compliance-mapping)
- [DSAR playbook](#dsar-playbook)
- [Gitea production operations](#gitea-operations)

---

<a id="client-password-policy-and-zustand-selectors"></a>
## Client password policy and Zustand selectors

### Password UX and validation

- Shared helpers live in `src/lib/securePassword.ts` (`isStrongPassword`, `getPasswordRuleMet`, optional generator). Unit tests: `tests/lib/securePassword.test.ts`.
- `src/components/auth/SecurePasswordField.tsx` renders a live checklist (length, mixed case, digit, symbol) and optional generator; parents pass label strings from i18n so the checklist does not mount a second translation scope.
- Surfaces wired to the same rules: login (when org policy requires strong passwords), register, password reset, profile password change, and team member invite / password reset flows in team management.
- Org default `enforceStrongPasswordMinLength` (from `organizations.settings`) gates minimum length on the client; when it is off, the login form shows a short hint that the server may still reject weak passwords.

### React “maximum update depth” hygiene

- **Zustand selectors must return stable references.** Selecting a freshly constructed object (for example `getFlags()` that returns `{ ... }` every call) causes `useSyncExternalStore` to re-subscribe in a tight loop. Prefer selecting a primitive slice or a stable store field, then derive view objects with `useMemo` in the component.
- **Effects that call `setState` must depend on primitives**, not object identity from the host or Supabase session, unless the effect compares previous values and only updates when meaningfully changed.
- **Context providers** should memoize their `value` object when it aggregates several fields, so consumers do not re-render every parent render.

<a id="auth-sso-backend-handoff"></a>
## Auth / SSO backend handoff

The shipped SPA shell is **email/password + magic link** against Supabase; OAuth/SAML paths below describe **contracts already present in the client** for when backend SSO is enabled. Until those flows are turned on in Supabase and env, treat SSO as integration-ready, not default login.

## Document Control

- Status: Active
- Owner: Backend/Auth
- Last updated: 2026-04-22
- Canonical: Yes

## Frontend contract already implemented

- OAuth buttons call Supabase directly:
  - `google`
  - `azure`
  - `apple`
- SAML button calls Supabase SSO with a resolved domain.
- If `VITE_AUTH_SAML_DISCOVERY_ENDPOINT` is configured, frontend resolves domain via backend first.

## Required backend endpoint (optional but recommended)

If your org maps users to SSO domains dynamically, expose:

- `POST /auth/sso/discovery`
- Request body:

```json
{ "email": "user@company.com" }
```

- Response body:

```json
{ "domain": "company.com" }
```

Error responses should use non-2xx status codes. Frontend displays a generic SSO resolution error.

## Google enterprise discovery contract (recommended for multi-tenant buyers)

Frontend now supports an enterprise guard before starting Google OAuth.

- `POST /auth/sso/discovery`
- Request body (Google flow):

```json
{
  "identifier": "user@company.com",
  "email": "user@company.com",
  "domain": "company.com",
  "provider": "google"
}
```

- Response body:

```json
{
  "allowGoogleOAuth": true,
  "googleHostedDomain": "company.com",
  "preferredProvider": "google"
}
```

Notes:
- `allowGoogleOAuth=false` blocks Google button flow for that tenant/account.
- `googleHostedDomain` is passed as Google OAuth `hd` query param.
- Frontend also sends `login_hint` (email when available) + `prompt=select_account`.
- If `preferredProvider="saml"` and Google is denied, UI instructs users to use company SSO.

## Supabase provider setup responsibilities (backend/platform)

- Enable providers in Supabase Auth:
  - Google OAuth
  - Azure OAuth
  - Apple OAuth
  - SAML 2.0
- Configure redirect URLs to the app origin.
- For SAML, map corporate domains so `signInWithSSO({ domain })` resolves correctly.

## Frontend env toggles

Use `.env` or deployment variables:

- `VITE_AUTH_GOOGLE_ENABLED=true|false`
- `VITE_AUTH_AZURE_ENABLED=true|false`
- `VITE_AUTH_APPLE_ENABLED=true|false`
- `VITE_AUTH_SAML_ENABLED=true|false`
- `VITE_AUTH_SAML_DISCOVERY_ENDPOINT=<url>` (optional)
- `VITE_AUTH_GOOGLE_DISCOVERY_ENDPOINT=<url>` (optional, falls back to SAML endpoint if omitted)
- `VITE_AUTH_GOOGLE_DISCOVERY_REQUIRED=true|false` (default: `true` in prod, `false` in dev/staging)

These toggles only affect visible login options, so backend can roll out provider-by-provider safely.

---


<a id="hardening-matrix"></a>
## Hardening matrix (audit-ready)

This matrix tracks production hardening posture across security, reliability, operations, and governance.

**Snapshot (2026-04-15):** P0 email-abuse and auth fail-closed work is reflected in code and [#sell-ready security evidence index](#sell-ready-security-evidence-index). Matrix rows below stay open until **external** sign-offs (RLS review, DR drill calendar, secret rotation log) are attached as evidence.

## Document Control

- Status: Active
- Owner: Security/Ops/Backend
- Last updated: 2026-04-22
- Canonical: Yes

## Scoring Legend

- **Impact**: Low / Medium / High / Critical
- **Likelihood**: Low / Medium / High
- **Priority**: P0 (urgent) / P1 (high) / P2 (planned)

### Risk register

| Domain | Risk | Impact | Likelihood | Current Control | Remaining Gap | Priority | Owner | ETA |
|---|---|---|---|---|---|---|---|---|
| Multi-tenancy | Cross-tenant data leakage | Critical | Low | `organization_id` model + RLS + claim helpers (`get_org_id`, `get_user_role`) | Periodic tenant-isolation regression in CI | P0 | Backend | 1 sprint |
| Auth/SSO | Provider misconfiguration blocks sign-in | High | Medium | Login supports Google/Azure/Apple/SAML + backend handoff contract | SCIM lifecycle and IdP drift monitoring | P1 | Backend/Auth | 2 sprints |
| Email Infra | Default provider rate limiting disrupts onboarding | High | Medium | SMTP/custom provider guidance documented | Production SMTP failover playbook | P1 | Ops | 1 sprint |
| Lead Scoring | Stale scoring due to scheduler outage | High | Medium | Backend-first maintenance + telemetry + SLA guardrail alerts | External monitor (pager integration) and weekly trend review | P0 | Ops/Backend | 1 sprint |
| Data Consistency | Lead conversion partial writes under failure | High | Low | `promote-lead` server-side conversion path | Add explicit idempotency key strategy | P1 | Backend | 2 sprints |
| Observability | Silent failures in maintenance and automations | High | Medium | `lead_score_maintenance_runs` + Settings Ops Dashboard + runbook | Centralized log sink + dashboards in external APM | P1 | Ops | 2 sprints |
| Security Posture | Function search path and definer misuse | High | Low | Search path hardening migration applied | Quarterly SQL function review checklist | P1 | Security/Backend | 1 sprint |
| Secrets Management | Secret leakage in job environments | Critical | Low | Secret-based system mode (`LEAD_MAINTENANCE_SECRET`) | Secret rotation policy + expiry calendar | P0 | Ops/Security | 1 sprint |
| Release Safety | Unverified deploy introduces regression | High | Medium | Build + lint checks used on each iteration | Pre-deploy smoke suite and release gate document | P1 | Engineering | 1 sprint |
| Governance | Limited audit completeness for enterprise asks | Medium | Medium | Audit log + maintenance telemetry + DSAR/retention runbooks + compliance mapping | Field-level security model + **tenant** retention automation + logged DR drills | P2 | Product/Backend | 3 sprints |

## Immediate Actions (Next 7 Days)

1. Wire pager/incident channel for SLA breach outputs (`maintenance:lead:sla`).
2. Add CI task for tenant isolation smoke tests.
3. Define and document secret rotation cadence for maintenance system mode.
4. Confirm SMTP production path and fallback owner.

## 30-Day Hardening Target

- No unresolved P0 items.
- Weekly review of:
  - stale tenant trend,
  - maintenance failure rate,
  - auth/provider incidents.
- Sign-off from Backend + Ops + Product on all P1 timelines.

> **Related:** [Sell-ready evidence index](#sell-ready-security-evidence-index), [Compliance mapping](#compliance-mapping), [Evidence bundle](#compliance-evidence-bundle), and the [doc hub](./README.md).

---


<a id="sell-ready-security-evidence-index"></a>
## Sell-ready security & compliance evidence index

This index ties **internal documentation**, **code controls**, and **external checklists** to what enterprise buyers typically request. It is not a certification; it is an engineering evidence map.

**Doc hub:** All `docs/` paths and a **status snapshot table** are maintained in [`docs/README.md`](./README.md).

## How to use

1. Complete each linked checklist and attach proof (screenshots, CLI output, dated sign-off).
2. Map items to procurement questionnaires (SOC2-style, GDPR-style) using [Compliance mapping](#compliance-mapping).
3. For application-level control depth, cross-check against [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard) Level 1–2.

**Where to find buyer-facing artifacts:** this file holds **Gitea**, **Supabase external checklist**, **hardening matrix**, **DSAR**, and **SOC2/GDPR mapping**. Use [`master-email-operations`](./master-email-operations.md) (deliverability), [`master-lead-management`](./master-lead-management.md) (maintenance + retention), [`master-release-qa`](./master-release-qa.md) (go-live + QA), [`master-design-ui`](./master-design-ui.md) (UI evidence), [`master-implementation-history`](./master-implementation-history.md) (engineering narrative). Code anchors for outbound mail: `supabase/functions/resend-send-email/index.ts`; deploy channels + auth: `src/lib/envChannel.ts`, `src/lib/supabase.ts`, `src/App.tsx`, `vite.config.ts`, `.env.example`.

## ASVS (informal)

- **V2 Authentication** — Supabase Auth + SSO discovery: [#auth-sso-backend-handoff](#auth-sso-backend-handoff); `tests/auth/*`
- **V4 Access control** — RLS + app gates: [#supabase-external-hardening-checklist](#supabase-external-hardening-checklist); `src/utils/permissions.ts`
- **V9 Communications** — TLS to APIs + outbound mail controls: external CDN/infra; `supabase/functions/resend-send-email/index.ts`; [`master-email-operations`](./master-email-operations.md#email-deliverability-resend)
- **V7 Error handling / logging** — `audit_log`, maintenance telemetry, failed send audit: [`master-lead-management`](./master-lead-management.md#lead-maintenance-runbook); [#hardening-matrix](#hardening-matrix); `src/store/emailStore.ts`
- **V14 Configuration** — Channels + Supabase: `src/lib/envChannel.ts`, `src/lib/supabase.ts`, `vite.config.ts`, `.env.example` (`VITE_APP_CHANNEL` production/staging, `development` default in dev, staging/prod build gates; Supabase-only runtime, no hosted mock channel)
- **V8 Data protection** — Tenant isolation + DSAR/retention: [#dsar-playbook](#dsar-playbook); [`master-lead-management`](./master-lead-management.md#data-retention-runbook)

## Revision history

Single consolidation 2026-04-15: prior `sell-ready-security-evidence-index` + related security docs merged into this master (see git history for line-level changelog).

---


<a id="supabase-external-hardening-checklist"></a>
## Supabase external hardening checklist

Use this checklist when validating a **production** Supabase project backing Velo. Record evidence (screenshots, SQL output, dashboard URLs) in your security ticket or the [#sell-ready security evidence index](#sell-ready-security-evidence-index).

**Doc hub:** [`README`](./README.md) (status snapshot and full index).

## 1. Authentication and sessions

- [ ] Email confirmation policy matches your go-live plan (invite-only vs open signup).
- [ ] OAuth redirect URLs include every production origin (and staging if applicable).
- [ ] Refresh token rotation enabled where supported.
- [ ] JWT expiry aligned with product risk (shorter for high-sensitivity tenants).
- [ ] Rate limits and bot protection reviewed in Supabase Auth settings.

## 2. Row Level Security (RLS)

- [ ] RLS **enabled** on all tables in `public` that hold tenant or user data.
- [ ] No policy uses `USING (true)` for write operations without an org/user predicate.
- [ ] `SECURITY DEFINER` functions reviewed; each validates `auth.uid()` / org membership before mutating data.
- [ ] Indexes exist on columns referenced in policies (avoid full-table scans at scale).
- [ ] Run tenant-isolation smoke: User A cannot `select`/`update` User B org rows (automate where possible).

References: [Supabase RLS](https://supabase.com/docs/guides/auth/auth-deep-dive/auth-row-level-security), [Production checklist](https://supabase.com/docs/guides/platform/going-into-prod).

## 3. Edge Functions

- [ ] **No** `service_role` key in client bundles; only server-side function env.
- [ ] Each HTTP function validates `Authorization` (user JWT) where appropriate.
- [ ] Outbound integrations (e.g. Resend) enforce rate limits and payload caps — see `supabase/functions/resend-send-email/index.ts`.
- [ ] CORS and allowed origins restricted if functions are called from non-app origins.

## 4. Backups and recovery

- [ ] Point-in-time recovery (PITR) or automated backups enabled for production database.
- [ ] Restore drill documented (who runs it, how long it takes, last drill date).
- [ ] Database connection pooling and max connections reviewed for expected load.

## 5. Observability

- [ ] Supabase logs exported or reviewed on a schedule.
- [ ] Alerts for auth anomalies, function error rate, and database CPU/storage.

## Sign-off

| Role   | Name | Date | Notes |
|--------|------|------|-------|
| Backend|      |      |       |
| Ops    |      |      |       |

---


<a id="compliance-mapping"></a>
## Compliance mapping (SOC2 / GDPR-lite)

This document maps current Velo controls to common enterprise compliance expectations.
It is a pragmatic engineering mapping (not legal advice and not a formal certification artifact).

## Document Control

- Status: Active
- Owner: Security/Backend/Ops
- Last updated: 2026-04-22
- Canonical: Yes

**Related hub:** [`README`](./README.md) (status snapshot + index). DSAR and retention: [#dsar-playbook](#dsar-playbook), [`master-lead-management` — retention](./master-lead-management.md#data-retention-runbook).

## Scope

- Application: Velo
- Backend: Supabase (Auth, Postgres, Edge Functions, RLS)
- Operational controls: lead maintenance telemetry/SLA, runbooks, handoff checklists

## Control Mapping Table

*Evidence abbreviations:* **hist:A** = [`master-implementation-history`](./master-implementation-history.md#implementation-history-sections-01-12) (Part A) · **LM** = [`master-lead-management`](./master-lead-management.md) (anchors: score backend, runbook, ops dashboard, retention as applicable) · **RQA** = [`master-release-qa`](./master-release-qa.md#production-handoff-checklist) · **sec** = this file (`#auth-sso-backend-handoff`, `#dsar-playbook`, etc.).

| Framework Area | Control Objective | Current Implementation | Evidence | Gap / Next Action | Owner |
|---|---|---|---|---|---|
| SOC2 - Security | Enforce least privilege access | Tenant isolation via `organization_id` + RLS + role claims (`get_org_id`, `get_user_role`) | hist:A, SQL migrations | Add scheduled tenant-isolation CI checks | Backend |
| SOC2 - Availability | Detect and respond to processing disruptions | `lead-score-maintenance` telemetry + SLA mode + notifications | LM (score backend, runbook) | Add external paging integration and uptime SLO dashboard | Ops |
| SOC2 - Processing Integrity | Ensure scoring jobs run correctly and are observable | `lead_score_maintenance_runs` status/error history + Settings Ops dashboard | LM (ops dashboard) | Add anomaly thresholds and automated weekly report | Backend/Ops |
| SOC2 - Change Management | Controlled release readiness | Production handoff checklist with pre/post go-live checks | RQA | Enforce release gate in CI/CD | Engineering |
| SOC2 - Confidentiality | Protect secrets and auth paths | Secret-based system mode (`LEAD_MAINTENANCE_SECRET`) and provider-specific auth flows | LM (score backend), sec (auth handoff) | Define secret rotation cadence and audit log | Ops/Security |
| GDPR-lite - Data Segregation | Prevent cross-customer data access | Org-scoped data model and RLS per tenant | hist:A, migrations | Add documented quarterly RLS review | Backend |
| GDPR-lite - Access and Correction | Enable controlled updates to customer data | Authenticated CRUD through scoped stores and RLS | sec (DSAR), app stores | Operationalize DSAR with ticket templates and measured SLAs | Product/Backend |
| GDPR-lite - Data Minimization | Keep only necessary operational data | Scoped telemetry table for maintenance runs | `lead_score_maintenance_runs` migration, LM (retention) | Set org-specific retention periods and automated purge jobs where required | Product/Ops |
| GDPR-lite - Incident Response | Procedure for failures that may impact service/data | Incident runbook with triage/recovery/escalation | LM (runbook) | Extend to broader security incident classes | Ops/Security |

## Compliance Posture Summary

- **Strong today**:
  - Tenant data segregation architecture.
  - Maintenance observability and operational runbooks.
  - Structured handoff and go-live checklists.
- **Needs hardening for enterprise audits**:
  - Formalized secret rotation evidence.
  - CI-enforced release and isolation gates.
  - Data retention and DSAR response procedure documentation.

## 30-Day Compliance Actions

1. ~~Define and publish telemetry/log retention policy.~~ Baseline: [`master-lead-management` — retention](./master-lead-management.md#data-retention-runbook) (tune periods per org).
2. Add CI check for tenant-isolation regression.
3. Add secret rotation SOP and execution log.
4. ~~Draft DSAR handling playbook (request intake, export, correction, deletion path).~~ Baseline: [#dsar-playbook](#dsar-playbook).

<a id="compliance-evidence-bundle"></a>
## Evidence bundle (single pointer)

Do not maintain a second list of the same links. Use **[Sell-ready security evidence index](#sell-ready-security-evidence-index)** for the buyer-facing map; this compliance section adds only the **control mapping table** above and **DSAR** below.

---


<a id="dsar-playbook"></a>
## DSAR playbook

Engineering-oriented procedure for handling **data subject access requests** in a Velo deployment backed by **Supabase (Auth + Postgres + RLS)**. This is not legal advice; align intake, timelines, and legal review with your organization’s privacy counsel and jurisdiction.

**Doc hub:** [`README`](./README.md).

## Roles

| Role | Responsibility |
|------|----------------|
| **Intake owner** (Support / DPO delegate) | Ticket opened, identity verified per org policy, customer communication |
| **Backend / Security** | Scoped export or deletion in Supabase, audit evidence |
| **Product** | Confirm in-app vs full-database scope for the tenant |

## Request types and scope

1. **Access / portability** — Provide a structured export of personal data held for the subject (typically contacts they own or contributed to, profile, audit references, email metadata the org stores).
2. **Rectification** — Correct inaccurate profile or CRM records; prefer in-app flows when the subject is an authenticated org user.
3. **Erasure** — Remove or anonymize personal data where contract and law allow (often constrained while a lawful business relationship exists).

Always resolve the subject’s **`organization_id`** and enforce **tenant isolation** (RLS, service-role scripts scoped by org).

## Intake checklist

- [ ] Request channel and date logged (ticket ID).
- [ ] Subject identity verified (org admin attestation, email domain match policy, or KYC as required).
- [ ] Request type: access | portability | rectification | erasure.
- [ ] Jurisdiction and deadline noted (e.g. GDPR calendar days where applicable).
- [ ] Legal/commercial hold assessed (active litigation, billing dispute, statutory retention).

## Execution outline (Supabase)

1. **Locate identifiers**: Auth `user_id`, work email, CRM `contacts` / `activities` / related tables per product schema.
2. **Read path (access/portability)**  
   - Use org-scoped queries or a **one-off SQL script** run with least privilege (prefer read replica if available).  
   - Export JSON/CSV; redact third-party secrets and other data subjects’ fields where not proportional.
3. **Write path (rectification)**  
   - Apply corrections through normal app APIs where possible (preserves validation and audit).  
   - Document before/after hashes or row versions in the ticket.
4. **Delete path (erasure)**  
   - Follow a defined order respecting FKs (child tables first).  
   - For **Auth user removal**, use Supabase Auth admin APIs / dashboard per your runbook; confirm org membership rows and CRM ownership reassignment policy.
5. **Evidence**  
   - Attach query text (redacted), execution timestamp, operator, and sample row counts.  
   - Store evidence in your ticket system; avoid copying full exports into chat logs.

## Post-completion

- [ ] Subject notified per policy template.
- [ ] `audit_log` or equivalent updated if your deployment records DSAR actions.
- [ ] Runbook step timings captured for future SLAs.

## References

- [#compliance-mapping](#compliance-mapping) (includes [evidence bundle](#compliance-evidence-bundle))
- [#supabase-external-hardening-checklist](#supabase-external-hardening-checklist) — RLS and admin access hygiene
- [#sell-ready-security-evidence-index](#sell-ready-security-evidence-index) — buyer review index

---


<a id="gitea-operations"></a>
## Gitea production operations

This project is ready to run in Gitea with Actions-compatible workflows and SSH remotes.

**Doc hub:** [`README`](./README.md).

## Repository Settings Checklist

Configure these settings in the Gitea repo:

1. **Default branch**
   - Keep `master` as default (current workflow target).
2. **Protected branch**
   - Protect `master`.
   - Require pull request merge.
   - Require at least 1 approval.
   - Block force pushes and branch deletion.
3. **Required status checks**
   - Require workflow jobs to pass before merge, e.g. `CI / ci` and `security / security` (see `.gitea/workflows/ci.yml`).
   - In Gitea: **Settings → Branches → Branch protection → Enable status checks** and select both jobs. See [Gitea protected branches](https://docs.gitea.com/usage/access-control/protected-branches).
4. **Actions**
   - Enable Actions for this repository.
   - Ensure a runner is online and allowed to run workflows.

## Required Runner Capabilities

The workflow requires:

- Linux runner (`ubuntu-latest` compatible image).
- Node.js 22 support.
- Internet access for `npm ci`.

Recommended runner baseline:

- 2 vCPU
- 4 GB RAM
- 10+ GB free disk

## Secrets and Variables

Current CI does not require project secrets.

If you add deployment or Supabase integration jobs later, define secrets in Gitea Actions secrets (repo-level or org-level), never in `.env` committed files.

## Local Git Connectivity (SSH)

Use SSH remote:

```bash
git remote set-url origin git@gitea.apps.privateprompt.tech:david/velo.git
```

And in `~/.ssh/config`, set:

```sshconfig
Host gitea.apps.privateprompt.tech
    HostName gitea.apps.privateprompt.tech
    User git
    Port 2222
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
```

Quick verification:

```bash
ssh -T git@gitea.apps.privateprompt.tech
git ls-remote --heads origin
```

## CI Failure Triage

When a workflow fails:

1. Open Actions log in Gitea and identify failing step.
2. Reproduce locally with:
   - `npm ci`
   - `npx tsc --noEmit`
   - `npx vitest run`
   - `npm run build`
3. Push fix branch and re-run workflow.
