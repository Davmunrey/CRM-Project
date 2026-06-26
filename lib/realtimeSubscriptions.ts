/**
 * Supabase Realtime subscriptions — replaces legacy Socket.io (Hito 2+).
 */
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { useContactsStore } from '../store/contactsStore'
import { useCompaniesStore } from '../store/companiesStore'
import { useDealsStore } from '../store/dealsStore'
import { useActivitiesStore } from '../store/activitiesStore'
import { useNotificationsStore } from '../store/notificationsStore'
import { useGoalsStore } from '../store/goalsStore'
import { useSequencesStore } from '../store/sequencesStore'
import { useAutomationsStore } from '../store/automationsStore'
import { useTemplateStore } from '../store/templateStore'
import { useProductsStore } from '../store/productsStore'
import { useCustomFieldsStore } from '../store/customFieldsStore'
import { useLeadsStore } from '../store/leadsStore'
import { useAuditStore } from '../store/auditStore'
import { useAuthStore } from '../store/authStore'
import { usePipelinesStore } from '../store/pipelinesStore'

type TableHandler = () => void

const TABLE_HANDLERS: Record<string, TableHandler> = {
  contacts: () => useContactsStore.getState().fetchContacts(),
  companies: () => useCompaniesStore.getState().fetchCompanies(),
  deals: () => useDealsStore.getState().fetchDeals({ silent: true }),
  activities: () => useActivitiesStore.getState().fetchActivities(),
  notifications: () => useNotificationsStore.getState().fetchNotifications(),
  sales_goals: () => useGoalsStore.getState().fetchGoals(),
  email_sequences: () => useSequencesStore.getState().fetchSequences(),
  automation_rules: () => {
    const s = useAutomationsStore.getState()
    void s.fetchRules()
    void s.fetchRecentExecutions()
  },
  automation_executions: () => useAutomationsStore.getState().fetchRecentExecutions(),
  sequence_enrollments: () => useSequencesStore.getState().fetchSequences(),
  leads: () => useLeadsStore.getState().fetchLeads(),
  audit_log: () => useAuditStore.getState().fetchEntries(),
  organization_members: () => {
    const orgId = useAuthStore.getState().organizationId
    if (orgId) void useAuthStore.getState().fetchOrgUsers(orgId).catch(() => {})
  },
  email_templates: () => useTemplateStore.getState().fetchTemplates(),
  products: () => useProductsStore.getState().fetchProducts(),
  custom_field_definitions: () => useCustomFieldsStore.getState().fetchCustomFields(),
  pipelines: () => usePipelinesStore.getState().fetchPipelines(),
}

export function initRealtimeSubscriptions(): () => void {
  const throttledByTable = new Map<string, number>()

  const scheduleFetch = (table: string) => {
    const existing = throttledByTable.get(table)
    if (existing) window.clearTimeout(existing)
    const handler = TABLE_HANDLERS[table]
    if (!handler) return
    const timer = window.setTimeout(() => {
      handler()
      throttledByTable.delete(table)
    }, 180)
    throttledByTable.set(table, timer)
  }

  ;(window as unknown as Record<string, unknown>).__propelDbChange = scheduleFetch

  const authState = useAuthStore.getState()
  const orgId = authState.organizationId
  if (!orgId || !isSupabaseConfigured()) {
    return () => {
      throttledByTable.forEach((timer) => window.clearTimeout(timer))
      delete (window as unknown as Record<string, unknown>).__propelDbChange
    }
  }

  const supabase = createClient()
  const channel = supabase
    .channel(`org:${orgId}`)
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      const table = (payload.table as string) ?? ''
      scheduleFetch(table)
    })
    .subscribe()

  return () => {
    throttledByTable.forEach((timer) => window.clearTimeout(timer))
    delete (window as unknown as Record<string, unknown>).__propelDbChange
    void supabase.removeChannel(channel)
  }
}
