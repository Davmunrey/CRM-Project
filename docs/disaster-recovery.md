# Propel — Backup & Disaster Recovery Runbook

_Last updated: 2026-06-11 · Owner: Platform / Ops_

This runbook documents how Propel data is backed up, the recovery objectives, and
the **step-by-step, tested restore procedure**. The enterprise review flagged
"local-only, never-restore-tested backups" as a release blocker — this runbook is
the control that closes it. **Run the [restore drill](#5-restore-drill-do-this-quarterly) at least quarterly.**

---

## 1. What is backed up

| Data store | Mechanism | Where |
|---|---|---|
| **PostgreSQL** (all tenant data) | Scheduled `pg_dump \| gzip` every `BACKUP_INTERVAL_HOURS` (default 6h), keep last `BACKUP_KEEP` (default 10) | `/backups` volume in the API container (`api/src/routes/debug.ts`) |
| **PostgreSQL** (on demand) | `GET /_debug/backup` streams `pg_dump \| gzip` as a download | wherever you save it (do this for **off-site** copies) |
| **Redis** | Ephemeral by design (rate-limit counters, JWT denylist, OAuth-state, sessions-valid-after, BullMQ) | Not backed up — see [§4](#4-redis-loss) |
| **Object/file data** | Propel stores no blobs; Gmail attachments are fetched live from Google | n/a |

> ⚠️ The scheduled dump lives **inside the API container's `/backups` volume**. A
> volume/host loss takes the backups with it. Treat the on-demand download as the
> real backup and copy it **off-site** (see [§3](#3-off-site-copies)).

---

## 2. Recovery objectives

| Objective | Current (default config) | Target for production |
|---|---|---|
| **RPO** (max data loss) | up to **6h** (scheduled interval) | ≤ 1h — lower `BACKUP_INTERVAL_HOURS`, or adopt WAL/PITR (see [§6](#6-toward-true-ha)) |
| **RTO** (time to restore) | ~minutes for a single DB (dump size dependent) | document & measure during the drill |
| **Geographic redundancy** | none by default | off-site bucket copy + managed-Postgres replica |

Tune RPO by setting `BACKUP_INTERVAL_HOURS` (smaller = lower RPO, more dumps) and
`BACKUP_KEEP` on the `api` service.

---

## 3. Off-site copies

The single most important hardening step. Pull a dump out of the platform and
store it somewhere independent (S3/GCS/another host):

```bash
# Authenticated download of a fresh dump (DEBUG_TOKEN is required & gates /_debug/*)
curl -fSL -H "X-Debug-Token: $DEBUG_TOKEN" \
  https://<your-host>/api/_debug/backup -o "propel-$(date +%F).sql.gz"

# Verify it's a valid gzip + non-trivial size, then ship it off-site
gzip -t "propel-$(date +%F).sql.gz" && aws s3 cp "propel-$(date +%F).sql.gz" s3://<your-dr-bucket>/
```

Automate this on a host **outside** the app's blast radius (a cron runner, CI
schedule, or backup appliance). Encrypt at rest in the bucket and restrict access.

---

## 4. Redis loss

Redis is intentionally ephemeral. If it is lost:

- **Rate-limit counters / account-lockout** reset → harmless (limits simply restart).
- **JWT `jti` denylist** is cleared → revoked-but-unexpired tokens could be replayed until their natural expiry. Mitigation: rotate `JWT_SECRET` to invalidate **all** outstanding tokens immediately after a Redis loss if revocation integrity matters.
- **OAuth-state / sessions-valid-after** cleared → users may need to re-login; in-flight OAuth flows must restart.

No restore needed. For stronger guarantees, enable Redis AOF persistence + HA (see [§6](#6-toward-true-ha)).

---

## 5. Restore drill (do this quarterly)

> Practice on a **scratch** Postgres (never the live DB) and record the wall-clock RTO.

```bash
# 1. Spin up a throwaway Postgres
docker run -d --name propel-restore-test \
  -e POSTGRES_DB=propel -e POSTGRES_USER=propel -e POSTGRES_PASSWORD=restore_test \
  -p 5599:5432 postgres:16-alpine

# 2. Restore the most recent off-site dump into it
gzip -dc propel-YYYY-MM-DD.sql.gz | \
  PGPASSWORD=restore_test psql -h localhost -p 5599 -U propel -d propel \
    --single-transaction --set=ON_ERROR_STOP=on

# 3. Sanity-check row counts (should match production order-of-magnitude)
PGPASSWORD=restore_test psql -h localhost -p 5599 -U propel -d propel -c \
  "SELECT
     (SELECT count(*) FROM organizations) AS orgs,
     (SELECT count(*) FROM users)         AS users,
     (SELECT count(*) FROM contacts)      AS contacts,
     (SELECT count(*) FROM deals)         AS deals,
     (SELECT count(*) FROM _migrations)   AS migrations;"

# 4. Tear down
docker rm -f propel-restore-test
```

**Pass criteria:** restore completes with `ON_ERROR_STOP=on` (no errors), counts are
plausible, `_migrations` matches the deployed migration count. Record the elapsed
time as the measured RTO. **If the drill fails, the backup is not valid — fix it.**

### Production restore (real incident)

1. **Stop writes** — scale the `api` service to 0 (or put it in maintenance) so no new data races the restore.
2. Provision a clean Postgres at the same major version (16).
3. Restore the latest **off-site** dump as in step 2 above (point it at the new DB).
4. Point `DATABASE_URL` (via PgBouncer) at the restored instance.
5. Start `api` (migrations are idempotent — `_migrations` guards already-applied files).
6. Smoke-test: `GET /health/ready` → 200, login, list contacts/deals.
7. Rotate `JWT_SECRET` if the incident may have exposed tokens; notify affected tenants.

The platform restore endpoint `POST /_debug/restore` (gzip or raw SQL body, gated by
`DEBUG_TOKEN`) can pipe a dump straight into the live DB for in-place recovery, but
prefer restore-to-fresh + cutover for a clean rollback path.

---

## 6. Toward true HA (recommended for an SLA)

The single-container Postgres/Redis are SPOFs. For a 99.9% SLA:

- **PostgreSQL:** use a **managed** HA Postgres (Cloud SQL / RDS / Crunchy) with a
  synchronous standby + automated failover, or set up streaming replication
  (`wal_level=replica`, a replication slot, a hot standby) and **WAL archiving for
  PITR** (e.g. `pgBackRest` / `wal-g`) so RPO drops to seconds.
- **Redis:** enable AOF persistence and run Redis Sentinel / a managed Redis with a
  replica + automatic failover. The app already supports the Redis Socket.io adapter
  for multi-node.
- **API:** run ≥2 replicas behind the load balancer; it is stateless (sessions are
  cookie/JWT, shared state is in Redis/Postgres). Use rolling deploys; the migration
  step is guarded by the `_migrations` table (add a `pg_advisory_lock` if many
  replicas can boot simultaneously).

---

## 7. Quick reference

| Action | Command |
|---|---|
| On-demand backup | `curl -H "X-Debug-Token: $DEBUG_TOKEN" https://<host>/api/_debug/backup -o dump.sql.gz` |
| List on-box backups | `GET /api/_debug/backups` (with `X-Debug-Token`) |
| Verify a dump | `gzip -t dump.sql.gz` |
| Readiness probe | `GET /api/health/ready` (200 ready / 503 degraded) |
| Liveness probe | `GET /api/health/live` |
