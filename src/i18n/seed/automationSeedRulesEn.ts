import type { AutomationRule } from '../../types'
import type { SeedAutomationDemoCopy, SeedAutomationId } from '../types'

/** Stable ids for bundled automation templates (canonical English in store / DB seed). */
export const AUTOMATION_SEED_TEMPLATE_IDS: readonly SeedAutomationId[] = ['auto-seed-1', 'auto-seed-2', 'auto-seed-3']

/**
 * Full automation rules in canonical English. Used by the offline store and as the
 * source for `seedDemo.automations` in `en.demo.ts`.
 */
export function createAutomationSeedRules(isoNow: string): AutomationRule[] {
  return [
    {
      id: 'auto-seed-1',
      name: 'Send follow-up email',
      description: 'When a deal moves to Proposal, create an email task to send the formal proposal.',
      isActive: true,
      trigger: { type: 'deal_stage_changed', toStage: 'proposal' },
      actions: [
        {
          type: 'create_activity',
          activityType: 'email',
          activitySubject: 'Send formal proposal',
          activityDaysFromNow: 2,
        },
      ],
      executionCount: 0,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'auto-seed-2',
      name: 'Notify deal won',
      description: 'Send a notification when a deal is closed successfully.',
      isActive: true,
      trigger: { type: 'deal_closed_won' },
      actions: [
        {
          type: 'send_notification',
          notificationTitle: 'Deal won',
          notificationMessage: 'Congratulations! A deal has been closed successfully.',
        },
      ],
      executionCount: 0,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'auto-seed-3',
      name: 'Post-negotiation task',
      description: 'When a deal enters Negotiation, create a task to review contract terms.',
      isActive: true,
      trigger: { type: 'deal_stage_changed', toStage: 'negotiation' },
      actions: [
        {
          type: 'create_activity',
          activityType: 'task',
          activitySubject: 'Review contract terms',
          activityDaysFromNow: 1,
        },
      ],
      executionCount: 0,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ]
}

/** Maps English seed rules into the i18n seed demo catalog shape (English source strings). */
export function automationSeedRulesToDemoCatalog(rules: AutomationRule[]): Record<SeedAutomationId, SeedAutomationDemoCopy> {
  const out: Partial<Record<SeedAutomationId, SeedAutomationDemoCopy>> = {}
  for (const r of rules) {
    if (r.id !== 'auto-seed-1' && r.id !== 'auto-seed-2' && r.id !== 'auto-seed-3') continue
    const id = r.id as SeedAutomationId
    const row: SeedAutomationDemoCopy = { name: r.name, description: r.description }
    for (const a of r.actions) {
      if (a.type === 'create_activity' && a.activitySubject) {
        row.createActivitySubject = a.activitySubject
      }
      if (a.type === 'send_notification') {
        if (a.notificationTitle) row.notificationTitle = a.notificationTitle
        if (a.notificationMessage) row.notificationMessage = a.notificationMessage
      }
    }
    out[id] = row
  }
  return out as Record<SeedAutomationId, SeedAutomationDemoCopy>
}

/** Payload for "use template" (new UUID at insert time). */
export function getAutomationTemplateRulePayload(
  id: SeedAutomationId,
): Omit<AutomationRule, 'id' | 'executionCount' | 'createdAt' | 'updatedAt'> {
  const rule = createAutomationSeedRules('').find((r) => r.id === id)
  if (!rule) {
    throw new Error(`Unknown automation template: ${id}`)
  }
  return {
    name: rule.name,
    description: rule.description,
    isActive: rule.isActive,
    trigger: rule.trigger,
    actions: rule.actions,
  }
}

/** Stable structural rules for previews (ids and triggers); timestamps are placeholders. */
export const AUTOMATION_SEED_STRUCTURAL_RULES: AutomationRule[] = createAutomationSeedRules('1970-01-01T00:00:00.000Z')
