import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import type { Deal, DealStage } from '../../types'
import { useDateLocale } from '../../hooks/useDateLocale'
import { useTranslations } from '../../i18n'
import { formatCurrency } from '../../utils/formatters'

/** Stage → colour for the calendar chips (semantic tokens + Tailwind defaults). */
const STAGE_BG: Record<DealStage, string> = {
  lead: 'bg-info',
  qualified: 'bg-warning',
  proposal: 'bg-accent-500',
  negotiation: 'bg-orange-500',
  closed_won: 'bg-success',
  closed_lost: 'bg-danger',
}

/** Monday-based 6-week grid covering the given month. */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const startDow = (first.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - startDow)
  const days: Date[] = []
  const cursor = new Date(gridStart)
  for (let i = 0; i < 42; i++) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd')

export function DealCalendarView({
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
  const today = new Date()
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const days = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor])

  const byDay = useMemo(() => {
    const map = new Map<string, Deal[]>()
    for (const d of filtered) {
      if (!d.expectedCloseDate) continue
      const k = d.expectedCloseDate.slice(0, 10)
      const list = map.get(k)
      if (list) list.push(d)
      else map.set(k, [d])
    }
    return map
  }, [filtered])

  const weekdayLabels = useMemo(() => days.slice(0, 7).map((d) => format(d, 'EEE', { locale })), [days, locale])

  return (
    <div className="glass border border-fg/8 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-fg capitalize">{format(cursor, 'LLLL yyyy', { locale })}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t.common.previous}
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="p-1.5 rounded-lg text-fg-subtle hover:bg-fg/8 hover:text-fg"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="px-2 py-1 rounded-lg text-xs text-fg-muted hover:bg-fg/8"
          >
            {t.notifications.today}
          </button>
          <button
            type="button"
            aria-label={t.common.next}
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="p-1.5 rounded-lg text-fg-subtle hover:bg-fg/8 hover:text-fg"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdayLabels.map((w, i) => (
          <div key={i} className="text-center text-[11px] uppercase tracking-wide text-fg-subtle py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth()
          const isToday = dayKey(day) === dayKey(today)
          const dayDeals = byDay.get(dayKey(day)) ?? []
          return (
            <div
              key={dayKey(day)}
              className={`min-h-[92px] rounded-lg border p-1.5 ${inMonth ? 'border-fg/8 bg-surface-1' : 'border-transparent bg-fg/[0.02]'}`}
            >
              <div className={`text-[11px] mb-1 ${isToday ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-white font-semibold' : inMonth ? 'text-fg-muted' : 'text-fg-subtle'}`}>
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayDeals.slice(0, 3).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onDealClick(d)}
                    title={`${d.title} · ${getStageLabel(d.stage)} · ${formatCurrency(d.value, d.currency)}`}
                    className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] text-fg hover:bg-fg/8"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${STAGE_BG[d.stage]}`} aria-hidden />
                    <span className="truncate">{d.title}</span>
                  </button>
                ))}
                {dayDeals.length > 3 && (
                  <p className="px-1 text-[10px] text-fg-subtle">+{dayDeals.length - 3}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
