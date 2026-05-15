import { create } from 'zustand'
import type { Deal, DealFilters, DealStage, QuoteItem } from '../types'
import { useAuditStore } from './auditStore'
import { useNotificationsStore } from './notificationsStore'
import { api } from '../lib/api'
import { getErrorMessage } from '../lib/supabaseHelpers'
import { useAuthStore } from './authStore'
import { useAutomationsStore } from './automationsStore'
import { toast } from './toastStore'
import { getTranslations } from '../i18n'

function dealStageLabel(stage: DealStage): string {
  const labels = getTranslations().deals.stageLabels as Record<string, string>
  return labels[stage] ?? stage
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function mapDeal(row: Record<string, unknown>): Deal {
  const assignedTo = (row.assignedTo ?? row.assigned_to) as string | null
  const users = useAuthStore.getState().users
  const assignedToName = assignedTo
    ? (users.find((u) => u.id === assignedTo)?.name ?? assignedTo)
    : ''

  return {
    id: row.id as string,
    title: (row.title as string) ?? '',
    value: (row.value as number) ?? 0,
    currency: (row.currency as Deal['currency']) ?? 'EUR',
    stage: (row.stage as Deal['stage']) ?? 'lead',
    pipelineId: (row.pipelineId ?? row.pipeline_id) as string | undefined,
    probability: (row.probability as number) ?? 0,
    expectedCloseDate: (row.expectedCloseDate ?? row.expected_close_date ?? '') as string,
    contactId: (row.contactId ?? row.contact_id ?? '') as string,
    companyId: (row.companyId ?? row.company_id ?? '') as string,
    assignedTo: assignedToName,
    priority: (row.priority as Deal['priority']) ?? 'medium',
    source: (row.source as string) ?? '',
    notes: (row.notes as string) ?? '',
    activities: (row.activities as string[]) ?? [],
    quoteItems: (row.quoteItems ?? row.quote_items) as QuoteItem[] | undefined,
    createdAt: (row.createdAt ?? row.created_at ?? '') as string,
    updatedAt: (row.updatedAt ?? row.updated_at ?? '') as string,
  }
}

interface DealsState {
  deals: Deal[]
  filters: DealFilters
  selectedId: string | null
  isLoading: boolean
  error: string | null
  viewMode: 'kanban' | 'list'

  fetchDeals: (options?: { silent?: boolean; pipelineId?: string }) => Promise<void>
  addDeal: (deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>) => Deal
  updateDeal: (id: string, updates: Partial<Deal>) => void
  deleteDeal: (id: string) => void
  moveDeal: (id: string, newStage: DealStage) => void
  setFilter: (key: keyof DealFilters, value: string) => void
  clearFilters: () => void
  setSelectedId: (id: string | null) => void
  setViewMode: (mode: 'kanban' | 'list') => void

  updateQuote: (dealId: string, items: QuoteItem[]) => void

  getById: (id: string) => Deal | undefined
  getFilteredDeals: () => Deal[]
  getDealsByStage: (stage: DealStage) => Deal[]
  getPipelineValue: () => number
  getWonThisMonth: () => number
}

const defaultFilters: DealFilters = {
  search: '',
  stage: '',
  assignedTo: '',
  priority: '',
  valueMin: '',
  valueMax: '',
  dueDateFrom: '',
  dueDateTo: '',
}

export const useDealsStore = create<DealsState>()(
  (set, get) => ({
    deals: [],
    filters: defaultFilters,
    selectedId: null,
    isLoading: false,
    error: null,
    viewMode: 'kanban',

    fetchDeals: async (options) => {
      if (!options?.silent) set({ isLoading: true, error: null })
      else set({ error: null })
      try {
        const url = options?.pipelineId ? `/deals?pipelineId=${options.pipelineId}` : '/deals'
        const res = await api.get<{ data: Deal[] } | Deal[]>(url)
        const rows = (res && !Array.isArray(res) && 'data' in res) ? res.data : (res as Deal[] ?? [])
        set({ deals: rows.map((r) => mapDeal(r as unknown as Record<string, unknown>)), isLoading: false })
      } catch (e: unknown) {
        set({ error: getErrorMessage(e), isLoading: false })
      }
    },

    addDeal: (dealData) => {
      const now = new Date().toISOString()
      const id = crypto.randomUUID()
      const deal: Deal = { ...dealData, id, createdAt: now, updatedAt: now }
      set((state) => ({ deals: [deal, ...state.deals] }))
      useAuditStore.getState().logAction('deal_created', 'deal', deal.id, deal.title, getTranslations().auditMessages.dealCreated)

      const currentUserId = useAuthStore.getState().currentUser?.id
      const body = { ...dealData, ...(currentUserId && isUuid(currentUserId) ? { createdBy: currentUserId } : {}) }
      api.post<Deal>('/deals', body).then(
        (real) => {
          set((s) => ({ deals: s.deals.map((d) => d.id === id ? mapDeal(real as unknown as Record<string, unknown>) : d) }))
        },
        (err: unknown) => {
          const message = getErrorMessage(err)
          set({ error: message })
          toast.error(`${message}. ${getTranslations().dealSync.dealSavedRetrySuffix}`)
        },
      )

      return deal
    },

    updateDeal: (id, updates) => {
      set((state) => ({
        deals: state.deals.map((d) =>
          d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
        ),
      }))
      const deal = get().getById(id)
      useAuditStore.getState().logAction('deal_updated', 'deal', id, deal?.title ?? '', getTranslations().auditMessages.dealUpdated)
      api.patch(`/deals/${id}`, updates).catch((e: unknown) => set({ error: getErrorMessage(e) }))
    },

    deleteDeal: (id) => {
      const deal = get().getById(id)
      set((state) => ({ deals: state.deals.filter((d) => d.id !== id) }))
      useAuditStore.getState().logAction('deal_deleted', 'deal', id, deal?.title ?? '', getTranslations().auditMessages.dealDeleted)
      api.delete(`/deals/${id}`).catch((e: unknown) => set({ error: getErrorMessage(e) }))
    },

    moveDeal: (id, newStage) => {
      const oldDeal = get().getById(id)
      set((state) => ({
        deals: state.deals.map((d) =>
          d.id === id ? { ...d, stage: newStage, updatedAt: new Date().toISOString() } : d
        ),
      }))

      const deal = get().getById(id)
      const title = deal?.title ?? ''
      const tr = getTranslations()
      const stageLabel = dealStageLabel(newStage)
      useAuditStore.getState().logAction(
        'deal_stage_changed', 'deal', id, title,
        tr.auditMessages.dealMovedTo.replace('{stage}', stageLabel),
      )

      const notify = useNotificationsStore.getState().notify
      const dn = tr.dealNotifications
      if (newStage === 'closed_won') {
        notify('deal_won', dn.wonTitle.replace('{title}', title), dn.wonMessage.replaceAll('{title}', title), { entityType: 'deal', entityId: id })
      } else if (newStage === 'closed_lost') {
        notify('deal_lost', dn.lostTitle.replace('{title}', title), dn.lostMessage.replaceAll('{title}', title), { entityType: 'deal', entityId: id })
      } else if (oldDeal && oldDeal.stage !== newStage) {
        notify(
          'deal_stage_changed',
          dn.stageTitle.replace('{title}', title),
          dn.stageMessage.replace('{from}', dealStageLabel(oldDeal.stage)).replace('{to}', stageLabel),
          { entityType: 'deal', entityId: id },
        )
      }

      if (deal) {
        const triggerType = newStage === 'closed_won'
          ? 'deal_closed_won'
          : newStage === 'closed_lost'
            ? 'deal_closed_lost'
            : 'deal_stage_changed'
        // Server-side execution (reliable even when browser closes)
        api.post('/automations/trigger', {
          triggerType,
          context: { dealId: deal.id, dealTitle: deal.title, fromStage: oldDeal?.stage, toStage: newStage },
        }).catch(() => {
          // Fallback to client-side execution if server is unreachable
          useAutomationsStore.getState().executeRulesForTrigger(triggerType, { deal, fromStage: oldDeal?.stage, toStage: newStage })
        })
      }

      api.patch(`/deals/${id}`, { stage: newStage }).catch((e: unknown) => set({ error: getErrorMessage(e) }))
    },

    updateQuote: (dealId, items) => {
      set((state) => ({
        deals: state.deals.map((d) =>
          d.id === dealId ? { ...d, quoteItems: items, updatedAt: new Date().toISOString() } : d
        ),
      }))
      api.patch(`/deals/${dealId}`, { quoteItems: items }).catch((e: unknown) => set({ error: getErrorMessage(e) }))
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

    setViewMode: (mode) => {
      set({ viewMode: mode })
    },

    getById: (id) => {
      return get().deals.find((d) => d.id === id)
    },

    getFilteredDeals: () => {
      const { deals, filters } = get()
      return deals.filter((d) => {
        const q = filters.search.toLowerCase()
        if (q && !d.title.toLowerCase().includes(q)) return false
        if (filters.stage && d.stage !== filters.stage) return false
        if (filters.assignedTo && d.assignedTo !== filters.assignedTo) return false
        if (filters.priority && d.priority !== filters.priority) return false
        if (filters.valueMin && d.value < Number(filters.valueMin)) return false
        if (filters.valueMax && d.value > Number(filters.valueMax)) return false
        if (filters.dueDateFrom && d.expectedCloseDate < filters.dueDateFrom) return false
        if (filters.dueDateTo && d.expectedCloseDate > filters.dueDateTo) return false
        return true
      })
    },

    getDealsByStage: (stage) => {
      return get().getFilteredDeals().filter((d) => d.stage === stage)
    },

    getPipelineValue: () => {
      return get()
        .deals.filter((d) => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
        .reduce((sum, d) => sum + d.value, 0)
    },

    getWonThisMonth: () => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      return get()
        .deals.filter((d) => d.stage === 'closed_won' && d.updatedAt >= monthStart)
        .reduce((sum, d) => sum + d.value, 0)
    },
  })
)
