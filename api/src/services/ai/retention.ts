/**
 * AI data retention. When AI_MESSAGE_RETENTION_DAYS > 0, periodically purge AI
 * conversations/messages/usage older than the window so PII-bearing transcripts
 * and usage logs do not persist indefinitely (data-governance requirement).
 */
import { db } from '../../db/client.js'
import { env } from '../../config/env.js'

export interface PurgeResult {
  conversations: number
  messages: number
  usage: number
}

/**
 * Delete AI data older than AI_MESSAGE_RETENTION_DAYS. No-op when retention
 * is disabled (0). Returns the row counts removed. Org-agnostic (global retention
 * policy) — every row is still org-owned, this just enforces the time window.
 */
export async function purgeExpiredAiData(): Promise<PurgeResult> {
  const days = env.AI_MESSAGE_RETENTION_DAYS
  if (days <= 0) return { conversations: 0, messages: 0, usage: 0 }

  // Conversations untouched for `days` — cascades to their messages.
  const conv = await db`
    DELETE FROM ai_conversations
    WHERE updated_at < now() - make_interval(days => ${days})
    RETURNING id
  `
  // Stale messages inside still-active conversations.
  const msg = await db`
    DELETE FROM ai_messages
    WHERE created_at < now() - make_interval(days => ${days})
    RETURNING id
  `
  const usage = await db`
    DELETE FROM ai_usage_log
    WHERE created_at < now() - make_interval(days => ${days})
    RETURNING id
  `
  return { conversations: conv.length, messages: msg.length, usage: usage.length }
}

let timer: ReturnType<typeof setInterval> | null = null

/** Start the daily retention purge if retention is configured. Idempotent. */
export function startAiRetention(log?: { info: (o: unknown, m?: string) => void; error: (o: unknown, m?: string) => void }): void {
  if (env.AI_MESSAGE_RETENTION_DAYS <= 0 || timer) return
  const run = (): void => {
    void purgeExpiredAiData()
      .then((r) => log?.info({ ...r }, '[ai-retention] purge complete'))
      .catch((err) => log?.error({ err: String(err) }, '[ai-retention] purge failed'))
  }
  // First run shortly after boot, then once a day.
  setTimeout(run, 5 * 60_000)
  timer = setInterval(run, 24 * 60 * 60_000)
}

export function stopAiRetention(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
