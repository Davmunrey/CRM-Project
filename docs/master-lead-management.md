# Lead management & scoring (master)

> Consolidated **2026-04-15**. Lead score maintenance backend, ops dashboard, incident runbook, and data retention for telemetry.

**Replaces:** lead-score-maintenance-backend, lead-maintenance-ops-dashboard, lead-maintenance-runbook, data-retention-runbook.

## Table of contents

- [Lead score maintenance — backend contract](#lead-score-maintenance-backend)
- [Lead maintenance — Ops dashboard](#lead-maintenance-ops-dashboard)
- [Lead maintenance — runbook](#lead-maintenance-runbook)
- [Data retention runbook](#data-retention-runbook)

---


<a id="lead-score-maintenance-backend"></a>
## Lead score maintenance — backend contract

This document defines how backend jobs can execute lead score maintenance without requiring an end-user session.

## Document Control

- Status: Active
- Owner: Backend
- Last updated: 2026-04-15
- Canonical: Yes

## Edge Function

- Function name: `lead-score-maintenance`
- Path: `supabase/functions/lead-score-maintenance/index.ts`

## Auth Modes

- User mode (existing behavior):
  - Requires `Authorization: Bearer <user_jwt>`
  - Recomputes only the caller's active organization
- System mode (new, scheduler-ready):
  - Requires header `x-maintenance-secret: <LEAD_MAINTENANCE_SECRET>`
  - Secret value must match the Edge Function env var `LEAD_MAINTENANCE_SECRET`
  - Does not require user JWT

## Request Body (System mode)

Use exactly one of:

- Single tenant run:
  - `{ "organizationId": "<uuid>" }`
- Global run (all tenants):
  - `{ "runAllOrgs": true }`

## Response

- Success: `{ "success": true, "processed": <number> }`
- `processed` is the number of leads recomputed in this execution.
- Includes `runId` when telemetry is persisted.

## Health / Execution Status

- Endpoint: `POST /functions/v1/lead-score-maintenance?mode=health`
- Auth: requires `x-maintenance-secret` header (system mode).
- Optional filter:
  - query `organizationId=<uuid>` or body `{ "organizationId": "<uuid>" }`
- Returns latest execution rows from `public.lead_score_maintenance_runs`.

Example:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/lead-score-maintenance?mode=health&organizationId=<org-id>" \
  -H "Content-Type: application/json" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "x-maintenance-secret: <LEAD_MAINTENANCE_SECRET>" \
  -d '{}'
```

## SLA Guardrails

- Endpoint: `POST /functions/v1/lead-score-maintenance?mode=sla`
- Auth: requires `x-maintenance-secret` header (system mode).
- Parameters (query or body):
  - `thresholdHours` (default `8`): max age since last successful run per tenant
  - `cooldownHours` (default `6`): notification cooldown to avoid alert spam
  - `notifyManagers` (default `true`): send notification to `admin` and `manager` users in stale tenants
- Returns stale tenants and number of alerts emitted.

Example:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/lead-score-maintenance?mode=sla" \
  -H "Content-Type: application/json" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "x-maintenance-secret: <LEAD_MAINTENANCE_SECRET>" \
  -d '{ "thresholdHours": 8, "cooldownHours": 6, "notifyManagers": true }'
```

## Example (Single Tenant)

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/lead-score-maintenance" \
  -H "Content-Type: application/json" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "x-maintenance-secret: <LEAD_MAINTENANCE_SECRET>" \
  -d '{ "organizationId": "00000000-0000-0000-0000-000000000000" }'
```

## Example (All Tenants)

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/lead-score-maintenance" \
  -H "Content-Type: application/json" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "x-maintenance-secret: <LEAD_MAINTENANCE_SECRET>" \
  -d '{ "runAllOrgs": true }'
```

## What the function does

- Recomputes lead score with recency decay and confidence gate
- Writes snapshots to `lead_score_snapshots`
- Sends manager/admin notifications when score drops significantly
- Persists job telemetry in `lead_score_maintenance_runs` with status, counts, and errors

## Operations

- Incident and on-call procedure: [#lead-maintenance-runbook](#lead-maintenance-runbook)

---


<a id="lead-maintenance-ops-dashboard"></a>
## Lead maintenance — Ops dashboard

This document describes the operational dashboard added to `Settings` for lead score maintenance observability.

## Document Control

- Status: Active
- Owner: Ops/Frontend
- Last updated: 2026-04-15
- Canonical: Yes

## Goal

Provide tenant-scoped operational visibility without requiring direct access to Supabase Dashboard.

## UI Location

- Page: `src/pages/Settings.tsx`
- Section: **Lead Maintenance Ops**

## What it shows

- Last successful maintenance run age
- SLA state (healthy/breached against 8h window)
- Recent error count
- Recent run list from `lead_score_maintenance_runs`:
  - mode (`single_org` / `all_orgs`)
  - status (`success` / `running` / `error`)
  - processed lead count
  - error message when available

## Filters

- Status filter buttons:
  - all
  - success
  - running
  - error

## Data source

- Table: `public.lead_score_maintenance_runs`
- Query shape in UI:
  - ordered by `started_at DESC`
  - limited to latest 15 records
- RLS ensures users only see records for their tenant.

## i18n support

The panel uses translation keys under `settings.*` and is fully wired for:

- `en`
- `es`
- `pt`
- `fr` / `de` / `it` (inherits base keys through spread from `en`)

## Related backend pieces

- Edge Function:
  - `supabase/functions/lead-score-maintenance/index.ts`
- Telemetry table migration:
  - `supabase/migrations/20260413152000_lead_score_maintenance_runs.sql`
- Backend contract: [#lead-score-maintenance-backend](#lead-score-maintenance-backend)

---


<a id="lead-maintenance-runbook"></a>
## Lead maintenance — runbook

This runbook is for on-call and operations teams maintaining lead score maintenance in production.

## Document Control

- Status: Active
- Owner: Ops
- Last updated: 2026-04-15
- Canonical: Yes

## Scope

- Edge Function: `lead-score-maintenance`
- Telemetry table: `public.lead_score_maintenance_runs`
- Scripts:
  - `npm run maintenance:lead:org`
  - `npm run maintenance:lead:all`
  - `npm run maintenance:lead:health`
  - `npm run maintenance:lead:sla`

## Required Environment

Set these variables in the scheduler/job environment:

- `SUPABASE_FUNCTIONS_URL` (example: `https://<project-ref>.supabase.co/functions/v1`)
- `SUPABASE_ANON_KEY`
- `LEAD_MAINTENANCE_SECRET`
- `LEAD_MAINTENANCE_ORG_ID` (only for single-tenant runs)
- Optional SLA tuning:
  - `LEAD_MAINTENANCE_SLA_HOURS` (default `8`)
  - `LEAD_MAINTENANCE_SLA_COOLDOWN_HOURS` (default `6`)
  - `LEAD_MAINTENANCE_SLA_NOTIFY_MANAGERS` (default `true`)

## Normal Schedule

Recommended:

- Maintenance run (all tenants): every `30 minutes`
- SLA guardrail check: every `30-60 minutes`
- Health snapshot export/monitoring: every `15-30 minutes`

## Health Check Procedure

1. Run:
   - `npm run maintenance:lead:health`
2. Verify response:
   - `success: true`
   - recent runs show `status: success`
   - `processed` is non-zero for orgs with active leads
3. If needed, narrow by one tenant:
   - set `LEAD_MAINTENANCE_ORG_ID`
   - rerun health command

## Incident Types and Actions

### 1) No recent successful runs

Symptoms:

- SLA breach alert appears
- health output has only `running`/`error` or stale success timestamps

Actions:

1. Run immediate global maintenance:
   - `npm run maintenance:lead:all`
2. Re-check health:
   - `npm run maintenance:lead:health`
3. Run SLA check:
   - `npm run maintenance:lead:sla`
4. If still failing, inspect latest `error_message` and continue with section "Execution failures".

### 2) Execution failures (`status=error`)

Symptoms:

- New rows in telemetry table with `status: error`
- `error_message` populated

Actions:

1. Capture error text from:
   - Settings → Lead Maintenance Ops
   - or `npm run maintenance:lead:health`
2. Validate environment variables in scheduler:
   - wrong/missing `LEAD_MAINTENANCE_SECRET`
   - wrong `SUPABASE_FUNCTIONS_URL`
3. Validate Supabase function deployment:
   - redeploy function if needed
4. Trigger single-tenant run for validation:
   - set `LEAD_MAINTENANCE_ORG_ID`
   - `npm run maintenance:lead:org`
5. Confirm recovery with health + SLA checks.

### 3) High stale tenant count in SLA mode

Symptoms:

- `maintenance:lead:sla` returns high `staleCount`

Actions:

1. Execute global run:
   - `npm run maintenance:lead:all`
2. Re-run SLA check.
3. If stale remains high:
   - confirm scheduler frequency and runtime stability
   - temporarily reduce `LEAD_MAINTENANCE_SLA_HOURS` only if justified for detection
   - review alert cooldown settings (`LEAD_MAINTENANCE_SLA_COOLDOWN_HOURS`).

## Recovery Validation Checklist

- [ ] `maintenance:lead:all` completes with `success: true`
- [ ] `maintenance:lead:health` shows recent `success` rows
- [ ] `maintenance:lead:sla` returns expected `staleCount` trend
- [ ] Settings Ops panel shows healthy SLA for active tenants
- [ ] No new burst of `status=error` rows in telemetry

## Escalation Guidance

Escalate to backend team when:

- Repeated `status=error` persists after environment validation
- Function works for some tenants but fails deterministically for specific tenants
- `processed` counts collapse unexpectedly while lead volume is stable
- Table/query permission issues appear after RLS or migration changes

## Related Documentation

- Contract/API: [#lead-score-maintenance-backend](#lead-score-maintenance-backend)
- Settings panel behavior: [#lead-maintenance-ops-dashboard](#lead-maintenance-ops-dashboard)
- Implementation timeline: [`master-implementation-history` — Part B](./master-implementation-history.md#implementation-history) (§14) + [Part A](./master-implementation-history.md#implementation-history-sections-01-12)

---


<a id="data-retention-runbook"></a>
## Data retention runbook

Defines **how long** categories of data are kept and **how to enforce** reduction or deletion in a CRM Pro + Supabase deployment. Tune periods to your legal, contractual, and insurance requirements. Not legal advice.

**Doc hub:** [`README`](./README.md).

## Categories

| Category | Typical location | Default engineering suggestion | Owner |
|----------|------------------|-------------------------------|--------|
| **Auth sessions** | Supabase Auth / client storage | Managed by Supabase product defaults + your session policy | Security |
| **Application audit trail** | Postgres `audit_log` (if enabled) | 90 days–24 months per risk appetite | Product/Ops |
| **Lead maintenance telemetry** | `lead_score_maintenance_runs` (and related) | 30–180 days operational; archive aggregates longer if needed | Ops |
| **Email content / metadata** | App tables + provider (Resend/Gmail) | Align with mail provider retention; minimize body storage | Product |
| **Edge function logs** | Supabase / platform logging | Follow platform retention; export incidents to ticket | Ops |
| **Backups / PITR** | Supabase project | Document restore window; deletion lag vs primary DB | Ops |

## Annual review

- [ ] Table inventory updated (new features = new tables).
- [ ] Retention periods still match privacy notice and customer DPAs.
- [ ] Evidence: dated review note linked from [`master-security-compliance` — evidence index](./master-security-compliance.md#sell-ready-security-evidence-index).

## Operational deletion

1. **Define scope**: tenant (`organization_id`) vs global housekeeping (e.g. stale invites).
2. **Dry run**: `SELECT COUNT(*)` on affected predicates on a non-production clone when feasible.
3. **Execute**: batched deletes or partition drops to avoid long locks; use maintenance windows.
4. **Verify**: row counts zero or within expected residual (e.g. anonymized aggregates only).
5. **Record**: ticket with SQL hash, time window, operator.

## References

- [`master-security-compliance` — compliance mapping](./master-security-compliance.md#compliance-mapping) — GDPR-lite minimization mapping
- [`master-security-compliance` — DSAR](./master-security-compliance.md#dsar-playbook) — subject-driven deletion coordination
- [`master-security-compliance` — Supabase checklist](./master-security-compliance.md#supabase-external-hardening-checklist) — backups and PITR evidence
