import { io, type Socket } from 'socket.io-client'
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
import { getToken } from './api'

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

  // Bridge for velo-api Socket.io events
  ;(window as unknown as Record<string, unknown>).__veloDbChange = scheduleFetch

  // Connect Socket.io to velo-api
  const authState = useAuthStore.getState()
  const token = getToken()
  const orgId = authState.organizationId
  const userId = authState.currentUser?.id

  let socket: Socket | null = null

  if (token && orgId && userId) {
    const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'
    // Strip path prefix so socket connects to the server root
    const serverUrl = apiBase.startsWith('http') ? new URL(apiBase).origin : window.location.origin

    socket = io(serverUrl, {
      auth: { token, orgId, userId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })

    socket.on('db:change', ({ table }: { table: string }) => {
      scheduleFetch(table)
    })

    socket.on('connect_error', () => {
      // Silent — realtime is optional, stores still poll on user action
    })
  }

  return () => {
    throttledByTable.forEach((timer) => window.clearTimeout(timer))
    throttledByTable.clear()
    delete (window as unknown as Record<string, unknown>).__veloDbChange
    socket?.disconnect()
  }
}
