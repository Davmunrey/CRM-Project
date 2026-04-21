/**
 * Outbound mail must always use the authenticated user's mailbox as the RFC address.
 * Optional "sender name" / display label is user-controlled but must not introduce a second email.
 */

/** Strip characters that could turn a display name into a fake `Name <addr>` pair. */
export function sanitizeSenderDisplayName(raw: string | undefined | null): string {
  if (!raw) return ''
  return raw
    .replace(/[\r\n]+/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Label stored on CRM emails: optional display name + always the real mailbox address. */
export function buildCrmFromLabel(mailbox: string, displayName?: string | null): string {
  const m = mailbox.trim()
  if (!m) return ''
  const d = sanitizeSenderDisplayName(displayName)
  return d ? `${d} <${m}>` : m
}
