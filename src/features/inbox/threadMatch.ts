import type { Contact, Company, Deal, GmailThread } from '../../types'
import type { GmailThreadLink } from '../../store/emailStore'
import { extractEmail, emailDomain } from './emailParsing'

export interface ThreadMatch {
  contact?: Contact
  companyId?: string
  companyName?: string
  dealId?: string
  dealTitle?: string
}

function isClosedDealStage(stage: string): boolean {
  return stage === 'closed_won' || stage === 'closed_lost'
}

/** Prefer an open deal; if all closed, fall back to most recently updated. */
export function pickBestDealForThread(candidates: Deal[]): Deal | undefined {
  if (!candidates.length) return undefined
  const open = candidates.filter((d) => !isClosedDealStage(d.stage))
  const pool = open.length ? open : candidates
  return [...pool].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0]
}

export function buildAutoThreadMatchMap(
  threads: GmailThread[],
  contacts: Contact[],
  companies: Company[],
  deals: Deal[],
): Map<string, ThreadMatch> {
  const byId = new Map<string, ThreadMatch>()
  const contactsByEmail = new Map(contacts.filter((c) => !!c.email).map((c) => [c.email.toLowerCase(), c] as const))
  const companyById = new Map(companies.map((c) => [c.id, c] as const))
  const companyByDomain = new Map(
    companies.filter((c) => !!c.domain).map((c) => [c.domain.toLowerCase(), c] as const),
  )

  for (const thread of threads) {
    const addresses = thread.messages
      .flatMap((msg) => [extractEmail(msg.from), ...msg.to.split(',').map((p) => extractEmail(p))])
      .filter(Boolean)
    const uniqueAddresses = [...new Set(addresses)]
    const matchedContact = uniqueAddresses.map((addr) => contactsByEmail.get(addr)).find(Boolean)

    let companyId = matchedContact?.companyId
    if (!companyId) {
      const domainMatchedCompany = uniqueAddresses
        .map((addr) => emailDomain(addr))
        .map((domain) => companyByDomain.get(domain))
        .find(Boolean)
      companyId = domainMatchedCompany?.id
    }

    const dealCandidates = deals.filter(
      (d) =>
        (matchedContact && d.contactId === matchedContact.id) ||
        (companyId && d.companyId === companyId),
    )
    const relatedDeal = pickBestDealForThread(dealCandidates)

    byId.set(thread.id, {
      contact: matchedContact,
      companyId,
      companyName: companyId ? companyById.get(companyId)?.name : undefined,
      dealId: relatedDeal?.id,
      dealTitle: relatedDeal?.title,
    })
  }
  return byId
}

export function buildPersistedThreadMatchMap(
  threadLinks: Record<string, GmailThreadLink>,
  contacts: Contact[],
  companies: Company[],
  deals: Deal[],
): Map<string, ThreadMatch> {
  const byId = new Map<string, ThreadMatch>()
  for (const [threadId, link] of Object.entries(threadLinks)) {
    const contact = link.contactId ? contacts.find((c) => c.id === link.contactId) : undefined
    const companyId = link.companyId ?? contact?.companyId
    byId.set(threadId, {
      contact,
      companyId: companyId ?? undefined,
      companyName: companyId ? companies.find((c) => c.id === companyId)?.name : undefined,
      dealId: link.dealId ?? undefined,
      dealTitle: link.dealId ? deals.find((d) => d.id === link.dealId)?.title : undefined,
    })
  }
  return byId
}
