import type { Activity, Company, Contact, CRMEmail, Deal } from '../types'

const ASSIGNEE_NAME_MAP: Record<string, string> = {
  'David Muñoz': 'Demo Admin',
  'Sara López': 'Demo Manager',
  'Carlos Vega': 'Demo Rep',
}

function sanitizeAssignee(name: string): string {
  return ASSIGNEE_NAME_MAP[name] ?? name
}

function sanitizeEmailAddress(value: string, fallback: string): string {
  if (!value.includes('@')) return fallback
  const local = value.split('@')[0] || fallback.split('@')[0]
  const safeLocal = local.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() || 'demo'
  return `${safeLocal}@example.com`
}

export function sanitizeDemoCompanies(companies: Company[]): Company[] {
  return companies.map((company, index) => ({
    ...company,
    name: `Demo Company ${index + 1}`,
    domain: `company${index + 1}.example.com`,
    website: `https://company${index + 1}.example.com`,
    country: 'Spain',
    notes: 'Demo company record.',
  }))
}

export function sanitizeDemoContacts(contacts: Contact[]): Contact[] {
  return contacts.map((contact, index) => ({
    ...contact,
    firstName: 'Demo',
    lastName: `Contact ${index + 1}`,
    email: `contact${index + 1}@example.com`,
    assignedTo: sanitizeAssignee(contact.assignedTo),
    notes: 'Demo contact record.',
  }))
}

export function sanitizeDemoDeals(deals: Deal[]): Deal[] {
  return deals.map((deal, index) => ({
    ...deal,
    title: `Demo Deal ${index + 1}`,
    assignedTo: sanitizeAssignee(deal.assignedTo),
    notes: 'Demo deal record.',
  }))
}

export function sanitizeDemoActivities(activities: Activity[]): Activity[] {
  return activities.map((activity, index) => ({
    ...activity,
    subject: `Demo Activity ${index + 1}`,
    description: 'Demo activity record.',
    outcome: activity.outcome ? 'Demo outcome.' : activity.outcome,
    createdBy: sanitizeAssignee(activity.createdBy),
  }))
}

export function sanitizeDemoEmails(emails: CRMEmail[]): CRMEmail[] {
  return emails.map((email, index) => ({
    ...email,
    from: sanitizeEmailAddress(email.from, `sender${index + 1}@example.com`),
    to: email.to.map((recipient, toIndex) =>
      sanitizeEmailAddress(recipient, `recipient${index + 1}-${toIndex + 1}@example.com`),
    ),
    cc: email.cc?.map((recipient, ccIndex) =>
      sanitizeEmailAddress(recipient, `cc${index + 1}-${ccIndex + 1}@example.com`),
    ),
    bcc: email.bcc?.map((recipient, bccIndex) =>
      sanitizeEmailAddress(recipient, `bcc${index + 1}-${bccIndex + 1}@example.com`),
    ),
    replyTo: email.replyTo ? sanitizeEmailAddress(email.replyTo, `reply${index + 1}@example.com`) : email.replyTo,
    subject: `Demo Email ${index + 1}`,
    body: 'Demo email content for offline mode.',
  }))
}

