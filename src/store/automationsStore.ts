import { create } from 'zustand'
import type { AutomationExecutionLog, AutomationRule, AutomationTriggerType, Deal, DealStage } from '../types'
import { useActivitiesStore } from './activitiesStore'
import { useNotificationsStore } from './notificationsStore'
import { useDealsStore } from './dealsStore'
import { api } from '../lib/api'
import { getTranslations } from '../i18n'

interface AutomationsStore {
  rules: AutomationRule[]
  recentExecutions: AutomationExecutionLog[]
  isLoading: boolean
  error: string | null
  fetchRules: () => Promise<void>
  fetchRecentExecutions: () => Promise<void>
  addRule: (rule: Omit<AutomationRule, 'id' | 'executionCount' | 'createdAt' | 'updatedAt'>) => void
  updateRule: (id: string, updates: Partial<AutomationRule>) => void
  deleteRule: (id: string) => void
  toggleRule: (id: string) => void
  executeRulesForTrigger: (
    triggerType: AutomationTriggerType,
    context: { deal?: Deal; fromStage?: DealStage; toStage?: DealStage; contactId?: string }
  ) => Promise<void>
}

type ApiRule = Record<string, unknown>
type ApiExecution = Record<string, unknown>

function rowToRule(r: ApiRule): AutomationRule {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? '',
    isActive: Boolean(r.isActive ?? r.is_active),
    trigger: (typeof r.trigger === 'string' ? JSON.parse(r.trigger) : r.trigger) as AutomationRule['trigger'],
    actions: (typeof r.actions === 'string' ? JSON.parse(r.actions) : (r.actions ?? [])) as AutomationRule['actions'],
    executionCount: ((r.executionCount ?? r.execution_count) as number) ?? 0,
    createdAt: ((r.createdAt ?? r.created_at) as string),
    updatedAt: ((r.updatedAt ?? r.updated_at) as string),
    lastExecutedAt: ((r.lastExecutedAt ?? r.last_executed_at) as string) ?? undefined,
  }
}

export const useAutomationsStore = create<AutomationsStore>()((set, get) => ({
  rules: [],
  recentExecutions: [],
  isLoading: false,
  error: null,

  fetchRules: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.get<ApiRule[]>('/automations')
      set({ rules: (data ?? []).map(rowToRule), isLoading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  fetchRecentExecutions: async () => {
    try {
      const data = await api.get<ApiExecution[]>('/automations/executions')
      set({
        recentExecutions: (data ?? []).map((row) => ({
          id: row.id as string,
          ruleId: ((row.ruleId ?? row.rule_id) as string),
          triggerType: ((row.triggerType ?? row.trigger_type) as AutomationTriggerType),
          status: ((row.status as string) === 'error' ? 'error' : 'success'),
          context: (typeof row.context === 'string' ? JSON.parse(row.context) : (row.context ?? {})) as Record<string, unknown>,
          result: (typeof row.result === 'string' ? JSON.parse(row.result) : (row.result ?? {})) as Record<string, unknown>,
          errorMessage: ((row.errorMessage ?? row.error_message) as string) ?? undefined,
          createdAt: ((row.createdAt ?? row.created_at) as string),
        })),
      })
    } catch (e: unknown) {
      set({ error: (e as Error).message })
    }
  },

  addRule: (ruleData) => {
    const ts = new Date().toISOString()
    const rule: AutomationRule = { ...ruleData, id: crypto.randomUUID(), executionCount: 0, createdAt: ts, updatedAt: ts }
    set((s) => ({ rules: [...s.rules, rule] }))
    api.post<ApiRule>('/automations', {
      name: rule.name,
      description: rule.description,
      isActive: rule.isActive,
      trigger: rule.trigger,
      actions: rule.actions,
    }).then((created) => {
      set((s) => ({ rules: s.rules.map((r) => r.id === rule.id ? rowToRule(created) : r) }))
    }).catch((err: Error) => {
      set((s) => ({ rules: s.rules.filter((r) => r.id !== rule.id), error: err.message }))
    })
  },

  updateRule: (id, updates) => {
    set((s) => ({
      rules: s.rules.map((r) => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r),
    }))
    api.patch(`/automations/${id}`, updates).catch(() => {})
  },

  deleteRule: (id) => {
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }))
    api.delete(`/automations/${id}`).catch(() => {})
  },

  toggleRule: (id) => {
    const rule = get().rules.find((r) => r.id === id)
    if (!rule) return
    const newActive = !rule.isActive
    set((s) => ({
      rules: s.rules.map((r) => r.id === id ? { ...r, isActive: newActive, updatedAt: new Date().toISOString() } : r),
    }))
    api.patch(`/automations/${id}`, { isActive: newActive }).catch(() => {})
  },

  executeRulesForTrigger: async (triggerType, context) => {
    const activeRules = get().rules.filter((r) => r.isActive && r.trigger.type === triggerType)
    for (const rule of activeRules) {
      if (triggerType === 'deal_stage_changed') {
        if (rule.trigger.fromStage && rule.trigger.fromStage !== context.fromStage) continue
        if (rule.trigger.toStage && rule.trigger.toStage !== context.toStage) continue
      }
      let status: AutomationExecutionLog['status'] = 'success'
      let errorMessage: string | undefined
      let executedActions = 0
      try {
        const tAuto = getTranslations().automations
        const ruleName = rule.name
        for (const action of rule.actions) {
          const deal = context.deal
          if (action.type === 'create_activity' && deal) {
            const dueDate = action.activityDaysFromNow
              ? new Date(Date.now() + action.activityDaysFromNow * 86_400_000).toISOString()
              : undefined
            useActivitiesStore.getState().addActivity({
              type: action.activityType ?? 'task',
              subject: action.activitySubject ?? tAuto.runtimeActivitySubjectFallback.replace(/\{dealTitle\}/g, deal.title),
              description: tAuto.runtimeActivityDescription.replace(/\{ruleName\}/g, ruleName),
              status: 'pending', dealId: deal.id,
              contactId: deal.contactId || undefined, dueDate, createdBy: tAuto.runtimeCreatedBy,
            })
            executedActions += 1
          } else if (action.type === 'send_notification' && deal) {
            useNotificationsStore.getState().notify(
              'system',
              action.notificationTitle ?? tAuto.runtimeNotificationTitleFallback.replace(/\{ruleName\}/g, ruleName),
              (action.notificationMessage ?? tAuto.runtimeNotificationMessageFallback)
                .replace(/\{dealTitle\}/g, deal.title)
                .replace(/\{ruleName\}/g, ruleName),
              { entityType: 'deal', entityId: deal.id }
            )
            executedActions += 1
          } else if (action.type === 'update_deal_stage' && deal && action.newStage) {
            useDealsStore.getState().moveDeal(deal.id, action.newStage)
            executedActions += 1
          } else if (action.type === 'assign_to_user' && deal && action.userId) {
            useDealsStore.getState().updateDeal(deal.id, { assignedTo: action.userId })
            executedActions += 1
          }
        }
      } catch (e: unknown) {
        status = 'error'
        errorMessage = (e as Error).message
      }

      set((s) => ({
        rules: s.rules.map((r) =>
          r.id === rule.id ? { ...r, executionCount: r.executionCount + 1, lastExecutedAt: new Date().toISOString() } : r
        ),
      }))

      const localLog: AutomationExecutionLog = {
        id: crypto.randomUUID(),
        ruleId: rule.id,
        triggerType,
        status,
        context: context as unknown as Record<string, unknown>,
        result: { executedActions },
        errorMessage,
        createdAt: new Date().toISOString(),
      }
      set((s) => ({ recentExecutions: [localLog, ...s.recentExecutions].slice(0, 25) }))

      api.post('/automations/executions', {
        ruleId: rule.id,
        triggerType,
        status,
        context,
        result: { executedActions },
        errorMessage,
      }).catch(() => {})
    }
  },
}))
