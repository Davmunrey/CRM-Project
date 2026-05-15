import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api'
import type { SmartView, CustomFieldEntityType, InboxSavedView, InboxAdvancedFilters } from '../types'

const LEGACY_NAMEKEY_BY_ID: Record<string, NonNullable<SmartView['nameKey']>> = {
  'sv-01': 'sv01', 'sv-02': 'sv02', 'sv-03': 'sv03', 'sv-04': 'sv04', 'sv-05': 'sv05',
}

const LEGACY_NAMEKEY_BY_NAME: Record<string, NonNullable<SmartView['nameKey']>> = {
  'prospectos activos': 'sv01', 'prospectos ativos': 'sv01', 'active prospects': 'sv01',
  'prospects actifs': 'sv01', 'aktive interessenten': 'sv01', 'prospetti attivi': 'sv01',
  'clientes activos': 'sv02', 'clientes ativos': 'sv02', 'active customers': 'sv02',
  'clients actifs': 'sv02', 'aktive kunden': 'sv02', 'clienti attivi': 'sv02',
  'deals en negociación': 'sv03', 'negócios em negociação': 'sv03', 'deals in negotiation': 'sv03',
  'deals en négociation': 'sv03', 'deals in verhandlung': 'sv03', 'deals in negoziazione': 'sv03',
  'deals alto valor (>20k)': 'sv04', 'negócios alto valor (>20k)': 'sv04', 'high-value deals (>20k)': 'sv04',
  'deals de grande valeur (>20k)': 'sv04', 'hochwertige deals (>20k)': 'sv04', 'deal di alto valore (>20k)': 'sv04',
  'empresas saas': 'sv05', 'saas companies': 'sv05', 'entreprises saas': 'sv05',
  'saas-unternehmen': 'sv05', 'aziende saas': 'sv05',
}

function normalizeViewName(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeSeedViewLocalization(views: SmartView[]): SmartView[] {
  return views.map((view) => {
    if (view.nameKey) return view
    const migratedKey = LEGACY_NAMEKEY_BY_ID[view.id]
      ?? LEGACY_NAMEKEY_BY_NAME[normalizeViewName(view.name)]
    if (!migratedKey) return view
    return { ...view, nameKey: migratedKey }
  })
}

function rowToView(r: Record<string, unknown>): SmartView {
  return {
    id: r.id as string,
    entityType: r.entityType as CustomFieldEntityType,
    name: r.name as string,
    nameKey: (r.nameKey as SmartView['nameKey']) ?? undefined,
    filters: (r.filters as SmartView['filters']) ?? [],
    sortField: (r.sortField as string) ?? undefined,
    sortDirection: (r.sortDirection as 'asc' | 'desc') ?? undefined,
    isPinned: Boolean(r.isPinned),
    icon: (r.icon as string) ?? undefined,
    color: (r.color as string) ?? undefined,
    createdBy: (r.createdBy as string) ?? '',
    createdAt: r.createdAt as string,
    updatedAt: r.updatedAt as string,
  }
}

function rowToInboxView(r: Record<string, unknown>): InboxSavedView {
  return {
    id: r.id as string,
    name: r.name as string,
    query: (r.query as string) ?? '',
    filters: (r.filters as InboxAdvancedFilters) ?? {},
    createdAt: r.createdAt as string,
    updatedAt: r.updatedAt as string,
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface ViewsStore {
  views: SmartView[]
  inboxViews: InboxSavedView[]
  activeViewId: Record<CustomFieldEntityType, string | null>

  loadViews: () => Promise<void>
  addView: (view: Omit<SmartView, 'id' | 'createdAt' | 'updatedAt'>) => SmartView
  updateView: (id: string, updates: Partial<SmartView>) => void
  deleteView: (id: string) => void
  togglePin: (id: string) => void
  setActiveView: (entityType: CustomFieldEntityType, viewId: string | null) => void

  getViewsForEntity: (entityType: CustomFieldEntityType) => SmartView[]
  getPinnedViews: (entityType: CustomFieldEntityType) => SmartView[]
  getActiveView: (entityType: CustomFieldEntityType) => SmartView | null
  addInboxView: (name: string, query: string, filters: InboxAdvancedFilters) => InboxSavedView
  updateInboxView: (id: string, updates: Partial<Pick<InboxSavedView, 'name' | 'query' | 'filters'>>) => void
  deleteInboxView: (id: string) => void
}

export const useViewsStore = create<ViewsStore>()(
  persist(
    (set, get) => ({
      views: [],
      inboxViews: [],
      activeViewId: { contact: null, company: null, deal: null },

      loadViews: async () => {
        try {
          const [viewsRes, inboxRes] = await Promise.all([
            api.get<{ data: Record<string, unknown>[] }>('/views'),
            api.get<{ data: Record<string, unknown>[] }>('/views/inbox'),
          ])
          set({
            views: normalizeSeedViewLocalization(viewsRes.data.map(rowToView)),
            inboxViews: inboxRes.data.map(rowToInboxView),
          })
        } catch {
          // keep persisted data on network failure
        }
      },

      addView: (viewData) => {
        const ts = new Date().toISOString()
        const view: SmartView = { ...viewData, id: crypto.randomUUID(), createdAt: ts, updatedAt: ts }
        set((s) => ({ views: [...s.views, view] }))
        api.post('/views', {
          entityType: viewData.entityType,
          name: viewData.name,
          nameKey: viewData.nameKey,
          filters: viewData.filters,
          sortField: viewData.sortField,
          sortDirection: viewData.sortDirection,
          isPinned: viewData.isPinned,
        }).then((row) => {
          const saved = rowToView(row as Record<string, unknown>)
          set((s) => ({ views: s.views.map((v) => (v.id === view.id ? saved : v)) }))
        }).catch(() => undefined)
        return view
      },

      updateView: (id, updates) => {
        set((s) => ({
          views: s.views.map((v) => v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v),
        }))
        api.patch(`/views/${id}`, updates).catch(() => undefined)
      },

      deleteView: (id) => {
        const view = get().views.find((v) => v.id === id)
        set((s) => {
          const newActive = { ...s.activeViewId }
          if (view && newActive[view.entityType] === id) newActive[view.entityType] = null
          return { views: s.views.filter((v) => v.id !== id), activeViewId: newActive }
        })
        api.delete(`/views/${id}`).catch(() => undefined)
      },

      togglePin: (id) => {
        const view = get().views.find((v) => v.id === id)
        if (!view) return
        const isPinned = !view.isPinned
        set((s) => ({
          views: s.views.map((v) => v.id === id ? { ...v, isPinned, updatedAt: new Date().toISOString() } : v),
        }))
        api.patch(`/views/${id}`, { isPinned }).catch(() => undefined)
      },

      setActiveView: (entityType, viewId) => {
        set((s) => ({ activeViewId: { ...s.activeViewId, [entityType]: viewId } }))
      },

      getViewsForEntity: (entityType) => get().views.filter((v) => v.entityType === entityType),
      getPinnedViews: (entityType) => get().views.filter((v) => v.entityType === entityType && v.isPinned),
      getActiveView: (entityType) => {
        const id = get().activeViewId[entityType]
        return id ? get().views.find((v) => v.id === id) ?? null : null
      },

      addInboxView: (name, query, filters) => {
        const ts = new Date().toISOString()
        const view: InboxSavedView = { id: crypto.randomUUID(), name: name.trim(), query, filters, createdAt: ts, updatedAt: ts }
        set((s) => ({ inboxViews: [...s.inboxViews, view] }))
        api.post('/views/inbox', { name: name.trim(), query, filters }).then((row) => {
          const saved = rowToInboxView(row as Record<string, unknown>)
          set((s) => ({ inboxViews: s.inboxViews.map((v) => (v.id === view.id ? saved : v)) }))
        }).catch(() => undefined)
        return view
      },

      updateInboxView: (id, updates) => {
        set((s) => ({
          inboxViews: s.inboxViews.map((v) => v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v),
        }))
        api.patch(`/views/inbox/${id}`, updates).catch(() => undefined)
      },

      deleteInboxView: (id) => {
        set((s) => ({ inboxViews: s.inboxViews.filter((v) => v.id !== id) }))
        api.delete(`/views/inbox/${id}`).catch(() => undefined)
      },
    }),
    {
      name: 'crm_views',
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (state.views.length > 0) {
          state.views = normalizeSeedViewLocalization(state.views)
        }
      },
    }
  )
)
