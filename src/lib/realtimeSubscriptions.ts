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
}

/**
 * Subscribe to DB change events from the Velo API via server-sent events or
 * polling. Currently a no-op placeholder — Socket.io integration is done in
 * velo-api/src/services/realtime.ts. Returns a cleanup function.
 */
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

  // Expose for Socket.io integration: window.__veloDbChange(table)
  ;(window as unknown as Record<string, unknown>).__veloDbChange = scheduleFetch

  return () => {
    throttledByTable.forEach((timer) => window.clearTimeout(timer))
    throttledByTable.clear()
    delete (window as unknown as Record<string, unknown>).__veloDbChange
  }
}
