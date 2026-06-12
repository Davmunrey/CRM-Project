# 🎯 Lead management & scoring (master)

> Consolidated **2026-06-11**. The real lead backend — authenticated CRUD plus the public lead-capture endpoint — lead scoring, the SPA delete contract, and data-retention guidance for n0CRM.

**Public lead capture:** the unauthenticated/website-form path is the API-key-protected endpoint `POST /api/public/v1/leads`, documented below and in [`lead-capture-public-endpoint.md`](./lead-capture-public-endpoint.md).

## Table of contents

- [Lead backend — CRUD contract](#lead-backend-crud)
- [Lead events & scoring](#lead-events-scoring)
- [Public lead capture](#public-lead-capture)
- [SPA — lead row delete (UI)](#spa-lead-delete)
- [Data retention guidance](#data-retention)
- [Backlog / Proposed (not built)](#backlog-proposed)

---


<a id="lead-backend-crud"></a>
## 🗂️ Lead backend — CRUD contract

Leads are a first-class CRM entity backed by the `leads` table (`api/migrations/001_schema.sql`). All lead routes live in `api/src/routes/leads.ts`, are registered under the `/leads` prefix, and require a user JWT (`app.authenticate`). The whole router is gated by `requireCrudPermission('leads')` — server-side RBAC decides read/write per role (owner/admin/manager/sales_rep/viewer). Every query is scoped by `organization_id` taken from the caller's token.

### Document Control

- Status: Active
- Owner: Backend
- Last updated: 2026-06-11
- Canonical: Yes

### Endpoints

The frontend talks to the API under the `/api` base (`frontend/src/lib/api.ts`), so these resolve to `/api/leads/*` in the browser.

| Method & path | Purpose |
|---------------|---------|
| `GET /leads` | List leads for the caller's org, ordered by `score DESC, created_at DESC`. |
| `POST /leads` | Create a lead (validated by Zod). Returns `201` with the row. |
| `PATCH /leads/:id` | Partial update; `COALESCE`-based so omitted fields are preserved. `404` if not in org. |
| `DELETE /leads/:id` | Delete a lead scoped to the org. Returns `204`. |
| `GET /leads/:id/events` | List a lead's activity events. |
| `POST /leads/:id/events` | Append an activity event (`eventType` + `metadata`). |
| `GET /leads/:id/score-snapshots` | Up to 30 score snapshots, oldest first. |
| `POST /leads/:id/score-snapshots` | Persist a `{ score, reason }` snapshot. |
| `GET /leads/scoring-rules` | List the org's scoring rules. |
| `PATCH /leads/scoring-rules/:id` | Toggle `isEnabled` / adjust `points` on a rule. |

### Lead fields

Validated server-side (`leadBody` in `api/src/routes/leads.ts`):

- `firstName`, `lastName`, `email` — required (`email` must be a valid address).
- `phone`, `companyName`, `jobTitle`, `assignedTo`, `ownerUserId`, `notes`, `lastEngagedAt` — optional.
- `source` — defaults to `website`.
- `status` — one of `open | contacted | qualified | disqualified | converted` (default `open`).
- `lifecycleStage` — one of `lead | mql | sql | opportunity | customer | evangelist` (default `lead`).
- `score` — integer `0–100` (default `0`).
- `tags` — string array (default `[]`).
- `convertedContactId`, `convertedCompanyId`, `convertedDealId` — set when a lead is converted.

The `leads` table enforces a unique `(organization_id, lower(email))` constraint, so each org can hold one lead per email address.

---


<a id="lead-events-scoring"></a>
## 📈 Lead events & scoring

Lead scoring is **computed in the SPA** and persisted back to the API as snapshots — there is no scheduled backend scoring job. The relevant pieces:

- **Scoring rules** (`lead_scoring_rules`) — per-org rows of `{ key, points, is_enabled }`. Managed via `GET/PATCH /leads/scoring-rules`.
- **Lead events** (`lead_events`) — activity signals (e.g. `email_open`, `email_reply`, `meeting_booked`, `form_submitted`). Appended via `POST /leads/:id/events`.
- **Score snapshots** (`lead_score_snapshots`) — a `{ score, reason }` history row, where `reason` is a JSON blob describing the computation (computed vs persisted score, confidence, factors). Read for the score-history sparkline and confidence insight.

The scoring math itself runs in `frontend/src/store/leadsStore.ts`:

- `recomputeLeadScore` weights events by type and applies a **recency decay** (≤7d = 1.0, ≤30d = 0.7, ≤90d = 0.4, older = 0.2), clamps to `0–100`, and applies a **confidence gate** that demotes a "hot" lead (≥70) with no recent signals.
- `addLeadEvent` ingests an event and recomputes unless `skipRecompute` is set.
- `runScheduledScoreMaintenance` is a **client-side** convenience pass over the loaded leads. It uses a `localStorage` checkpoint (`crm_lead_decay_checkpoint_<orgId>`) with a 6-hour cooldown, recomputes each lead with decay allowed, and emits in-app notifications to admins/managers when a lead's confidence drops. It is **not** a backend cron, has no system-mode secret, and persists nothing beyond the normal snapshot writes.

> Note: server-side recompute on a schedule is a [proposed backlog item](#backlog-proposed), not a shipped feature.

---


<a id="public-lead-capture"></a>
## 🌐 Public lead capture

External website forms create leads through the public API, not through the authenticated CRUD routes.

- **Endpoint:** `POST /api/public/v1/leads` (`api/src/routes/publicApi.ts`, registered under prefix `/public/v1`).
- **Auth:** header `x-api-key: <key>`. Keys are minted in **Settings → Integrations** (prefix `n0crm_`) and stored as a SHA-256 hash; the lookup rejects revoked or expired keys.
- **Scope:** the key must carry the `leads:write` scope. Without it the endpoint returns `403 { "error": "Insufficient API key scope", "required": "leads:write" }`. (Legacy keys with no scopes set are treated as full access for back-compat.)
- **Rate limit:** 20 requests/minute.
- **Body:** `{ email, firstName?, lastName? }` (snake_case `first_name` / `last_name` also accepted). `email` is required and validated.
- **Behavior:** upserts into the `contacts` table as a `lead`-type contact, keyed on `(email, organization_id)` — a repeated email simply bumps `updated_at`. Returns `201` with the contact row.

Example:

```bash
curl -X POST "https://crm.example.com/api/public/v1/leads" \
  -H "Content-Type: application/json" \
  -H "x-api-key: n0crm_xxxxxxxxxxxxxxxx" \
  -d '{ "email": "prospect@acme.test", "firstName": "Pat", "lastName": "Lee" }'
```

This is a **write-only capture** endpoint. It is not a Bearer-token API, not a read API, and not backed by any Supabase Edge Function.

---


<a id="spa-lead-delete"></a>
## 🗑️ SPA — lead row delete (UI)

The **Leads** page (`frontend/src/pages/Leads.tsx`) deletes through **`deleteLead`** in `frontend/src/store/leadsStore.ts`:

- The store **optimistically removes** the row from state, then `await`s `DELETE /api/leads/:id`.
- On **success**, `deleteLead` returns `true` and the page shows a success toast (`t.common.delete`).
- On **error** (network failure, RBAC denial, etc.), it shows `leads.deleteFailed` (i18n) plus the server message, then **refetches** `/leads` so the UI reconciles with the database — any row that "came back" was never deleted server-side. It returns `false` and the success toast is suppressed.

---


<a id="data-retention"></a>
## ⏳ Data retention guidance

Defines **how long** categories of lead/CRM data are kept and **how to enforce** reduction or deletion in a self-hosted n0CRM (PostgreSQL 16) deployment. Tune periods to your legal, contractual, and insurance requirements. Not legal advice.

### Categories

| Category | Typical location | Default engineering suggestion | Owner |
|----------|------------------|-------------------------------|--------|
| **Auth sessions / refresh tokens** | Postgres + client storage | Match your session/refresh-token policy; revoke on deprovision | Security |
| **Lead records** | Postgres `leads` | Per pipeline/legal needs; convert or purge stale `disqualified` leads | Product/Ops |
| **Lead activity events** | Postgres `lead_events` | 90 days–24 months per risk appetite; aggregate older signals if needed | Product/Ops |
| **Lead score snapshots** | Postgres `lead_score_snapshots` | 30–180 days; the SPA reads at most the latest 30 per lead | Ops |
| **Security-event audit log** | Postgres `security_events` (migration 020) | 90 days–24 months per risk appetite | Security |
| **AI conversation history** | Postgres (migration 018) | Purged by `AI_MESSAGE_RETENTION_DAYS` | Product |
| **Email content / metadata** | App tables + provider (Gmail / SMTP) | Align with mail provider retention; minimize body storage | Product |
| **Backups / PITR** | Postgres backups (self-managed) | Document restore window; see [`docs/disaster-recovery.md`](../../docs/disaster-recovery.md) | Ops |

### Annual review

- [ ] Table inventory updated (new features = new tables; cross-check [`docs/CODEBASE-MAP.md`](../../docs/CODEBASE-MAP.md)).
- [ ] Retention periods still match privacy notice and customer DPAs.
- [ ] Evidence: dated review note linked from [`master-security-compliance` — evidence index](./master-security-compliance.md#sell-ready-security-evidence-index).

### Operational deletion

1. **Define scope**: tenant (`organization_id`) vs global housekeeping (e.g. stale invites).
2. **Dry run**: `SELECT COUNT(*)` on affected predicates on a non-production clone when feasible.
3. **Execute**: batched deletes or partition drops to avoid long locks; use maintenance windows.
4. **Verify**: row counts zero or within expected residual (e.g. anonymized aggregates only).
5. **Record**: ticket with SQL hash, time window, operator.

### Subject-driven deletion (GDPR)

For data-subject requests, prefer the built-in privacy routes (`api/src/routes/dataPrivacy.ts`, owner/admin gated) over raw SQL:

- `GET /api/privacy/export` — org export (Art. 20 portability).
- `GET /api/privacy/subject/:contactId/export` — single-subject export (Art. 15).
- `POST /api/privacy/subject/:contactId/erase` — erase/anonymize a subject's PII in place (Art. 17), audit-logged.

---


<a id="backlog-proposed"></a>
## 🧪 Backlog / Proposed (not built)

The items below are **ideas, not shipped code**. They are recorded here so the design intent isn't lost — none of these endpoints, tables, env vars, scripts, or dashboards exist today.

- **Server-side scheduled score maintenance.** A backend job (or worker) that recomputes lead scores with recency decay across all tenants on a schedule, instead of relying on the SPA's `runScheduledScoreMaintenance` pass. Would need:
  - a system-mode auth path (e.g. a maintenance secret) so a scheduler can invoke it without a user session;
  - per-tenant and global ("all orgs") run modes;
  - job telemetry (a runs table) capturing status, processed counts, and errors;
  - SLA guardrails (alert when a tenant hasn't had a successful run within N hours) with notification cooldown.
- **Lead-maintenance Ops dashboard.** A tenant-scoped Settings panel surfacing last-successful-run age, SLA state, and recent run/error history from the telemetry above.
- **On-call runbook** for the scheduled job (health checks, incident actions, recovery validation).

Until these are built, lead scoring remains a client-side computation persisted as snapshots, and there is no maintenance endpoint, no `lead_score_maintenance_runs` table, and no Ops dashboard.

---

## References

- [`master-security-compliance` — compliance mapping](./master-security-compliance.md#compliance-mapping) — GDPR minimization mapping
- [`master-security-compliance` — DSAR](./master-security-compliance.md#dsar-playbook) — subject-driven deletion coordination
- [`lead-capture-public-endpoint.md`](./lead-capture-public-endpoint.md) — public capture endpoint detail
- [`docs/CODEBASE-MAP.md`](../../docs/CODEBASE-MAP.md) — full structural map

_Last updated: 2026-06-11._
