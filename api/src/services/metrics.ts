import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
} from 'prom-client'

// Singleton registry — shared across the entire process.
export const metricsRegistry = new Registry()

// Collect Node.js default metrics (event loop lag, heap, GC, etc.) into our registry.
collectDefaultMetrics({ register: metricsRegistry })

// ---------------------------------------------------------------------------
// Custom application metrics
// ---------------------------------------------------------------------------

/** Total HTTP requests, labelled by method, normalised route, and status code. */
export const httpRequestsTotal = new Counter({
  name: 'n0crm_http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [metricsRegistry],
})

/** Current number of active Socket.io connections across this process. */
export const activeWebsocketConnections = new Gauge({
  name: 'n0crm_active_websocket_connections',
  help: 'Number of currently active Socket.io connections on this instance',
  registers: [metricsRegistry],
})

/** Postgres query duration in seconds. */
export const dbQueryDurationSeconds = new Histogram({
  name: 'n0crm_db_query_duration_seconds',
  help: 'Duration of PostgreSQL queries in seconds',
  labelNames: ['query_name'] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [metricsRegistry],
})
