/**
 * Observability helpers: request-correlation IDs + central error capture.
 *
 * `resolveRequestId` is pure/unit-tested and feeds Fastify's genReqId so every
 * request (and its logs) carries a stable id, echoed back in `x-request-id`.
 * `captureException` emits a structured error log (queryable in any aggregator)
 * and is the single hook where an error tracker (Sentry) would be called.
 */
import { randomUUID } from 'node:crypto'
import { env } from '../config/env.js'

// A safe, bounded id (propagated from a trusted upstream or freshly minted).
const REQ_ID_RE = /^[A-Za-z0-9._-]{1,128}$/

/** Trust a well-formed incoming X-Request-Id for trace continuity, else generate one. */
export function resolveRequestId(headerValue: string | string[] | undefined): string {
  const incoming = Array.isArray(headerValue) ? headerValue[0] : headerValue
  return incoming && REQ_ID_RE.test(incoming) ? incoming : randomUUID()
}

export interface ErrorContext {
  requestId?: string | undefined
  method?: string | undefined
  route?: string | undefined
  orgId?: string | null | undefined
  statusCode?: number | undefined
}

interface ErrorLogger {
  error: (obj: unknown, msg?: string) => void
}

/**
 * Central error capture. Emits a structured `unhandled_error` log line with the
 * request id / route / org for correlation. This is the one place to wire an
 * error-tracking SDK: when SENTRY_DSN is configured, call the SDK here.
 */
export function captureException(log: ErrorLogger, err: unknown, ctx: ErrorContext = {}): void {
  const error = err instanceof Error ? err : new Error(String(err))
  log.error(
    {
      evt: 'unhandled_error',
      requestId: ctx.requestId,
      method: ctx.method,
      route: ctx.route,
      orgId: ctx.orgId ?? undefined,
      statusCode: ctx.statusCode,
      err: { name: error.name, message: error.message, stack: error.stack },
      reporter: env.SENTRY_DSN ? 'sentry' : 'log',
    },
    'unhandled_error',
  )
  // To enable external error tracking, initialize @sentry/node at startup when
  // env.SENTRY_DSN is set and call Sentry.captureException(error, { extra: ctx }) here.
}
