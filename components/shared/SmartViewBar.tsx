import { useState, useEffect } from 'react'
import { Bookmark, Plus, Pin, X, Flame, Users, Handshake, TrendingUp, Cloud, Trash2 } from 'lucide-react'
import { useViewsStore } from '../../store/viewsStore'
import type { CustomFieldEntityType, SmartViewFilter } from '../../types'
import { useTranslations } from '../../i18n'

// Icon map for view icons
const ICON_MAP: Record<string, React.ReactNode> = {
  flame: <Flame size={13} />,
  users: <Users size={13} />,
  handshake: <Handshake size={13} />,
  'trending-up': <TrendingUp size={13} />,
  cloud: <Cloud size={13} />,
  bookmark: <Bookmark size={13} />,
}

function isSeedSmartView(id: string): boolean {
  return /^sv-\d{2}$/.test(id)
}

const COLOR_MAP: Record<string, string> = {
  orange: 'bg-warning/20 text-warning border-warning/30',
  emerald: 'bg-success/20 text-success border-success/30',
  brand: 'bg-accent-500/20 text-accent-400 border-accent-500/30',
  purple: 'bg-accent-500/20 text-accent-400 border-accent-500/30',
  sky: 'bg-info/20 text-info border-info/30',
  blue: 'bg-info/20 text-info border-info/30',
}

interface SmartViewBarProps {
  entityType: CustomFieldEntityType
  onFiltersChange: (filters: SmartViewFilter[]) => void
}

export function SmartViewBar({ entityType, onFiltersChange }: SmartViewBarProps) {
  const t = useTranslations()
  // Manual subscriptions for persisted store - never use useStore selector here
  const [views, setViews] = useState(() => useViewsStore.getState().views)
  const [activeViewId, setActiveViewId] = useState(() => useViewsStore.getState().activeViewId)

  useEffect(() => {
    return useViewsStore.subscribe((s) => {
      setViews(s.views)
      setActiveViewId(s.activeViewId)
    })
  }, [])

  const [showDropdown, setShowDropdown] = useState(false)

  const entityViews = views.filter((v) => v.entityType === entityType)
  const pinnedViews = entityViews.filter((v) => v.isPinned)
  const unpinnedViews = entityViews.filter((v) => !v.isPinned)
  const currentActiveId = activeViewId[entityType]

  const getViewLabel = (view: { name: string; nameKey?: string }) => {
    if (view.nameKey && view.nameKey in t.views) {
      return t.views[view.nameKey as keyof typeof t.views]
    }
    return view.name
  }

  const handleSelectView = (viewId: string | null) => {
    useViewsStore.getState().setActiveView(entityType, viewId)
    if (viewId) {
      const view = views.find((v) => v.id === viewId)
      onFiltersChange(view?.filters ?? [])
    } else {
      onFiltersChange([])
    }
    setShowDropdown(false)
  }

  if (entityViews.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* "All" pill */}
      <button type="button"
        onClick={() => handleSelectView(null)}
        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
          !currentActiveId
            ? 'bg-fg/10 border-fg/20 text-fg'
            : 'bg-fg/4 border-fg/8 text-fg-subtle hover:text-fg-muted'
        }`}
      >
        {t.common.all}
      </button>

      {/* Pinned view pills */}
      {pinnedViews.map((view) => {
        const isActive = currentActiveId === view.id
        const colorClass = view.color ? (COLOR_MAP[view.color] ?? '') : ''
        return (
          <div key={view.id} className="flex items-center gap-0.5">
            <button type="button"
              onClick={() => handleSelectView(isActive ? null : view.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                isActive
                  ? colorClass || 'bg-accent-500/20 text-accent-400 border-accent-500/30'
                  : 'bg-fg/4 border-fg/8 text-fg-subtle hover:text-fg-muted'
              }`}
            >
              {view.icon && ICON_MAP[view.icon]}
              {getViewLabel(view)}
              {isActive && <X size={11} className="ml-0.5 opacity-60" />}
            </button>
            {!isSeedSmartView(view.id) && (
              <button
                type="button"
                className="p-1 rounded-lg border border-fg/8 bg-fg/4 text-fg-subtle hover:text-danger hover:border-danger/30 transition-colors"
                aria-label={t.common.delete}
                title={t.common.delete}
                onClick={() => useViewsStore.getState().deleteView(view.id)}
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        )
      })}

      {/* More views dropdown - shown only when there are unpinned views */}
      {unpinnedViews.length > 0 && (
        <div className="relative">
          <button type="button"
            onClick={() => setShowDropdown((v) => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-surface-2 border border-fg/8 text-fg-subtle hover:text-fg-muted transition-colors"
          >
            <Plus size={12} />
            {t.common.view}
          </button>
          {showDropdown && (
            <>
              {/* Click-away overlay */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              <div
                className="absolute top-full left-0 mt-1 w-56 rounded-xl border border-fg/10 shadow-2xl z-50 py-1 bg-surface-2"
              >
                {unpinnedViews.map((view) => (
                  <div
                    key={view.id}
                    className="w-full flex items-center gap-2 px-2 py-1"
                  >
                    <button type="button"
                      onClick={() => handleSelectView(view.id)}
                      className="flex-1 flex items-center gap-2 px-1 py-1 text-sm text-fg-muted hover:text-fg hover:bg-fg/5 rounded-md transition-colors"
                    >
                      {view.icon && ICON_MAP[view.icon]}
                      <span className="flex-1 text-left">{getViewLabel(view)}</span>
                    </button>
                    <button type="button"
                      onClick={() => useViewsStore.getState().togglePin(view.id)}
                      className="p-1 text-fg-subtle hover:text-accent-400 transition-colors"
                      title={t.common.add}
                      aria-label={t.common.add}
                    >
                      <Pin size={11} />
                    </button>
                    {!isSeedSmartView(view.id) && (
                      <button type="button"
                        onClick={() => useViewsStore.getState().deleteView(view.id)}
                        className="p-1 text-fg-subtle hover:text-danger transition-colors"
                        title={t.common.delete}
                        aria-label={t.common.delete}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
