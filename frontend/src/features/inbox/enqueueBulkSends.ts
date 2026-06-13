import { api } from '../../lib/api'
import type { Contact } from '../../types'

export interface BulkEnqueuePayload {
  subject: string
  body: string
  htmlBody?: string
  staggerSeconds: number
  marketingOnly: boolean
}

export async function enqueueBulkEmailJobs(
  contacts: Contact[],
  payload: BulkEnqueuePayload,
  _userId: string | undefined,
): Promise<{ enqueued: number; skipped: number }> {
  let skipped = 0
  const recipients: Contact[] = []

  for (const c of contacts) {
    const email = (c.email ?? '').trim()
    if (!email) { skipped += 1; continue }
    if (payload.marketingOnly && !c.marketingOptIn) { skipped += 1; continue }
    recipients.push(c)
  }

  if (!recipients.length) return { enqueued: 0, skipped }

  // Hand the whole batch to the server, which staggers + sends in the background.
  // (Previously this loop ran in the browser and was lost if the user navigated
  // away or closed the tab between sends.)
  await api.post('/email/bulk-send', {
    recipients: recipients.map((c) => c.email),
    subject: payload.subject,
    body: payload.body,
    htmlBody: payload.htmlBody,
    staggerSeconds: payload.staggerSeconds,
  })

  return { enqueued: recipients.length, skipped }
}
