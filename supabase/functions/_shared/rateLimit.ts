/**
 * Best-effort in-memory rate limiter per Edge isolate (not global across workers).
 * For abuse protection on hot paths; pair with DB-backed limits for strict quotas.
 */
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimitHit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const cur = buckets.get(key)
  if (!cur || now > cur.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (cur.count >= max) return true
  cur.count += 1
  return false
}
