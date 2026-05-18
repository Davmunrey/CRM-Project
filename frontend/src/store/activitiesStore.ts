import { create } from 'zustand'
import type { Activity, ActivityFilters } from '../types'
import { useAuditStore } from './auditStore'
import { api } from '../lib/api'
import { getErrorMessage } from '../lib/supabaseHelpers'
import { useAuthStore } from './authStore'
import { getTranslations } from '../i18n'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function mapActivity(row: Record<string, unknown>): Activity {
  const createdBy = (row.createdBy ?? row.created_by) as string | null
  const users = useAuthStore.getState().users
  const createdByName = createdBy
    ? (users.find((u) => u.id === createdBy)?.name ?? createdBy)
    : ''

  return {
    id: row.id as string,
    type: (row.type as Activity['type']) ?? 'task',
    subject: (row.subject as string) ?? '',
    description: (row.description as string) ?? '',
    outcome: (row.outcome as string) ?? undefined,
    dueDate: (row.dueDate ?? row.due_date) as string | undefined,
    completedAt: (row.completedAt ?? row.completed_at) as string | undefined,
    status: (row.status as Activity['status']) ?? 'pending',
    contactId: (row.contactId ?? row.contact_id) as string | undefined,
    companyId: (row.companyId ?? row.company_id) as string | undefined,
    dealId: (row.dealId ?? row.deal_id) as string | undefined,
    createdBy: createdByName,
    createdAt: (row.createdAt ?? row.created_at ?? '') as string,
  }
}

export interface ActivitiesState {
  activities: Activity[]
  filters: ActivityFilters
  selectedId: string | null
  isLoading: boolean
  error: string | null

  fetchActivities: () => Promise<void>
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt'>) => Activity
  updateActivity: (id: string, updates: Partial<Activity>) => void
  deleteActivity: (id: string) => void
  completeActivity: (id: string, outcome?: string) => void
  setFilter: (key: keyof ActivityFilters, value: string) => void
  clearFilters: () => void
  setSelectedId: (id: string | null) => void

  getById: (id: string) => Activity | undefined
  getFilteredActivities: () => Activity[]
  getActivitiesForContact: (contactId: string) => Activity[]
  getActivitiesForDeal: (dealId: string) => Activity[]
  getActivitiesForCompany: (companyId: string) => Activity[]
  getPendingActivities: () => Activity[]
  getOverdueActivities: () => Activity[]
}

const defaultFilters: ActivityFilters = {
  search: '',
  type: '',
  status: '',
  contactId: '',
  dealId: '',
  dateFrom: '',
  dateTo: '',
}

export const useActivitiesStore = create<ActivitiesState>()(
  (set, get) => ({
    activities: [],
    filters: defaultFilters,
    selectedId: null,
    isLoading: false,
    error: null,

    fetchActivities: async () => {
      set({ isLoading: true, error: null })
      try {
        const data = await api.get<Activity[]>('/activities')
        set({ activities: (data ?? []).map((r) => mapActivity(r as unknown as Record<string, unknown>)), isLoading: false })
      } catch (e: unknown) {
        set({ error: getErrorMessage(e), isLoading: false })
      }
    },

    addActivity: (activityData) => {
      const now = new Date().toISOString()
      const id = crypto.randomUUID()
      const activity: Activity = { ...activityData, id, createdAt: now }
      set((state) => ({ activities: [activity, ...state.activities] }))
      useAuditStore.getState().logAction('activity_created', 'activity', activity.id, activity.subject, getTranslations().auditMessages.activityCreated)

      const currentUserId = useAuthStore.getState().currentUser?.id
      const body = { ...activityData, ...(currentUserId && isUuid(currentUserId) ? { createdBy: currentUserId } : {}) }
      api.post<Activity>('/activities', body).then(
        (real) => {
          set((s) => ({ activities: s.activities.map((a) => a.id === id ? mapActivity(real as unknown as Record<string, unknown>) : a) }))
          if (activityData.contactId) {
            import('./leadsStore').then(({ useLeadsStore }) => {
              const lead = useLeadsStore.getState().leads.find((l) => l.convertedContactId === activityData.contactId)
              if (lead) useLeadsStore.getState().recomputeLeadScore(lead.id, { reason: 'activity_logged' })
            })
          }
        },
        (err: unknown) => {
          set((s) => ({ activities: s.activities.filter((a) => a.id !== id), error: getErrorMessage(err) }))
        },
      )

      return activity
    },

    updateActivity: (id, updates) => {
      set((state) => ({
        activities: state.activities.map((a) => a.id === id ? { ...a, ...updates } : a),
      }))
      api.patch(`/activities/${id}`, updates).catch((e: unknown) => set({ error: getErrorMessage(e) }))
    },

    deleteActivity: (id) => {
      const activity = get().getById(id)
      set((state) => ({ activities: state.activities.filter((a) => a.id !== id) }))
      useAuditStore.getState().logAction('activity_deleted', 'activity', id, activity?.subject ?? '', getTranslations().auditMessages.activityDeleted)
      api.delete(`/activities/${id}`).catch((e: unknown) => set({ error: getErrorMessage(e) }))
    },

    completeActivity: (id, outcome) => {
      const now = new Date().toISOString()
      set((state) => ({
        activities: state.activities.map((a) =>
          a.id === id
            ? { ...a, status: 'completed' as const, completedAt: now, ...(outcome ? { outcome } : {}) }
            : a
        ),
      }))
      const activity = get().getById(id)
      useAuditStore.getState().logAction('activity_completed', 'activity', id, activity?.subject ?? '', getTranslations().auditMessages.activityCompleted)
      const patch: Record<string, unknown> = { status: 'completed', completedAt: now }
      if (outcome) patch.outcome = outcome
      api.patch(`/activities/${id}`, patch).catch((e: unknown) => set({ error: getErrorMessage(e) }))
    },

    setFilter: (key, value) => {
      set((state) => ({ filters: { ...state.filters, [key]: value } }))
    },

    clearFilters: () => {
      set({ filters: defaultFilters })
    },

    setSelectedId: (id) => {
      set({ selectedId: id })
    },

    getById: (id) => {
      return get().activities.find((a) => a.id === id)
    },

    getFilteredActivities: () => {
      const { activities, filters } = get()
      return activities.filter((a) => {
        const q = filters.search.toLowerCase()
        if (q && !a.subject.toLowerCase().includes(q) && !a.description.toLowerCase().includes(q)) return false
        if (filters.type && a.type !== filters.type) return false
        if (filters.status && a.status !== filters.status) return false
        if (filters.contactId && a.contactId !== filters.contactId) return false
        if (filters.dealId && a.dealId !== filters.dealId) return false
        if (filters.dateFrom && a.createdAt < filters.dateFrom) return false
        if (filters.dateTo && a.createdAt > filters.dateTo) return false
        return true
      })
    },

    getActivitiesForContact: (contactId) => get().activities.filter((a) => a.contactId === contactId),
    getActivitiesForDeal: (dealId) => get().activities.filter((a) => a.dealId === dealId),
    getActivitiesForCompany: (companyId) => get().activities.filter((a) => a.companyId === companyId),
    getPendingActivities: () => get().activities.filter((a) => a.status === 'pending'),

    getOverdueActivities: () => {
      const now = new Date().toISOString().split('T')[0]
      return get().activities.filter(
        (a) => a.status === 'pending' && a.dueDate && a.dueDate < now
      )
    },
  })
)
