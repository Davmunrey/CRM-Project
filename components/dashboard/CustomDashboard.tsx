import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, X, GripVertical } from 'lucide-react'
import { useContactsStore } from '../../store/contactsStore'
import { useCompaniesStore } from '../../store/companiesStore'
import { useDealsStore } from '../../store/dealsStore'
import { useLeadsStore } from '../../store/leadsStore'
import { useDashboardStore, type WidgetType, type DashboardWidget } from '../../store/dashboardStore'
import { useTranslations } from '../../i18n'
import { formatCurrency } from '../../utils/formatters'
import type { DealStage } from '../../types'

const STAGE_ORDER: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
const OPEN_STAGES: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation']

interface CatalogEntry {
  type: WidgetType
  metric: string
  labelKey: keyof ReturnType<typeof useTranslations>['dashboardWidgets']
}

const CATALOG: CatalogEntry[] = [
  { type: 'number', metric: 'contacts', labelKey: 'contacts' },
  { type: 'number', metric: 'companies', labelKey: 'companies' },
  { type: 'number', metric: 'openDeals', labelKey: 'openDeals' },
  { type: 'number', metric: 'pipelineValue', labelKey: 'pipelineValue' },
  { type: 'number', metric: 'wonValue', labelKey: 'wonValue' },
  { type: 'number', metric: 'leads', labelKey: 'leads' },
  { type: 'bar', metric: 'dealsByStage', labelKey: 'dealsByStage' },
  { type: 'funnel', metric: 'pipelineFunnel', labelKey: 'pipelineFunnel' },
  { type: 'list', metric: 'topDeals', labelKey: 'topDeals' },
]

export function CustomDashboard() {
  const t = useTranslations()
  const tw = t.dashboardWidgets
  const contacts = useContactsStore((s) => s.contacts)
  const companies = useCompaniesStore((s) => s.companies)
  const deals = useDealsStore((s) => s.deals)
  const leads = useLeadsStore((s) => s.leads)
  const { widgets, loaded, load, addWidget, removeWidget, reorder } = useDashboardStore()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!loaded) void load()
  }, [loaded, load])

  const currency = deals[0]?.currency ?? 'USD'
  const openDeals = useMemo(() => deals.filter((d) => OPEN_STAGES.includes(d.stage)), [deals])

  const numberValue = (metric: string): string => {
    switch (metric) {
      case 'contacts':
        return String(contacts.length)
      case 'companies':
        return String(companies.length)
      case 'leads':
        return String(leads.length)
      case 'openDeals':
        return String(openDeals.length)
      case 'pipelineValue':
        return formatCurrency(openDeals.reduce((s, d) => s + (d.value || 0), 0), currency)
      case 'wonValue':
        return formatCurrency(deals.filter((d) => d.stage === 'closed_won').reduce((s, d) => s + (d.value || 0), 0), currency)
      default:
        return '—'
    }
  }

  const dealsByStage = useMemo(
    () =>
      STAGE_ORDER.map((stage) => ({
        name: t.deals.stageLabels[stage as keyof typeof t.deals.stageLabels],
        value: deals.filter((d) => d.stage === stage).length,
      })),
    [deals, t],
  )

  const topDeals = useMemo(() => deals.slice().sort((a, b) => b.value - a.value).slice(0, 5), [deals])
  const funnelMax = Math.max(1, ...dealsByStage.map((s) => s.value))

  const widgetTitle = (w: DashboardWidget): string => {
    const entry = CATALOG.find((c) => c.type === w.type && c.metric === w.metric)
    return entry ? tw[entry.labelKey] : w.metric
  }

  const renderBody = (w: DashboardWidget): ReactNode => {
    if (w.type === 'number') {
      return <p className="text-3xl font-bold text-fg tabular-nums">{numberValue(w.metric)}</p>
    }
    if (w.type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dealsByStage} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={40} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value" fill="var(--color-accent-500, #6366f1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )
    }
    if (w.type === 'funnel') {
      return (
        <div className="space-y-1.5">
          {dealsByStage.map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <span className="w-24 shrink-0 truncate text-xs text-fg-muted">{s.name}</span>
              <div className="h-4 flex-1 rounded bg-fg/[0.04]">
                <div className="h-4 rounded bg-accent-500/70" style={{ width: `${(s.value / funnelMax) * 100}%` }} />
              </div>
              <span className="w-6 text-right text-xs tabular-nums text-fg-muted">{s.value}</span>
            </div>
          ))}
        </div>
      )
    }
    // list — top deals by value
    return (
      <div className="space-y-1.5">
        {topDeals.length === 0 ? (
          <p className="text-xs text-fg-subtle">{t.common.noResults}</p>
        ) : (
          topDeals.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-fg-muted">{d.title}</span>
              <span className="shrink-0 font-medium text-fg tabular-nums">{formatCurrency(d.value, d.currency)}</span>
            </div>
          ))
        )}
      </div>
    )
  }

  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return
    reorder(r.source.index, r.destination.index)
  }

  return (
    <div className="space-y-4">
      <div className="relative flex justify-end">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-3 py-1.5 text-sm font-medium text-fg hover:bg-accent-500"
        >
          <Plus size={15} /> {tw.addWidget}
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="absolute right-0 top-9 z-20 w-56 rounded-xl border border-fg/10 bg-surface-2 py-1 shadow-lg">
              {CATALOG.map((c) => (
                <button
                  key={`${c.type}-${c.metric}`}
                  type="button"
                  onClick={() => {
                    addWidget(c.type, c.metric)
                    setMenuOpen(false)
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-fg hover:bg-fg/5"
                >
                  {tw[c.labelKey]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {widgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-fg/12 p-10 text-center text-sm text-fg-subtle">{tw.empty}</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="dashboard-widgets">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="grid gap-4 md:grid-cols-2">
                {widgets.map((w, i) => (
                  <Draggable key={w.id} draggableId={w.id} index={i}>
                    {(p) => (
                      <div
                        ref={p.innerRef}
                        {...p.draggableProps}
                        className="glass rounded-xl border border-fg/8 p-4"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <span {...p.dragHandleProps} className="cursor-grab text-fg-subtle hover:text-fg-muted" aria-label="drag">
                            <GripVertical size={14} />
                          </span>
                          <h3 className="flex-1 truncate text-sm font-semibold text-fg-muted">{widgetTitle(w)}</h3>
                          <button
                            type="button"
                            onClick={() => removeWidget(w.id)}
                            aria-label={tw.remove}
                            className="text-fg-subtle hover:text-danger"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        {renderBody(w)}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  )
}
