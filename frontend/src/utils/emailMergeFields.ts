import type { Translations } from '../i18n/types'
import type { Company, Contact, Deal } from '../types'
import { formatCurrency } from './formatters'

/** Placeholders replaced at send time when a contact (or linked deal/company) is in context. */
export function getEmailMergeFieldOptions(t: Translations): Array<{ token: string; label: string }> {
  return [
    { token: '{{firstName}}', label: `${t.contacts.firstName} · {{firstName}}` },
    { token: '{{lastName}}', label: `${t.contacts.lastName} · {{lastName}}` },
    { token: '{{company}}', label: `${t.contacts.company} · {{company}}` },
    { token: '{{dealTitle}}', label: `${t.nav.deals} · {{dealTitle}}` },
    { token: '{{dealValue}}', label: `${t.common.value} · {{dealValue}}` },
    { token: '{{email}}', label: `${t.common.email} · {{email}}` },
    { token: '{{jobTitle}}', label: `${t.contacts.jobTitle} · {{jobTitle}}` },
    { token: '{{phone}}', label: `${t.common.phone} · {{phone}}` },
  ]
}

export function buildEmailMergeVariableMap(params: {
  contact?: Contact | null
  company?: Company | null
  deal?: Deal | null
}): Record<string, string> {
  const { contact, company, deal } = params
  return {
    '{{firstName}}': contact?.firstName ?? '',
    '{{lastName}}': contact?.lastName ?? '',
    '{{company}}': company?.name ?? '',
    '{{dealTitle}}': deal?.title ?? '',
    '{{dealValue}}': deal ? formatCurrency(deal.value, deal.currency) : '',
    '{{email}}': contact?.email ?? '',
    '{{jobTitle}}': contact?.jobTitle ?? '',
    '{{phone}}': contact?.phone ?? '',
  }
}

export function applyEmailMergeTokens(text: string, vars: Record<string, string>): string {
  let out = text
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(key, value)
  }
  return out
}
