import { useState, useEffect, useMemo, useRef, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Building2, KanbanSquare, Activity, LayoutDashboard, BarChart3, Settings, ArrowRight } from 'lucide-react'
import { useContactsStore } from '../../store/contactsStore'
import { useCompaniesStore } from '../../store/companiesStore'
import { useDealsStore } from '../../store/dealsStore'
import { useTranslations, useUiLanguage } from '../../i18n'
import { getIndustryLabel } from '../../lib/industries'
import { formatCurrency } from '../../utils/formatters'

interface CommandItem {
  id: string
  label: string
  sublabel?: string
  icon: React.ReactNode
  action: () => void
  category: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const t = useTranslations()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const uiLang = useUiLanguage()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const contacts = useContactsStore((s) => s.contacts)
  const companies = useCompaniesStore((s) => s.companies)
  const deals = useDealsStore((s) => s.deals)

  const go = (path: string) => { navigate(path); onClose() }

  const navLabel = t.navSections.main
  const staticItems: CommandItem[] = [
    { id: 'nav-dashboard', label: t.nav.dashboard, icon: <LayoutDashboard size={15} />, action: () => go('/'), category: navLabel },
    { id: 'nav-contacts', label: t.nav.contacts, icon: <Users size={15} />, action: () => go('/contacts'), category: navLabel },
    { id: 'nav-companies', label: t.nav.companies, icon: <Building2 size={15} />, action: () => go('/companies'), category: navLabel },
    { id: 'nav-deals', label: t.nav.deals, icon: <KanbanSquare size={15} />, action: () => go('/deals'), category: navLabel },
    { id: 'nav-activities', label: t.nav.activities, icon: <Activity size={15} />, action: () => go('/activities'), category: navLabel },
    { id: 'nav-reports', label: t.nav.reports, icon: <BarChart3 size={15} />, action: () => go('/reports'), category: navLabel },
    { id: 'nav-settings', label: t.nav.settings, icon: <Settings size={15} />, action: () => go('/settings'), category: navLabel },
  ]

  const dynamicItems: CommandItem[] = useMemo(() => {
    if (query.length < 2) return []
    const q = query.toLowerCase()
    const results: CommandItem[] = []

    contacts.filter((c) => `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(q)).slice(0, 4).forEach((c) => {
      results.push({
        id: `contact-${c.id}`,
        label: `${c.firstName} ${c.lastName}`,
        sublabel: c.email,
        icon: <Users size={15} />,
        action: () => go(`/contacts/${c.id}`),
        category: t.nav.contacts,
      })
    })

    companies.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 3).forEach((c) => {
      results.push({
        id: `company-${c.id}`,
        label: c.name,
        sublabel: getIndustryLabel(c.industry, uiLang),
        icon: <Building2 size={15} />,
        action: () => go(`/companies/${c.id}`),
        category: t.nav.companies,
      })
    })

    deals.filter((d) => d.title.toLowerCase().includes(q)).slice(0, 3).forEach((d) => {
      results.push({
        id: `deal-${d.id}`,
        label: d.title,
        sublabel: formatCurrency(d.value, d.currency),
        icon: <KanbanSquare size={15} />,
        action: () => go('/deals'),
        category: t.commandPalette.dealsCategory,
      })
    })

    return results
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `go` is defined inline and recreated each render; including it would cause unnecessary re-memos without benefit
  }, [query, contacts, companies, deals, t, uiLang])

  const filteredStatic = query.length < 2
    ? staticItems
    : staticItems.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))

  const allItems = useMemo(() => [...dynamicItems, ...filteredStatic], [dynamicItems, filteredStatic])

  useEffect(() => {
    setSelected(0)
  }, [query])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, allItems.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && allItems[selected]) { allItems[selected].action() }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, allItems, selected, onClose])

  useEffect(() => {
    if (!isOpen) return
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length < 2) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  if (!isOpen) return null

  // Group by category
  const groups: Record<string, CommandItem[]> = {}
  allItems.forEach((item) => {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
  })

  let itemIndex = 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" aria-modal="true" role="presentation">
      <div className="absolute inset-0 bg-surface-0/80 backdrop-blur-md" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg mx-4 glass rounded-2xl shadow-float border-fg/12 overflow-hidden animate-scale-in"
      >
        <h2 id={titleId} className="sr-only">
          {t.common.search}
        </h2>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-fg/8">
          <Search size={16} className="text-fg-subtle flex-shrink-0" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.common.searchPlaceholder}
            className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
            aria-label={t.common.searchPlaceholder}
          />
          <kbd className="px-1.5 py-0.5 rounded-md bg-fg/8 text-2xs font-medium text-fg-subtle flex-shrink-0" aria-hidden>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {allItems.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-fg-subtle">{t.common.noResults} &quot;{query}&quot;</p>
          )}

          {Object.entries(groups).map(([category, items]) => (
            <div key={category}>
              <p className="px-4 py-1.5 text-2xs font-semibold uppercase tracking-widest text-fg-subtle">{category}</p>
              {items.map((item) => {
                const idx = itemIndex++
                return (
                  <button type="button"
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelected(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      selected === idx ? 'bg-accent-600/15 text-fg' : 'text-fg-muted hover:text-fg hover:bg-fg/4'
                    }`}
                  >
                    <span className={`flex-shrink-0 ${selected === idx ? 'text-accent-400' : 'text-fg-subtle'}`}>
                      {item.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate">{item.label}</span>
                      {item.sublabel && (
                        <span className="text-xs text-fg-subtle block truncate">{item.sublabel}</span>
                      )}
                    </span>
                    {selected === idx && <ArrowRight size={14} className="flex-shrink-0 text-accent-400" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-fg/6 flex items-center gap-4 text-2xs text-fg-subtle">
          <span><kbd className="font-semibold">↑↓</kbd> {t.commandPalette.navigateHint}</span>
          <span><kbd className="font-semibold">↵</kbd> {t.commandPalette.openHint}</span>
          <span><kbd className="font-semibold">ESC</kbd> {t.commandPalette.closeHint}</span>
        </div>
      </div>
    </div>
  )
}
