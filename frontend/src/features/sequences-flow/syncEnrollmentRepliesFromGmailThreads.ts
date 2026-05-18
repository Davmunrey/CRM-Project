import type { GmailMessage, GmailThread } from '../../types'
import type { EmailSequence } from '../../types'
import { extractEmail } from '../inbox/emailParsing'
import { useContactsStore } from '../../store/contactsStore'
import { useSequencesStore } from '../../store/sequencesStore'

function messagesAfterOurSend(msgs: GmailMessage[], me: string, lastSentMessageId: string | null | undefined): GmailMessage[] {
  const ordered = [...msgs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  if (lastSentMessageId) {
    const idx = ordered.findIndex((m) => m.id === lastSentMessageId)
    return idx >= 0 ? ordered.slice(idx + 1) : []
  }
  let lastOwn = -1
  for (let i = 0; i < ordered.length; i++) {
    if (extractEmail(ordered[i].from) === me) lastOwn = i
  }
  return lastOwn >= 0 ? ordered.slice(lastOwn + 1) : []
}

/**
 * After Gmail thread sync, mark active sequence enrollments as `replied` when the enrolled
 * contact sends a message in the tracked thread after our last outbound (see `last_sent_*`).
 * Respects `EmailSequence.stopOnContactReply` (default: stop when undefined/true).
 */
export function syncSequenceEnrollmentsAfterGmailSync(threads: GmailThread[], mailbox: string | null | undefined): void {
  const m = mailbox?.trim()
  if (!m) return
  const me = extractEmail(m)

  const { sequences, enrollments, markEnrollmentReplied } = useSequencesStore.getState()
  const contacts = useContactsStore.getState().contacts
  const contactsById = new Map(contacts.map((c) => [c.id, c]))
  const byThreadId = new Map(threads.map((t) => [t.id, t]))

  const seqById = new Map<string, EmailSequence>(sequences.map((s) => [s.id, s]))

  for (const en of enrollments) {
    if (en.status !== 'active') continue
    if (!en.lastSentThreadId) continue

    const seq = seqById.get(en.sequenceId)
    if (seq?.stopOnContactReply === false) continue

    const thread = byThreadId.get(en.lastSentThreadId)
    if (!thread?.messages?.length) continue

    const contact = contactsById.get(en.contactId)
    const contactAddr = contact?.email?.trim().toLowerCase()
    if (!contactAddr) continue

    const candidates = messagesAfterOurSend(thread.messages, me, en.lastSentMessageId)
    const replied = candidates.some((msg) => {
      const addr = extractEmail(msg.from)
      if (!addr || addr === me) return false
      return addr === contactAddr
    })

    if (replied) markEnrollmentReplied(en.id)
  }
}
