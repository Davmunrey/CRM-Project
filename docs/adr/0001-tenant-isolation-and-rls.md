# ADR 0001 — Tenant isolation & the role of Row-Level Security

- **Status:** Accepted
- **Date:** 2026-06-11
- **Context owners:** Platform / Security

## Context

Propel is multi-tenant: every business row carries `organization_id` and the API
derives the caller's org from the verified JWT (`req.user.org`). Migration 002
also defines PostgreSQL **Row-Level Security (RLS)** policies on ~21 tables keyed
on a `set_current_org()` GUC (`app.current_org_id`).

The enterprise-readiness review flagged a contradiction: the product **markets
"DB-layer isolation,"** but in practice the RLS policies are **inert**:

1. The API connects as the **table-owner** role. In PostgreSQL, the owner
   **bypasses RLS** unless `FORCE ROW LEVEL SECURITY` is set (it isn't).
2. The app does **not** call `set_current_org()` per request, and it runs behind
   **PgBouncer in transaction-pooling mode**, which issues `DISCARD ALL` between
   transactions — so a session-level GUC would not reliably persist across the
   pooled queries that make up a request anyway.

So today, **tenant isolation is enforced entirely at the application layer**:
every query includes `WHERE organization_id = ${req.user.org}` (and writes
verify FK ownership). RLS is, at best, dormant defense-in-depth.

## Decision

**Keep application-layer org scoping as the primary, authoritative control, and
treat RLS as optional, opt-in defense-in-depth — and document this honestly.**

Rationale:

- App-layer scoping is already pervasive, tested, and compatible with the
  PgBouncer transaction-pool architecture. Rewriting every query to run inside a
  GUC-setting transaction (or abandoning transaction pooling) is a large,
  risky change for a *secondary* control.
- We will **not** claim "DB-enforced isolation" in user-facing docs unless/until
  it is actually enforced. README/SECURITY-AUDIT wording has been corrected to
  describe RLS as defined-but-not-primary.

## How to enable real DB-level enforcement (future, opt-in)

If a deployment wants RLS to genuinely bite (true defense-in-depth):

1. Create a dedicated **non-owner** application role and grant it table DML only
   (no ownership), so RLS applies to it.
2. Point `DATABASE_URL` at that role.
3. Add `ALTER TABLE … FORCE ROW LEVEL SECURITY` (so even table owners are subject
   to policies) in a migration.
4. Set the org GUC per request **inside a transaction**, e.g. wrap each
   request's DB work in `db.begin(tx => { tx`SELECT set_current_org(${org})`; … })`,
   OR run PgBouncer in **session** pooling for these connections so the GUC
   persists. (Transaction pooling + per-statement GUC is incompatible.)
5. Add an integration test that, connected as the non-owner role **without**
   setting the GUC, confirms tenant tables return **zero** rows.

Until those steps are taken, RLS remains dormant and must not be relied upon as
the isolation boundary.

## Safeguards in place today

- Every route is org-scoped at the app layer; cross-org FK injection is rejected
  (e.g. `deals` verifies `contactId`/`companyId`/`pipelineId`/`assignedTo`
  ownership; AI tools use `ownsRow`).
- Server-side RBAC (`requirePermission`/`requireCrudPermission`) gates writes.
- Code review + the API CI gate (tsc/eslint/vitest) guard new routes; new
  org-owned tables should include `organization_id NOT NULL` + an org index and
  follow the `WHERE organization_id = ${req.user.org}` convention.
