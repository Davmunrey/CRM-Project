import type { AutomationRule } from '../../types'
import type { SeedAutomationDemoCopy, SeedAutomationId } from '../types'

/** Stable ids for bundled automation templates (canonical English in store / DB seed). */
export const AUTOMATION_SEED_TEMPLATE_IDS: readonly SeedAutomationId[] = [
  'auto-seed-1',
  'auto-seed-2',
  'auto-seed-3',
  'auto-seed-4',
  'auto-seed-5',
  'auto-seed-6',
  'auto-seed-7',
  'auto-seed-8',
  'auto-seed-9',
  'auto-seed-10',
]

/**
 * Full automation rules in canonical English. Used by the offline store and as the
 * source for `workflowLibrary.automations` in `workflowLibrary/en.ts`.
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
    {
      id: 'auto-seed-4',
      name: 'Qualify after first stage',
      description: 'When a deal moves from Lead to Qualified, schedule a discovery call to validate BANT.',
      isActive: true,
      trigger: { type: 'deal_stage_changed', fromStage: 'lead', toStage: 'qualified' },
      actions: [
        {
          type: 'create_activity',
          activityType: 'task',
          activitySubject: 'Discovery call - validate BANT',
          activityDaysFromNow: 1,
        },
      ],
      executionCount: 0,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'auto-seed-5',
      name: 'Executive alignment (fast-track)',
      description:
        'When a deal jumps from Qualified to Negotiation, create an exec-alignment task before legal review.',
      isActive: true,
      trigger: { type: 'deal_stage_changed', fromStage: 'qualified', toStage: 'negotiation' },
      actions: [
        {
          type: 'create_activity',
          activityType: 'task',
          activitySubject: 'Executive alignment before redlines',
          activityDaysFromNow: 0,
        },
      ],
      executionCount: 0,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'auto-seed-6',
      name: 'Lost deal debrief',
      description: 'When a deal is lost, create a task to capture reasons and refresh the pipeline.',
      isActive: true,
      trigger: { type: 'deal_closed_lost' },
      actions: [
        {
          type: 'create_activity',
          activityType: 'task',
          activitySubject: 'Win/loss debrief - update Propel',
          activityDaysFromNow: 1,
        },
      ],
      executionCount: 0,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'auto-seed-7',
      name: 'Manager alert - lost deal',
      description: 'Notifies the team when a deal is marked lost so pipeline impact can be reviewed.',
      isActive: true,
      trigger: { type: 'deal_closed_lost' },
      actions: [
        {
          type: 'send_notification',
          notificationTitle: 'Deal lost',
          notificationMessage:
            'A deal was lost - review pipeline impact and next actions for {dealTitle}.',
        },
      ],
      executionCount: 0,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'auto-seed-8',
      name: 'Kickoff after win',
      description: 'When a deal is won, create a task to schedule the customer kickoff.',
      isActive: true,
      trigger: { type: 'deal_closed_won' },
      actions: [
        {
          type: 'create_activity',
          activityType: 'task',
          activitySubject: 'Schedule customer kickoff',
          activityDaysFromNow: 0,
        },
      ],
      executionCount: 0,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'auto-seed-9',
      name: 'Recycle when disqualified',
      description: 'When a deal moves from Proposal back to Lead, reopen discovery and confirm scope.',
      isActive: true,
      trigger: { type: 'deal_stage_changed', fromStage: 'proposal', toStage: 'lead' },
      actions: [
        {
          type: 'create_activity',
          activityType: 'task',
          activitySubject: 'Re-qualify scope after rollback',
          activityDaysFromNow: 0,
        },
      ],
      executionCount: 0,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'auto-seed-10',
      name: 'Pause negotiation - refresh proposal',
      description: 'When a deal moves from Negotiation back to Proposal, refresh pricing and legal attachments.',
      isActive: true,
      trigger: { type: 'deal_stage_changed', fromStage: 'negotiation', toStage: 'proposal' },
      actions: [
        {
          type: 'create_activity',
          activityType: 'task',
          activitySubject: 'Refresh proposal package',
          activityDaysFromNow: 1,
        },
      ],
      executionCount: 0,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ]
}

/** Maps English seed rules into the i18n seed catalog shape (English source strings). */
export function automationSeedRulesToDemoCatalog(rules: AutomationRule[]): Record<SeedAutomationId, SeedAutomationDemoCopy> {
  const out: Partial<Record<SeedAutomationId, SeedAutomationDemoCopy>> = {}
  for (const id of AUTOMATION_SEED_TEMPLATE_IDS) {
    const r = rules.find((x) => x.id === id)
    if (!r) {
      throw new Error(`Missing automation seed rule: ${id}`)
    }
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
