import { create } from 'zustand'
import { api } from '../lib/api'

export type WidgetType = 'number' | 'bar' | 'funnel' | 'list'

/** A single dashboard widget. `metric` selects what it shows for its type. */
export interface DashboardWidget {
  id: string
  type: WidgetType
  metric: string
}

interface DashboardState {
  widgets: DashboardWidget[]
  loaded: boolean
  load: () => Promise<void>
  addWidget: (type: WidgetType, metric: string) => void
  removeWidget: (id: string) => void
  reorder: (from: number, to: number) => void
}

function persist(widgets: DashboardWidget[]) {
  void api.patch('/preferences/me/dashboard', { widgets }).catch(() => {})
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  widgets: [],
  loaded: false,

  load: async () => {
    try {
      const res = await api.get<{ dashboard?: { widgets?: DashboardWidget[] } }>('/preferences/me')
      const widgets = Array.isArray(res?.dashboard?.widgets) ? (res.dashboard!.widgets as DashboardWidget[]) : []
      set({ widgets, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  addWidget: (type, metric) => {
    const widget: DashboardWidget = { id: crypto.randomUUID(), type, metric }
    const widgets = [...get().widgets, widget]
    set({ widgets })
    persist(widgets)
  },

  removeWidget: (id) => {
    const widgets = get().widgets.filter((w) => w.id !== id)
    set({ widgets })
    persist(widgets)
  },

  reorder: (from, to) => {
    const widgets = get().widgets.slice()
    const [moved] = widgets.splice(from, 1)
    if (!moved) return
    widgets.splice(to, 0, moved)
    set({ widgets })
    persist(widgets)
  },
}))
