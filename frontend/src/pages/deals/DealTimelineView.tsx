import { useMemo } from 'react'
import { format } from 'date-fns'
import type { Deal, DealStage } from '../../types'
import { useDateLocale } from '../../hooks/useDateLocale'
import { useTranslations } from '../../i18n'
import { formatCurrency } from '../../utils/formatters'

const STAGE_BG: Record<DealStage, string> = {
  lead: 'bg-info',
  qualified: 'bg-warning',
  proposal: 'bg-accent-500',
  negotiation: 'bg-orange-500',
  closed_won: 'bg-success',
  closed_lost: 'bg-danger',
}

/** Gantt-style timeline: each deal a bar from createdAt → expectedCloseDate. */
export function DealTimelineView({
  filtered,
  getStageLabel,
  onDealClick,
}: {
  filtered: Deal[]
  getStageLabel: (s: DealStage) => string
  onDealClick: (d: Deal) => void
}) {
  const t = useTranslations()
  const locale = useDateLocale()

  const items = useMemo(
    () =>
      filtered
        .filter((d) => d.expectedCloseDate && d.createdAt)
        .slice()
        .sort((a, b) => a.expectedCloseDate.localeCompare(b.expectedCloseDate)),
    [filtered],
  )

  const range = useMemo(() => {
    if (items.length === 0) return null
    let min = Infinity
    let max = -Infinity
    for (const d of items) {
      const s = new Date(d.createdAt).getTime()
      const e = new Date(d.expectedCloseDate).getTime()
      if (Number.isFinite(s) && s < min) min = s
      if (Number.isFinite(e) && e > max) max = e
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null
    return { min, max, span: max - min }
  }, [items])

  if (items.length === 0 || !range) {
    return (
      <div className="glass border border-fg/8 rounded-xl p-8 text-center text-sm text-fg-subtle">{t.common.noResults}</div>
    )
  }

  return (
    <div className="glass border border-fg/8 rounded-xl p-4 overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="mb-2 flex justify-between pl-44 text-[11px] text-fg-subtle">
          <span>{format(new Date(range.min), 'd MMM yyyy', { locale })}</span>
          <span>{format(new Date(range.max), 'd MMM yyyy', { locale })}</span>
        </div>
        <div className="space-y-1.5">
          {items.map((d) => {
            const s = new Date(d.createdAt).getTime()
            const e = new Date(d.expectedCloseDate).getTime()
            const left = ((s - range.min) / range.span) * 100
            const width = Math.max(((e - s) / range.span) * 100, 1.5)
            return (
              <div key={d.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onDealClick(d)}
                  className="w-40 shrink-0 truncate text-left text-xs text-fg hover:text-accent-400"
                  title={d.title}
                >
                  {d.title}
                </button>
                <div className="relative h-5 flex-1 rounded bg-fg/[0.04]">
                  <button
                    type="button"
                    onClick={() => onDealClick(d)}
                    title={`${getStageLabel(d.stage)} · ${formatCurrency(d.value, d.currency)} · ${format(new Date(d.expectedCloseDate), 'd MMM yyyy', { locale })}`}
                    className={`absolute top-0 h-5 rounded ${STAGE_BG[d.stage]} opacity-80 hover:opacity-100`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
