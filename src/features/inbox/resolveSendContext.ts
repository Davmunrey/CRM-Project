import type { Contact, Deal } from '../../types'
import { extractEmail } from './emailParsing'
import { pickBestDealForThread } from './threadMatch'

export interface ResolvedSendContext {
  contactId?: string
  companyId?: string
  dealId?: string
  /** Same email matched multiple contacts — UI may ask user to pick */
  ambiguousContactIds?: string[]
}

/**
 * Infer CRM entities from a single "to" address (composer / reply).
 * Uses open-deal preference via pickBestDealForThread.
 */
export function resolveSendContextFromTo(
  toLine: string,
  contacts: Contact[],
  deals: Deal[],
): ResolvedSendContext {
  const addr = extractEmail(toLine.split(/[,;]/)[0] ?? '')
  if (!addr) return {}
  const matches = contacts.filter((c) => (c.email ?? '').toLowerCase() === addr)
  if (matches.length > 1) {
    return { ambiguousContactIds: matches.map((c) => c.id) }
  }
  if (matches.length === 0) return {}
  const c = matches[0]
  const dealCandidates = deals.filter(
    (d) => d.contactId === c.id || (c.companyId && d.companyId === c.companyId),
  )
  const deal = pickBestDealForThread(dealCandidates)
  return {
    contactId: c.id,
    companyId: c.companyId || undefined,
    dealId: deal?.id,
  }
}
