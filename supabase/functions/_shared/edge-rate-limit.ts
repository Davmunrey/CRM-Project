/**
 * Best-effort in-memory rate limiting per Edge isolate (resets on cold start).
 * For abuse reduction on public endpoints; pair with WAF at the edge for strong guarantees.
 */

type Bucket = { count: number; resetAt: number }
const store = new Map<string, Bucket>()
const MAX_KEYS = 20_000

function prune(now: number): void {
  if (store.size <= MAX_KEYS) return
  for (const [k, b] of store) {
    if (b.resetAt < now) store.delete(k)
  }
  if (store.size > MAX_KEYS) {
    const keys = [...store.keys()].slice(0, store.size - MAX_KEYS)
    for (const k of keys) store.delete(k)
  }
}

/** @returns null if allowed, or retry-after seconds if rate limited */
export function rateLimitHit(key: string, maxHits: number, windowMs: number): number | null {
  const now = Date.now()
  prune(now)
  const b = store.get(key)
  if (!b || b.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }
  if (b.count >= maxHits) {
    return Math.max(1, Math.ceil((b.resetAt - now) / 1000))
  }
  b.count += 1
  return null
}

export function clientIpFromRequest(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  constxff = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (xff) return xff
  return 'unknown'
}
