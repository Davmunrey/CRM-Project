import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { getOrgId } from '../../lib/supabaseHelpers'
import type { Contact } from '../../types'

export interface BulkEnqueuePayload {
  subject: string
  body: string
  htmlBody?: string
  /** Seconds between each job start (throttling). */
  staggerSeconds: number
  /** When true, only contacts with marketingOptIn are included. */
  marketingOnly: boolean
}

/**
 * Inserts `communication_jobs` rows (kind `email_send`) for each recipient.
 * A worker / cron must process these rows (not included in this client-only enqueue).
 */
export async function enqueueBulkEmailJobs(
  contacts: Contact[],
  payload: BulkEnqueuePayload,
  userId: string | undefined,
): Promise<{ enqueued: number; skipped: number }> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.')
  }
  const orgId = getOrgId()
  const now = Date.now()
  let skipped = 0
  const rows: Array<Record<string, unknown>> = []
  for (const c of contacts) {
    const email = (c.email ?? '').trim()
    if (!email) {
      skipped += 1
      continue
    }
    if (payload.marketingOnly && !c.marketingOptIn) {
      skipped += 1
      continue
    }
    const runAt = new Date(now + rows.length * payload.staggerSeconds * 1000).toISOString()
    rows.push({
      organization_id: orgId,
      user_id: userId ?? null,
      kind: 'email_send',
      status: 'queued',
      run_at: runAt,
      payload: {
        to: [email],
        subject: payload.subject,
        body: payload.body,
        htmlBody: payload.htmlBody,
        contactId: c.id,
        companyId: c.companyId || null,
        emailSendMode: payload.marketingOnly ? 'marketing' : 'transactional',
      },
      dedupe_key: `bulk:${c.id}:${now}:${rows.length}:${crypto.randomUUID()}`,
    })
  }
  if (!rows.length) return { enqueued: 0, skipped }
  // Table exists in migrations; typed client may omit it until DB types are regenerated.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('communication_jobs').insert(rows)
  if (error) throw new Error(error.message)
  return { enqueued: rows.length, skipped }
}
