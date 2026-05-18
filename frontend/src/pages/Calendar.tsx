import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  FileText,
  CheckCircle2,
  Clock,
  Diamond,
  Linkedin,
  X,
  Trash2,
  RefreshCw,
  Video,
} from 'lucide-react'
import { useActivitiesStore } from '../store/activitiesStore'
import { useDealsStore } from '../store/dealsStore'
import { useContactsStore } from '../store/contactsStore'
import { toast } from '../store/toastStore'
import { useTranslations, useI18nStore } from '../i18n'
import type { Activity, ActivityType, Deal, Contact } from '../types'
import { ActivityForm } from '../components/activities/ActivityForm'
import { SlideOver } from '../components/ui/Modal'
import {
  listCalendarEvents,
  syncCalendarEvents,
  type CalendarEvent as GCalEvent,
} from '../services/calendarService'
import { fetchGoogleIntegrationStatus } from '../services/googleIntegrationService'

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<ActivityType, { bg: string; text: string; dot: string }> = {
  call:     { bg: 'bg-info/15',    text: 'text-info',    dot: 'bg-info' },
  email:    { bg: 'bg-success/15', text: 'text-success', dot: 'bg-success' },
  meeting:  { bg: 'bg-accent-500/15',  text: 'text-accent-400',  dot: 'bg-accent-500' },
  note:     { bg: 'bg-warning/15',   text: 'text-warning',   dot: 'bg-warning' },
  task:     { bg: 'bg-danger/15',    text: 'text-danger',    dot: 'bg-danger' },
  linkedin: { bg: 'bg-info/15',     text: 'text-info',     dot: 'bg-info' },
}

// TYPE_LABELS and DAY_HEADERS are now derived from translations inside each component

const WEEK_HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 8-20

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  // Get day of week (0=Sun..6=Sat), convert to Mon-based (0=Mon..6=Sun)
  const startDow = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - startDow)

  const lastDay = new Date(year, month + 1, 0)
  const endDow = (lastDay.getDay() + 6) % 7
  const gridEnd = new Date(year, month + 1, lastDay.getDate() + (6 - endDow))

  const days: Date[] = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

function getWeekDays(referenceDate: Date): Date[] {
  const dow = (referenceDate.getDay() + 6) % 7
  const monday = new Date(referenceDate)
  monday.setDate(monday.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

function isSameMonth(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()
}

function formatMonthYear(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date)
}

function formatWeekRange(days: Date[], locale: string): string {
  if (days.length === 0) return ''
  const first = days[0]
  const last = days[days.length - 1]
  const formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const rangeFormatter = formatter as Intl.DateTimeFormat & {
    formatRange?: (startDate: Date, endDate: Date) => string
  }
  if (typeof rangeFormatter.formatRange === 'function') {
    return rangeFormatter.formatRange(first, last)
  }
  const f = formatter.format(first)
  const l = formatter.format(last)
  return `${f} - ${l}`
}

function getActivityDate(activity: Activity): Date | null {
  const raw = activity.dueDate || activity.createdAt
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

function formatTime(dateStr: string, locale: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  // Only show time if there's an explicit time component (not midnight UTC)
  const hours = d.getHours()
  const minutes = d.getMinutes()
  if (hours === 0 && minutes === 0) return ''
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d)
}

function getActivityHour(activity: Activity): number | null {
  const raw = activity.dueDate
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  const h = d.getHours()
  if (h === 0) return null
  return h
}

function formatCurrency(value: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TypeIcon({ type, className = '' }: { type: ActivityType; className?: string }) {
  const cls = `w-3.5 h-3.5 ${className}`
  switch (type) {
    case 'call':     return <Phone className={cls} />
    case 'email':    return <Mail className={cls} />
    case 'meeting':  return <CalendarIcon className={cls} />
    case 'note':     return <FileText className={cls} />
    case 'task':     return <CheckCircle2 className={cls} />
    case 'linkedin': return <Linkedin className={cls} />
  }
}

function StatusBadge({ status, statusLabels }: { status: Activity['status']; statusLabels: Record<string, string> }) {
  const map = {
    pending:   'bg-warning/15 text-warning',
    completed: 'bg-success/15 text-success',
    cancelled: 'bg-surface-2/15 text-fg-muted',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${map[status]}`}>
      {statusLabels[status]}
    </span>
  )
}

// ─── Day Detail Panel ─────────────────────────────────────────────────────────

interface DayPanelProps {
  date: Date
  activities: Activity[]
  deals: Deal[]
  contacts: Contact[]
  onClose: () => void
  onNewActivity: () => void
  typeLabels: Record<ActivityType, string>
  statusLabels: Record<string, string>
  locale: string
  t: ReturnType<typeof useTranslations>
}

function DayPanel({ date, activities, deals, contacts, onClose, onNewActivity, typeLabels, statusLabels, locale, t }: DayPanelProps) {
  const dayLabel = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(date)

  const dayDeals = deals.filter((d) => {
    if (!d.expectedCloseDate) return false
    return isSameDay(new Date(d.expectedCloseDate), date)
  })

  function getContactName(contactId?: string): string {
    if (!contactId) return ''
    const c = contacts.find((x) => x.id === contactId)
    return c ? `${c.firstName} ${c.lastName}` : ''
  }

  function handleComplete(id: string) {
    useActivitiesStore.getState().completeActivity(id)
    toast.success(t.activities.completed)
  }

  function handleDelete(id: string) {
    useActivitiesStore.getState().deleteActivity(id)
    toast.success(t.activities.cancelled)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-fg/6">
        <div>
          <h3 className="text-sm font-semibold text-fg capitalize">{dayLabel}</h3>
          <p className="text-xs text-fg-subtle mt-0.5">{activities.length} {t.nav.activities.toLowerCase()}</p>
        </div>
        <button type="button"
          onClick={onClose}
          aria-label={t.common.close}
          title={t.common.close}
          className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-fg/6 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Deal close dates */}
        {dayDeals.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wider">{t.nav.deals}</p>
            {dayDeals.map((deal) => (
              <div key={deal.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-500/10 border border-accent-500/20">
                <Diamond className="w-3 h-3 text-accent-400 shrink-0" />
                <span className="text-xs text-accent-300 font-medium truncate">{deal.title}</span>
                <span className="ml-auto text-[10px] text-accent-400 shrink-0">
                  {formatCurrency(deal.value, deal.currency, locale)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Activities */}
        {activities.length === 0 && dayDeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CalendarIcon className="w-8 h-8 text-fg-subtle mb-3" />
            <p className="text-sm text-fg-subtle">{t.calendar.noEvents}</p>
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wider">{t.nav.activities}</p>
            {activities.map((activity) => {
              const colors = TYPE_COLORS[activity.type]
              const timeStr = activity.dueDate ? formatTime(activity.dueDate, locale) : ''
              const contactName = getContactName(activity.contactId)

              return (
                <div
                  key={activity.id}
                  className="group glass rounded-xl p-3 space-y-2 hover:border-fg/10 transition-all"
                >
                  <div className="flex items-start gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0 ${colors.bg} ${colors.text}`}>
                      <TypeIcon type={activity.type} />
                      {typeLabels[activity.type]}
                    </span>
                    <StatusBadge status={activity.status} statusLabels={statusLabels} />
                    {timeStr && (
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-fg-subtle shrink-0">
                        <Clock className="w-3 h-3" />
                        {timeStr}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-fg leading-snug">{activity.subject}</p>

                  {contactName && (
                    <p className="text-xs text-fg-subtle">{contactName}</p>
                  )}

                  {/* Quick actions */}
                  <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {activity.status === 'pending' && (
                      <button type="button"
                        onClick={() => handleComplete(activity.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-success/15 text-success hover:bg-success/25 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {t.activities.completed}
                      </button>
                    )}
                    <button type="button"
                      onClick={() => handleDelete(activity.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-danger/15 text-danger hover:bg-danger/25 transition-colors ml-auto"
                    >
                      <Trash2 className="w-3 h-3" />
                      {t.common.delete}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-fg/6">
        <button type="button"
          onClick={onNewActivity}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-500/15 text-accent-400 border border-accent-500/20 hover:bg-accent-500/25 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {t.activities.newActivity}
        </button>
      </div>
    </div>
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────

interface MonthViewProps {
  currentDate: Date
  activities: Activity[]
  deals: Deal[]
  activeTypes: Set<ActivityType>
  selectedDay: Date | null
  onDayClick: (date: Date) => void
  typeLabels: Record<ActivityType, string>
  dayHeaders: string[]
  googleEventsByDay: Map<string, GCalEvent[]>
}

function MonthView({ currentDate, activities, deals, activeTypes, selectedDay, onDayClick, typeLabels, dayHeaders, googleEventsByDay }: MonthViewProps) {
  const today = new Date()
  const days = useMemo(
    () => getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  )

  const activitiesByDay = useMemo(() => {
    const map = new Map<string, Activity[]>()
    for (const a of activities) {
      if (!activeTypes.has(a.type)) continue
      const d = getActivityDate(a)
      if (!d) continue
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return map
  }, [activities, activeTypes])

  const dealsByDay = useMemo(() => {
    const map = new Map<string, Deal[]>()
    for (const deal of deals) {
      if (!deal.expectedCloseDate) continue
      const d = new Date(deal.expectedCloseDate)
      if (isNaN(d.getTime())) continue
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(deal)
    }
    return map
  }, [deals])

  function dayKey(date: Date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {dayHeaders.map((h) => (
          <div key={h} className="text-center text-xs text-fg-subtle uppercase tracking-wider py-2">
            {h}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 gap-1 content-start">
        {days.map((day) => {
          const key = dayKey(day)
          const dayActivities = activitiesByDay.get(key) ?? []
          const dayDeals = dealsByDay.get(key) ?? []
          const isToday = isSameDay(day, today)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
          const isWeekend = day.getDay() === 0 || day.getDay() === 6

          // Group activities by type for dot display
          const typeCounts = new Map<ActivityType, number>()
          for (const a of dayActivities) {
            typeCounts.set(a.type, (typeCounts.get(a.type) ?? 0) + 1)
          }

          return (
            <button type="button"
              key={key}
              onClick={() => onDayClick(day)}
              className={[
                'relative flex flex-col p-1.5 rounded-xl border text-left transition-all min-h-[80px]',
                'hover:border-fg/15 hover:bg-fg/4',
                isSelected
                  ? 'border-accent-500/50 bg-accent-500/8'
                  : isToday
                  ? 'border-accent-500/30 bg-accent-500/5'
                  : 'border-fg/6 glass',
                !isCurrentMonth ? 'opacity-35' : '',
                isWeekend && isCurrentMonth ? 'opacity-70' : '',
              ].join(' ')}
            >
              {/* Day number */}
              <span
                className={[
                  'text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full shrink-0',
                  isToday
                    ? 'bg-accent-500 text-fg text-xs font-bold'
                    : 'text-fg-muted',
                ].join(' ')}
              >
                {day.getDate()}
              </span>

              {/* Activity dots */}
              {typeCounts.size > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {Array.from(typeCounts.entries()).slice(0, 4).map(([type, count]) => (
                    <span
                      key={type}
                      className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium leading-none ${TYPE_COLORS[type].bg} ${TYPE_COLORS[type].text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_COLORS[type].dot}`} />
                      {count > 1 ? count : typeLabels[type].slice(0, 3)}
                    </span>
                  ))}
                  {dayActivities.length > 4 && (
                    <span className="text-[9px] text-fg-subtle px-0.5">+{dayActivities.length - 4}</span>
                  )}
                </div>
              )}

              {/* Deal diamonds */}
              {dayDeals.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {dayDeals.slice(0, 2).map((deal) => (
                    <span
                      key={deal.id}
                      className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium bg-accent-500/15 text-accent-400 leading-none max-w-full"
                    >
                      <Diamond className="w-2 h-2 shrink-0" />
                      <span className="truncate max-w-[40px]">{deal.title}</span>
                    </span>
                  ))}
                  {dayDeals.length > 2 && (
                    <span className="text-[9px] text-accent-500">+{dayDeals.length - 2}</span>
                  )}
                </div>
              )}

              {/* Google Calendar events */}
              {(() => {
                const gEvents = googleEventsByDay.get(key) ?? []
                if (gEvents.length === 0) return null
                return (
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {gEvents.slice(0, 2).map((e) => (
                      <span key={e.id} className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium bg-emerald-500/15 text-emerald-400 leading-none max-w-full">
                        {e.meetLink ? <Video className="w-2 h-2 shrink-0" /> : <CalendarIcon className="w-2 h-2 shrink-0" />}
                        <span className="truncate max-w-[40px]">{e.title}</span>
                      </span>
                    ))}
                    {gEvents.length > 2 && <span className="text-[9px] text-emerald-500">+{gEvents.length - 2}</span>}
                  </div>
                )
              })()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

interface WeekViewProps {
  currentDate: Date
  activities: Activity[]
  deals: Deal[]
  activeTypes: Set<ActivityType>
  onDayClick: (date: Date) => void
  locale: string
  hourLabel: string
  allDayLabel: string
  googleEventsByDay: Map<string, GCalEvent[]>
}

function WeekView({ currentDate, activities, deals, activeTypes, onDayClick, locale, hourLabel, allDayLabel, googleEventsByDay }: WeekViewProps) {
  const today = new Date()
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])

  // Activities per day per hour
  const grid = useMemo(() => {
    const map = new Map<string, Map<number | 'top', Activity[]>>()
    for (const a of activities) {
      if (!activeTypes.has(a.type)) continue
      const d = getActivityDate(a)
      if (!d) continue
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const hour = getActivityHour(a)
      const slot: number | 'top' = hour !== null && hour >= 8 && hour <= 20 ? hour : 'top'

      if (!map.has(dayKey)) map.set(dayKey, new Map())
      const dayMap = map.get(dayKey)!
      if (!dayMap.has(slot)) dayMap.set(slot, [])
      dayMap.get(slot)!.push(a)
    }
    return map
  }, [activities, activeTypes])

  const dealsByDay = useMemo(() => {
    const map = new Map<string, Deal[]>()
    for (const deal of deals) {
      if (!deal.expectedCloseDate) continue
      const d = new Date(deal.expectedCloseDate)
      if (isNaN(d.getTime())) continue
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(deal)
    }
    return map
  }, [deals])

  function dayKey(date: Date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header row */}
        <div className="grid grid-cols-8 border-b border-fg/6 pb-2 mb-1 shrink-0">
          <div className="text-xs text-fg-subtle text-right pr-3 pt-1">{hourLabel}</div>
        {weekDays.map((day) => {
          const isToday = isSameDay(day, today)
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          const dayName = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)
          return (
            <div
              key={dayKey(day)}
              className={`text-center px-1 ${isWeekend ? 'opacity-60' : ''}`}
            >
              <div className="text-[10px] text-fg-subtle uppercase">{dayName}</div>
              <div
                className={[
                  'w-7 h-7 flex items-center justify-center rounded-full mx-auto text-sm font-medium',
                  isToday ? 'bg-accent-500 text-fg font-bold' : 'text-fg-muted',
                ].join(' ')}
              >
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-y-auto">
        {/* All-day / no-time row */}
        <div className="grid grid-cols-8 border-b border-fg/4 min-h-[40px]">
          <div className="text-[10px] text-fg-subtle text-right pr-3 pt-1">{allDayLabel}</div>
          {weekDays.map((day) => {
            const key = dayKey(day)
            const topActivities = grid.get(key)?.get('top') ?? []
            const dayDeals = dealsByDay.get(key) ?? []
            return (
              <div
                key={key}
                className="border-l border-fg/4 px-1 py-1 space-y-0.5 cursor-pointer hover:bg-fg/2"
                onClick={() => onDayClick(day)}
              >
                {topActivities.slice(0, 2).map((a) => (
                  <div
                    key={a.id}
                    className={`flex items-center gap-1 px-1 py-0.5 rounded text-[9px] font-medium truncate ${TYPE_COLORS[a.type].bg} ${TYPE_COLORS[a.type].text}`}
                  >
                    <TypeIcon type={a.type} className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{a.subject}</span>
                  </div>
                ))}
                {dayDeals.slice(0, 1).map((deal) => (
                  <div key={deal.id} className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] bg-accent-500/15 text-accent-400 truncate">
                    <Diamond className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{deal.title}</span>
                  </div>
                ))}
                {(googleEventsByDay.get(key) ?? []).slice(0, 2).map((e) => (
                  <div key={e.id} className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] bg-emerald-500/15 text-emerald-400 truncate">
                    {e.meetLink ? <Video className="w-2.5 h-2.5 shrink-0" /> : <CalendarIcon className="w-2.5 h-2.5 shrink-0" />}
                    <span className="truncate">{e.title}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Hour rows */}
        {WEEK_HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-fg/4 min-h-[52px]">
            <div className="text-[10px] text-fg-subtle text-right pr-3 pt-1 shrink-0">
              {String(hour).padStart(2, '0')}:00
            </div>
            {weekDays.map((day) => {
              const key = dayKey(day)
              const hourActivities = grid.get(key)?.get(hour) ?? []
              const isToday = isSameDay(day, today)
              return (
                <div
                  key={key}
                  className={[
                    'border-l border-fg/4 px-1 py-1 space-y-0.5 cursor-pointer hover:bg-fg/2 transition-colors',
                    isToday ? 'bg-accent-500/3' : '',
                  ].join(' ')}
                  onClick={() => onDayClick(day)}
                >
                  {hourActivities.map((a) => (
                    <div
                      key={a.id}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium truncate ${TYPE_COLORS[a.type].bg} ${TYPE_COLORS[a.type].text}`}
                    >
                      <TypeIcon type={a.type} className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{a.subject}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Google Calendar event helpers ───────────────────────────────────────────

function gCalEventsByDay(events: GCalEvent[]): Map<string, GCalEvent[]> {
  const map = new Map<string, GCalEvent[]>()
  for (const e of events) {
    if (e.status === 'cancelled') continue
    const d = new Date(e.startAt)
    if (isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return map
}

// ─── Main Component ──────────────────────────────────────────────────────────

type ViewMode = 'month' | 'week'
const ALL_TYPES: ActivityType[] = ['call', 'email', 'meeting', 'note', 'task', 'linkedin']

export function Calendar() {
  const t = useTranslations()

  // Derive locale string from i18n language for Intl APIs
  const language = useI18nStore((s) => s.language)
  const localeByLanguage: Record<typeof language, string> = {
    en: 'en-US',
    es: 'es-ES',
    pt: 'pt-BR',
    fr: 'fr-FR',
    de: 'de-DE',
    it: 'it-IT',
  }
  const locale = localeByLanguage[language]
  const hourLabel = t.calendar.hour
  const allDayLabel = t.calendar.allDay

  // Dynamic labels from translations
  const typeLabels: Record<ActivityType, string> = t.activities.typeLabels
  const dayHeaders: string[] = t.dashboard.dayLabels

  // Manual Zustand subscriptions for persisted stores
  const [activities, setActivities] = useState<Activity[]>(
    () => useActivitiesStore.getState().activities
  )
  const [deals, setDeals] = useState<Deal[]>(
    () => useDealsStore.getState().deals
  )
  const [contacts, setContacts] = useState<Contact[]>(
    () => useContactsStore.getState().contacts
  )

  // Google Calendar state
  const [googleEvents, setGoogleEvents] = useState<GCalEvent[]>([])
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const unsubA = useActivitiesStore.subscribe((s) => setActivities(s.activities))
    const unsubD = useDealsStore.subscribe((s) => setDeals(s.deals))
    const unsubC = useContactsStore.subscribe((s) => setContacts(s.contacts))
    return () => { unsubA(); unsubD(); unsubC() }
  }, [])

  // Load Google Calendar status + cached events on mount
  useEffect(() => {
    void fetchGoogleIntegrationStatus().then((status) => {
      setCalendarConnected(status.calendarConnected)
      if (status.calendarConnected) {
        void listCalendarEvents().then(setGoogleEvents).catch(() => null)
      }
    }).catch(() => null)
  }, [])

  const handleGCalSync = useCallback(async () => {
    setSyncing(true)
    try {
      await syncCalendarEvents()
      const events = await listCalendarEvents()
      setGoogleEvents(events)
      toast.success('Google Calendar synced')
    } catch {
      toast.error('Sync failed — check Google Calendar connection')
    } finally {
      setSyncing(false)
    }
  }, [])

  const googleEventsByDay = useMemo(() => gCalEventsByDay(googleEvents), [googleEvents])

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [activeTypes, setActiveTypes] = useState<Set<ActivityType>>(new Set(ALL_TYPES))
  const [isActivityOpen, setIsActivityOpen] = useState(false)

  const today = new Date()

  // Navigation
  function goToToday() {
    setCurrentDate(new Date())
  }

  function goBack() {
    if (viewMode === 'month') {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
    } else {
      setCurrentDate((d) => {
        const next = new Date(d)
        next.setDate(d.getDate() - 7)
        return next
      })
    }
  }

  function goForward() {
    if (viewMode === 'month') {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
    } else {
      setCurrentDate((d) => {
        const next = new Date(d)
        next.setDate(d.getDate() + 7)
        return next
      })
    }
  }

  // Type filter toggle
  function toggleType(type: ActivityType) {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        if (next.size === 1) return next // keep at least one
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  // Day click handler
  function handleDayClick(date: Date) {
    setSelectedDay((prev) => (prev && isSameDay(prev, date) ? null : date))
  }

  // Activities for selected day
  const selectedDayActivities = useMemo(() => {
    if (!selectedDay) return []
    return activities.filter((a) => {
      if (!activeTypes.has(a.type)) return false
      const d = getActivityDate(a)
      return d ? isSameDay(d, selectedDay) : false
    })
  }, [activities, selectedDay, activeTypes])

  // Period label
  const periodLabel = useMemo(() => {
    if (viewMode === 'month') {
      const label = formatMonthYear(currentDate, locale)
      return label.charAt(0).toUpperCase() + label.slice(1)
    }
    return formatWeekRange(getWeekDays(currentDate), locale)
  }, [viewMode, currentDate, locale])

  const showPanel = selectedDay !== null

  return (
    <div className="crm-page-full flex flex-col gap-4 py-4 sm:py-5">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-xl font-semibold text-fg">{t.calendar.title}</h2>
      </div>

      {/* ── Toolbar ── */}
      <div className="glass rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 shrink-0">
        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-fg/5 border border-fg/6">
          <button type="button"
            onClick={() => setViewMode('month')}
            className={[
              'px-3 py-1 rounded-md text-xs font-medium transition-all',
              viewMode === 'month'
                ? 'bg-accent-500/25 text-accent-400 border border-accent-500/30'
                : 'text-fg-muted hover:text-fg',
            ].join(' ')}
          >
            {t.calendar.month}
          </button>
          <button type="button"
            onClick={() => setViewMode('week')}
            className={[
              'px-3 py-1 rounded-md text-xs font-medium transition-all',
              viewMode === 'week'
                ? 'bg-accent-500/25 text-accent-400 border border-accent-500/30'
                : 'text-fg-muted hover:text-fg',
            ].join(' ')}
          >
            {t.calendar.week}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button type="button"
            onClick={goBack}
            aria-label={`${t.common.previous} ${t.common.date}`}
            title={`${t.common.previous} ${t.common.date}`}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-fg/6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button"
            onClick={goToToday}
            className={[
              'px-3 py-1 rounded-lg text-xs font-medium transition-colors border',
              isSameDay(currentDate, today) && viewMode === 'month'
                ? 'border-accent-500/30 text-accent-400 bg-accent-500/10'
                : 'border-fg/8 text-fg-muted hover:text-fg hover:bg-fg/6',
            ].join(' ')}
          >
            {t.calendar.today}
          </button>
          <button type="button"
            onClick={goForward}
            aria-label={`${t.common.next} ${t.common.date}`}
            title={`${t.common.next} ${t.common.date}`}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-fg/6 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Period label */}
        <span className="text-sm font-semibold text-fg capitalize">{periodLabel}</span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Google Calendar sync */}
        {calendarConnected && (
          <button
            type="button"
            onClick={() => void handleGCalSync()}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Google Cal'}
          </button>
        )}

        {/* Type filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_TYPES.map((type) => {
            const active = activeTypes.has(type)
            const colors = TYPE_COLORS[type]
            return (
              <button type="button"
                key={type}
                onClick={() => toggleType(type)}
                className={[
                  'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border transition-all',
                  active
                    ? `${colors.bg} ${colors.text} border-current/20`
                    : 'bg-transparent text-fg-subtle border-fg/6 hover:text-fg-muted',
                ].join(' ')}
              >
                <span className={`w-2 h-2 rounded-full ${active ? colors.dot : 'bg-surface-2'}`} />
                {typeLabels[type]}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Calendar area */}
        <div className={[
          'flex flex-col flex-1 min-h-0 glass rounded-2xl p-4 transition-all',
          showPanel ? 'min-w-0' : '',
        ].join(' ')}>
          {viewMode === 'month' ? (
            <MonthView
              currentDate={currentDate}
              activities={activities}
              deals={deals}
              activeTypes={activeTypes}
              selectedDay={selectedDay}
              onDayClick={handleDayClick}
              typeLabels={typeLabels}
              dayHeaders={dayHeaders}
              googleEventsByDay={googleEventsByDay}
            />
          ) : (
            <WeekView
              currentDate={currentDate}
              activities={activities}
              deals={deals}
              activeTypes={activeTypes}
              onDayClick={handleDayClick}
              locale={locale}
              hourLabel={hourLabel}
              allDayLabel={allDayLabel}
              googleEventsByDay={googleEventsByDay}
            />
          )}
        </div>

        {/* Day detail panel */}
        {showPanel && selectedDay && (
          <div className="w-80 shrink-0 glass rounded-2xl flex flex-col min-h-0 overflow-hidden">
            <DayPanel
              date={selectedDay}
              activities={selectedDayActivities}
              deals={deals}
              contacts={contacts}
              onClose={() => setSelectedDay(null)}
              onNewActivity={() => setIsActivityOpen(true)}
              typeLabels={typeLabels}
              statusLabels={t.activities.statusLabels}
              locale={locale}
              t={t}
            />
          </div>
        )}
      </div>

      <SlideOver
        layer="calendar"
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        title={t.activities.newActivity}
      >
        <ActivityForm
          onSubmit={(data) => {
            useActivitiesStore.getState().addActivity(data)
            toast.success(t.activities.newActivity)
            setIsActivityOpen(false)
          }}
          onCancel={() => setIsActivityOpen(false)}
        />
      </SlideOver>
    </div>
  )
}
