import type {
  Translations,
  SeedAutomationId,
  SeedDemoAuthUserId,
  SeedProductId,
  SeedQuickReplyId,
  SeedSequenceId,
  SeedTemplateId,
} from './types'
import type {
  Activity,
  Company,
  Contact,
  CRMEmail,
  Deal,
  Product,
  EmailTemplate,
  AutomationRule,
  AutomationAction,
  EmailSequence,
  SequenceFlowNode,
  SequenceStep,
} from '../types'
import { isAbSplitPayload } from '../types'
import type { AuthUser, Organization } from '../types/auth'

function isSeedProductId(id: string): id is SeedProductId {
  return (
    id === 'prod-001' || id === 'prod-002' || id === 'prod-003' ||
    id === 'prod-004' || id === 'prod-005' || id === 'prod-006'
  )
}

export function localizedProduct(product: Product, t: Translations): Product {
  if (!isSeedProductId(product.id)) return product
  const row = t.seedDemo.products[product.id]
  return { ...product, name: row.name, description: row.description }
}

export function localizedEmailTemplate(template: EmailTemplate, t: Translations): EmailTemplate {
  if (!(template.id in t.seedDemo.emailTemplates)) return template
  const row = t.seedDemo.emailTemplates[template.id as SeedTemplateId]
  return { ...template, name: row.name, subject: row.subject, body: row.body }
}

export function localizedQuickReply(
  qr: { id: string; title: string; body: string; createdAt: string; updatedAt: string },
  t: Translations,
): typeof qr {
  if (!(qr.id in t.seedDemo.quickReplies)) return qr
  const row = t.seedDemo.quickReplies[qr.id as SeedQuickReplyId]
  return { ...qr, title: row.title, body: row.body }
}

function patchAutomationActions(actions: AutomationAction[], copy: Translations['seedDemo']['automations'][SeedAutomationId]): AutomationAction[] {
  return actions.map((a) => {
    if (a.type === 'create_activity' && copy.createActivitySubject) {
      return { ...a, activitySubject: copy.createActivitySubject }
    }
    if (a.type === 'send_notification' && copy.notificationTitle) {
      return {
        ...a,
        notificationTitle: copy.notificationTitle,
        notificationMessage: copy.notificationMessage ?? a.notificationMessage,
      }
    }
    return a
  })
}

export function localizedAutomationRule(rule: AutomationRule, t: Translations): AutomationRule {
  if (!(rule.id in t.seedDemo.automations)) return rule
  const copy = t.seedDemo.automations[rule.id as SeedAutomationId]
  return {
    ...rule,
    name: copy.name,
    description: copy.description,
    actions: patchAutomationActions(rule.actions, copy),
  }
}

function patchSequenceSteps(steps: SequenceStep[], stepCopy: Record<string, { subject?: string; bodyTemplate?: string; taskDescription?: string }>): SequenceStep[] {
  return steps.map((step: SequenceStep): SequenceStep => {
    const sc = stepCopy[step.id]
    if (!sc) return step
    const next: SequenceStep = {
      ...step,
      ...(sc.subject !== undefined ? { subject: sc.subject } : {}),
      ...(sc.bodyTemplate !== undefined ? { bodyTemplate: sc.bodyTemplate } : {}),
      ...(sc.taskDescription !== undefined ? { taskDescription: sc.taskDescription } : {}),
    }
    return next
  })
}

function patchFlowNodesFromStepCopy(
  nodes: SequenceFlowNode[],
  stepCopy: Record<string, { subject?: string; bodyTemplate?: string; taskDescription?: string }>,
): SequenceFlowNode[] {
  return nodes.map((node) => {
    if (node.type === 'ab_split' || isAbSplitPayload(node.data)) return node
    const step = node.data as SequenceStep
    const sc = stepCopy[step.id]
    if (!sc) return node
    return {
      ...node,
      data: {
        ...step,
        ...(sc.subject !== undefined ? { subject: sc.subject } : {}),
        ...(sc.bodyTemplate !== undefined ? { bodyTemplate: sc.bodyTemplate } : {}),
        ...(sc.taskDescription !== undefined ? { taskDescription: sc.taskDescription } : {}),
      },
    }
  })
}

export function localizedEmailSequence(sequence: EmailSequence, t: Translations): EmailSequence {
  if (!(sequence.id in t.seedDemo.sequences)) return sequence
  const copy = t.seedDemo.sequences[sequence.id as SeedSequenceId]
  return {
    ...sequence,
    name: copy.name,
    description: copy.description,
    steps: patchSequenceSteps(sequence.steps, copy.steps),
    flowDefinition: sequence.flowDefinition
      ? {
          ...sequence.flowDefinition,
          nodes: patchFlowNodesFromStepCopy(sequence.flowDefinition.nodes, copy.steps),
        }
      : sequence.flowDefinition,
  }
}

export function localizedContact(contact: Contact, _t: Translations): Contact {
  return contact
}

export function localizedCompany(company: Company, _t: Translations): Company {
  return company
}

export function localizedDeal(deal: Deal, _t: Translations): Deal {
  return deal
}

export function localizedActivity(activity: Activity, _t: Translations): Activity {
  return activity
}

export function localizedCRMEmail(email: CRMEmail, _t: Translations): CRMEmail {
  return email
}

export function localizedAuthUser(user: AuthUser, t: Translations): AuthUser {
  const row = t.seedDemo.demoAuth?.users?.[user.id as SeedDemoAuthUserId]
  if (!row?.jobTitle) return user
  return { ...user, jobTitle: row.jobTitle }
}

export function localizedOrganization(org: Organization | null, t: Translations): Organization | null {
  if (!org) return org
  const name = t.seedDemo.demoAuth?.organizationName
  if (!name || org.id !== 'org-001') return org
  return { ...org, name }
}

export function localizeContacts(contacts: Contact[], t: Translations): Contact[] {
  return contacts.map((c) => localizedContact(c, t))
}

export function localizeCompanies(companies: Company[], t: Translations): Company[] {
  return companies.map((c) => localizedCompany(c, t))
}

export function localizeDeals(deals: Deal[], t: Translations): Deal[] {
  return deals.map((d) => localizedDeal(d, t))
}

export function localizeActivities(activities: Activity[], t: Translations): Activity[] {
  return activities.map((a) => localizedActivity(a, t))
}

export function localizeCRMEmails(emails: CRMEmail[], t: Translations): CRMEmail[] {
  return emails.map((e) => localizedCRMEmail(e, t))
}

export function localizeAuthUsers(users: AuthUser[], t: Translations): AuthUser[] {
  return users.map((u) => localizedAuthUser(u, t))
}
