/** Shared Gmail header / address parsing for Inbox matching. */

export function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return (match ? match[1] : from).toLowerCase().trim()
}

export function emailDomain(email: string): string {
  const atIdx = email.indexOf('@')
  return atIdx >= 0 ? email.slice(atIdx + 1).toLowerCase() : ''
}

export function parseEmails(header: string): string[] {
  if (!header) return []
  return header
    .split(',')
    .map((part) => extractEmail(part))
    .filter(Boolean)
}
