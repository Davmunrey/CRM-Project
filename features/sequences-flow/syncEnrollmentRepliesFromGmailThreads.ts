import type { GmailThread } from '../../types'
import type { EmailSequence } from '../../types'
import { extractEmail } from '../inbox/emailParsing'
import { useContactsStore } from '../../store/contactsStore'
import { useSequencesStore } from '../../store/sequencesStore'

/**
 * After Gmail thread sync, mark active sequence enrollments as `replied` when the
 * enrolled contact has sent us a message AFTER our last automated step send
 * (`enrollment.lastSentAt`). This is transport-independent: sequence steps are
 * sent via SMTP (so there is no Gmail thread id to follow), so we instead scan the
 * synced inbox for any inbound message from the contact dated after our last send.
 * Respects `EmailSequence.stopOnContactReply` (default: stop when undefined/true).
 */
export function syncSequenceEnrollmentsAfterGmailSync(threads: GmailThread[], mailbox: string | null | undefined): void {
  const m = mailbox?.trim()
  if (!m) return
  const me = extractEmail(m).toLowerCase()

  const { sequences, enrollments, markEnrollmentReplied } = useSequencesStore.getState()
  const contacts = useContactsStore.getState().contacts
  const contactsById = new Map(contacts.map((c) => [c.id, c]))
  const seqById = new Map<string, EmailSequence>(sequences.map((s) => [s.id, s]))

  // Flatten every synced inbound message once: { sender, time } (excluding our own).
  const inbound = threads
    .flatMap((t) => t.messages ?? [])
    .map((msg) => ({ addr: extractEmail(msg.from).toLowerCase(), at: new Date(msg.date).getTime() }))
    .filter((x) => x.addr && x.addr !== me && !Number.isNaN(x.at))

  for (const en of enrollments) {
    if (en.status !== 'active') continue

    const seq = seqById.get(en.sequenceId)
    if (seq?.stopOnContactReply === false) continue

    const contactAddr = contactsById.get(en.contactId)?.email?.trim().toLowerCase()
    if (!contactAddr) continue

    // Need a send anchor — without it we can't tell a reply from prior correspondence.
    const sinceMs = en.lastSentAt ? new Date(en.lastSentAt).getTime() : NaN
    if (Number.isNaN(sinceMs)) continue

    const replied = inbound.some((x) => x.addr === contactAddr && x.at > sinceMs)
    if (replied) markEnrollmentReplied(en.id)
  }
}
