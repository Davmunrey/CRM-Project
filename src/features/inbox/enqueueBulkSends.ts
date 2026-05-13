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

  for (let i = 0; i < recipients.length; i++) {
    if (i > 0 && payload.staggerSeconds > 0) {
      await new Promise((r) => setTimeout(r, payload.staggerSeconds * 1000))
    }
    const c = recipients[i]!
    await api.post('/email/send', {
      to: c.email,
      subject: payload.subject,
      body: payload.body,
      htmlBody: payload.htmlBody,
    })
  }

  return { enqueued: recipients.length, skipped }
}
