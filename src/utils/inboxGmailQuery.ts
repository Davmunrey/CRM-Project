/**
 * Inbox search is hybrid:
 * - Gmail thread list API uses `q` with only operators Gmail understands.
 * - Tokens that depend on CRM data (`is:tracked`, `is:opened`, `is:clicked`, `in:mine` for thread owner)
 *   are stripped from the API query and applied client-side via `buildInboxQueryMatcher`.
 */

import type { CRMEmail } from '../types'

const CRM_ONLY_TOKENS = new Set(['is:tracked', 'is:opened', 'is:clicked', 'in:mine'])

function splitSearchTokens(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/** True if the raw query includes any token that Gmail cannot evaluate for thread list. */
export function inboxQueryHasCrmOnlyTokens(query: string): boolean {
  for (const t of splitSearchTokens(query)) {
    if (CRM_ONLY_TOKENS.has(t.toLowerCase())) return true
  }
  return false
}

/**
 * Query string safe to pass as Gmail `threads.list` `q` parameter.
 * Removes CRM-only tokens; preserves from:/to:/subject:, is:unread, has:attachment, and free text.
 */
export function toGmailThreadsListQuery(query: string): string {
  const kept = splitSearchTokens(query).filter((t) => !CRM_ONLY_TOKENS.has(t.toLowerCase()))
  return kept.join(' ').trim()
}

/** Aggregate CRM-sent email tracking for messages linked to a Gmail thread id. */
export function aggregateCrmTrackingForGmailThread(
  threadId: string,
  emails: CRMEmail[],
): { tracked: boolean; opened: boolean; clicked: boolean } {
  let tracked = false
  let opened = false
  let clicked = false
  for (const e of emails) {
    if (e.gmailThreadId !== threadId) continue
    if (e.trackingEnabled) tracked = true
    if ((e.openCount ?? 0) > 0) opened = true
    if ((e.clickCount ?? 0) > 0) clicked = true
  }
  return { tracked, opened, clicked }
}
