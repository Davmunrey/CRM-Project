import type { ReactNode } from 'react'

export interface TabItem {
  id: string
  label: ReactNode
  content?: ReactNode
}

interface TabsProps {
  tabs: TabItem[]
  activeId: string
  onChange: (id: string) => void
  className?: string
  /** Merged onto the tablist row (e.g. `w-full overflow-x-auto flex-nowrap` for horizontal scroll). */
  tabListClassName?: string
}

export function Tabs({ tabs, activeId, onChange, className = '', tabListClassName }: TabsProps) {
  return (
    <div className={className}>
      <div
        className={`flex gap-1 p-1 rounded-xl bg-surface-2/80 border border-border-subtle ${
          tabListClassName ?? 'w-fit flex-wrap'
        }`}
        role="tablist"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId
          return (
            <button type="button"
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={`
                shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus-ring
                ${active ? 'bg-accent-600/20 text-fg border border-accent-500/30' : 'text-fg-muted hover:text-fg hover:bg-fg/[0.04]'}
              `}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface TabPanelProps {
  id: string
  activeId: string
  children: ReactNode
}

export function TabPanel({ id, activeId, children }: TabPanelProps) {
  if (id !== activeId) return null
  return (
    <div role="tabpanel" className="mt-4">
      {children}
    </div>
  )
}
