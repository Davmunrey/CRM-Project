/**
 * Minimal Edge error reporting. Set `SENTRY_DSN` in Supabase Function secrets to forward
 * structured errors to platform logs until a full @sentry/deno integration is wired.
 */
export function captureEdgeException(
  err: unknown,
  ctx: Record<string, unknown> = {},
): void {
  const dsn = Deno.env.get('SENTRY_DSN')
  const payload = {
    level: 'error' as const,
    event: 'edge_exception',
    has_sentry_dsn: Boolean(dsn),
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    ...ctx,
  }
  console.error(JSON.stringify(payload))
}
