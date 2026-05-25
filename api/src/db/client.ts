// PgBouncer is the outer connection pool multiplexer.
// Each API instance holds at most 10 connections to PgBouncer, which in turn
// manages the real Postgres pool. In PgBouncer's transaction-pooling mode,
// connections are returned to the pool after every transaction, so keeping
// fewer connections per node is correct — PgBouncer multiplexes them.
//
// PgBouncer transaction mode calls DISCARD ALL between clients, which resets
// per-connection state. Do NOT set session-level variables (e.g. SET app.current_org_id)
// and expect them to persist across queries. Always pass org context as query parameters.
import postgres from 'postgres'
import { env } from '../config/env.js'

export const db = postgres(env.DATABASE_URL, {
  // Keep the per-node count low — PgBouncer multiplexes across all API instances.
  max: 10,
  // 10 s idle timeout is important for PgBouncer transaction mode: connections
  // must be returned promptly so PgBouncer can reassign them to other clients.
  idle_timeout: 10,
  // Fail fast if PgBouncer/Postgres is unreachable (3 s).
  connect_timeout: 3,
  // Keep the pool alive for the process lifetime; do not exit on idle.
  // (postgres.js does not have a direct allowExitOnIdle option; instead,
  //  the pool is kept open until db.end() is called explicitly.)
  transform: postgres.camel,
})

export type Sql = typeof db
