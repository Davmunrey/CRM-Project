import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Activity as ActivityIcon, Filter, X, Clock, Calendar, LayoutList, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay,
  format, isToday,
} from 'date-fns'
import type { Locale } from 'date-fns'
import { useTranslations } from '../i18n'
import { useDateLocale } from '../hooks/useDateLocale'
import { useActivitiesStore } from '../store/activitiesStore'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/Button'
import { SearchBar } from '../components/shared/SearchBar'
import { SlideOver } from '../components/ui/Modal'
import { ActivityForm } from '../components/activities/ActivityForm'
import { ActivityItem } from '../components/activities/ActivityItem'
import { EmptyState } from '../components/shared/EmptyState'
import { Select } from '../components/ui/Select'
import { toast } from '../store/toastStore'
import type { Activity, ActivityType } from '../types'
import { PermissionGate } from '../components/auth/PermissionGate'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { Skeleton } from '../components/ui/Skeleton'
import { Toolbar } from '../components/ui/Toolbar'
import { hasPermission } from '../utils/permissions'
import { trackUxAction } from '../lib/uxMetrics'

type ViewMode = 'list' | 'calendar'

const activityColorMap: Record<ActivityType, string> = {
  call: 'bg-info/20 text-info',
  email: 'bg-accent-500/20 text-accent-300',
  meeting: 'bg-success/20 text-success',
  task: 'bg-warning/20 text-warning',
  note: 'bg-surface-2/20 text-fg-muted',
  linkedin: 'bg-info/25 text-info',
}

function CalendarView({
  activities,
  onDaySelect,
  dayHeaders,
  dateLocale,
  noActivitiesLabel,
}: {
  activities: Activity[]
  onDaySelect: (date: Date) => void
  dayHeaders: string[]
  dateLocale: Locale
  noActivitiesLabel: string
}) {
  const t = useTranslations()
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const days = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth)
    const monthEnd = endOfMonth(calendarMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const result: Date[] = []
    let current = gridStart
    while (current <= gridEnd) {
      result.push(current)
      current = addDays(current, 1)
    }
    return result
  }, [calendarMonth])

  const activitiesByDay = useMemo(() => {
    const map = new Map<string, Activity[]>()
    for (const activity of activities) {
      const dateStr = activity.dueDate || activity.createdAt.split('T')[0]
      if (!dateStr) continue
      const key = dateStr.split('T')[0]
      const list = map.get(key) || []
      list.push(activity)
      map.set(key, list)
    }
    return map
  }, [activities])

  const selectedDayActivities = useMemo(() => {
    if (!selectedDay) return []
    const key = format(selectedDay, 'yyyy-MM-dd')
    return activitiesByDay.get(key) || []
  }, [selectedDay, activitiesByDay])

  const handleDayClick = (day: Date) => {
    setSelectedDay(day)
    onDaySelect(day)
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
            title={`${t.common.previous} ${t.common.date}`}
            aria-label={`${t.common.previous} ${t.common.date}`}
            className="hover:bg-fg/6 rounded-lg p-1.5 text-fg-muted hover:text-fg transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <h3 className="text-sm font-semibold text-fg capitalize">
            {format(calendarMonth, 'MMMM yyyy', { locale: dateLocale })}
          </h3>
          <button
            type="button"
            onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
            title={`${t.common.next} ${t.common.date}`}
            aria-label={`${t.common.next} ${t.common.date}`}
            className="hover:bg-fg/6 rounded-lg p-1.5 text-fg-muted hover:text-fg transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayHeaders.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-fg-subtle py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayActivities = activitiesByDay.get(key) || []
            const sameMonth = isSameMonth(day, calendarMonth)
            const today = isToday(day)
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false

            return (
              <button
                type="button"
                key={key}
                onClick={() => handleDayClick(day)}
                className={`
                  min-h-[80px] border rounded-lg p-1 text-left transition-colors flex flex-col
                  ${today ? 'border-accent-500/50 bg-accent-500/5' : 'border-fg/4'}
                  ${isSelected ? 'ring-1 ring-accent-500/70 bg-accent-500/10' : ''}
                  ${!sameMonth ? 'opacity-30' : ''}
                  hover:bg-fg/4
                `}
              >
                <span className={`text-[11px] font-medium ${today ? 'text-accent-400' : 'text-fg-muted'}`}>
                  {format(day, 'd')}
                </span>
                <div className="flex flex-col gap-0.5 mt-0.5 overflow-hidden flex-1">
                  {dayActivities.slice(0, 3).map((act) => (
                    <span
                      key={act.id}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full truncate ${activityColorMap[act.type]}`}
                    >
                      {act.subject}
                    </span>
                  ))}
                  {dayActivities.length > 3 && (
                    <span className="text-[10px] text-fg-subtle px-1">
                      +{dayActivities.length - 3}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="glass rounded-2xl p-4">
          <h4 className="text-sm font-semibold text-fg mb-3 capitalize">
            {format(selectedDay, 'PPPP', { locale: dateLocale })}
          </h4>
          {selectedDayActivities.length === 0 ? (
            <p className="text-xs text-fg-subtle">{noActivitiesLabel}</p>
          ) : (
            <div className="space-y-1">
              {selectedDayActivities.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg ${activityColorMap[activity.type]}`}
                >
                  <span className="font-medium truncate">{activity.subject}</span>
                  <span className="text-[10px] opacity-70 ml-auto whitespace-nowrap">
                    {t.activities.typeLabels[activity.type]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function Activities() {
  const [searchParams, setSearchParams] = useSearchParams()
  const t = useTranslations()
  const dateLocale = useDateLocale()

  const activities = useActivitiesStore((s) => s.activities)
  const addActivity = useActivitiesStore((s) => s.addActivity)
  const updateActivity = useActivitiesStore((s) => s.updateActivity)
  const deleteActivity = useActivitiesStore((s) => s.deleteActivity)
  const completeActivity = useActivitiesStore((s) => s.completeActivity)
  const isLoading = useActivitiesStore((s) => s.isLoading)
  const listError = useActivitiesStore((s) => s.error)
  const currentUser = useAuthStore((s) => s.currentUser)
  const canUpdateActivities = !!currentUser && hasPermission(currentUser.role, 'activities:update')
  const canDeleteActivities = !!currentUser && hasPermission(currentUser.role, 'activities:delete')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editActivity, setEditActivity] = useState<Activity | undefined>()
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const filtered = useMemo(() => {
    const dueSortValue = (a: Activity) => {
      if (a.status !== 'pending') return Number.MAX_SAFE_INTEGER
      if (!a.dueDate) return Number.MAX_SAFE_INTEGER - 1
      return new Date(a.dueDate).getTime()
    }

    return [...activities]
      .sort((a, b) => {
        const dueA = dueSortValue(a)
        const dueB = dueSortValue(b)
        if (dueA !== dueB) return dueA - dueB
        return b.createdAt.localeCompare(a.createdAt)
      })
      .filter((a) => {
        const q = search.toLowerCase()
        if (q && !a.subject.toLowerCase().includes(q) && !a.description.toLowerCase().includes(q)) return false
        if (typeFilter && a.type !== typeFilter) return false
        if (statusFilter && a.status !== statusFilter) return false
        return true
      })
  }, [activities, search, typeFilter, statusFilter])

  const overdue = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return activities.filter((a) => a.status === 'pending' && a.dueDate && a.dueDate < today)
  }, [activities])

  const pending = useMemo(() => activities.filter((a) => a.status === 'pending'), [activities])

  const hasFilters = typeFilter || statusFilter

  const handleCreate = (data: Omit<Activity, 'id' | 'createdAt'>) => {
    addActivity(data)
    setIsFormOpen(false)
    toast.success(t.activities.newActivity)
  }

  const handleEdit = (data: Omit<Activity, 'id' | 'createdAt'>) => {
    if (!editActivity) return
    updateActivity(editActivity.id, data)
    trackUxAction('activity_edit', { activityId: editActivity.id })
    setEditActivity(undefined)
    setIsFormOpen(false)
    toast.success(t.activities.editActivity)
  }

  const handleComplete = (id: string) => {
    completeActivity(id)
    trackUxAction('activity_complete', { activityId: id })
    toast.success(t.activities.completed)
  }

  const handleDelete = (id: string) => {
    deleteActivity(id)
    trackUxAction('activity_delete', { activityId: id })
    toast.success(t.common.delete)
  }

  const openEditActivity = (id: string) => {
    const target = activities.find((a) => a.id === id)
    if (!target) return
    setEditActivity(target)
    setIsFormOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('create') !== '1') return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: opens the form when ?create=1 query param is present, then removes the param
    setIsFormOpen(true)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('create')
      return next
    }, { replace: true })
  }, [searchParams, setSearchParams])

  const handleDaySelect = (_date: Date) => {
    // Could be extended to filter list view to this day
  }

  return (
    <div className="crm-page space-y-4">
      <PageHeader
        showTitle={false}
        title={t.nav.activities}
        actions={
          <PermissionGate permission="activities:create">
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsFormOpen(true)}>
              {t.activities.newActivity}
            </Button>
          </PermissionGate>
        }
      />
      {listError && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          {listError}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title={t.activities.title} value={activities.length} icon={<ActivityIcon size={18} />} accent="accent" />
        <StatCard title={t.activities.statusLabels.pending} value={pending.length} icon={<Clock size={18} />} accent="warning" />
        <StatCard title={t.activities.overdue} value={overdue.length} icon={<Calendar size={18} />} accent="danger" />
      </div>

      {/* Overdue section */}
      {overdue.length > 0 && (
        <div className="bg-danger/5 border border-danger/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-danger" />
            <h3 className="text-sm font-semibold text-danger">{t.activities.overdue} ({overdue.length})</h3>
          </div>
          <div className="space-y-2">
            {overdue.slice(0, 3).map((a) => (
              <ActivityItem
                key={a.id}
                activity={a}
                onComplete={canUpdateActivities ? handleComplete : undefined}
                onEdit={canUpdateActivities ? openEditActivity : undefined}
                onDelete={canDeleteActivities ? handleDelete : undefined}
                showActions={canUpdateActivities || canDeleteActivities}
              />
            ))}
          </div>
        </div>
      )}

      <Toolbar panel>
      <div className="flex items-center gap-3 flex-wrap w-full">
        <SearchBar value={search} onChange={setSearch} placeholder={t.common.searchPlaceholder} className="w-72" />
        <Button
          variant={showFilters ? 'secondary' : 'ghost'}
          size="sm"
          leftIcon={<Filter size={14} />}
          onClick={() => setShowFilters((v) => !v)}
        >
          {t.common.filters}
        </Button>

        {/* View mode toggle */}
        <div className="flex items-center gap-0.5 rounded-xl border border-fg/10 bg-fg/[0.05] p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-fg/10 text-fg'
                : 'text-fg-muted hover:text-fg hover:bg-fg/6'
            }`}
          >
            <LayoutList size={14} />
            {t.deals.list}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-fg/10 text-fg'
                : 'text-fg-muted hover:text-fg hover:bg-fg/6'
            }`}
          >
            <Calendar size={14} />
            {t.calendar.title}
          </button>
        </div>
      </div>
      </Toolbar>

      {/* Filters */}
      {showFilters && (
        <div className="flex gap-3 flex-wrap items-center glass p-4">
          <Select
            options={[
              { value: 'call', label: t.activities.typeLabels.call },
              { value: 'email', label: t.activities.typeLabels.email },
              { value: 'meeting', label: t.activities.typeLabels.meeting },
              { value: 'note', label: t.activities.typeLabels.note },
              { value: 'task', label: t.activities.typeLabels.task },
              { value: 'linkedin', label: t.activities.typeLabels.linkedin },
            ]}
            placeholder={t.common.type}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />
          <Select
            options={[
              { value: 'pending', label: t.activities.statusLabels.pending },
              { value: 'completed', label: t.activities.statusLabels.completed },
              { value: 'cancelled', label: t.activities.statusLabels.cancelled },
            ]}
            placeholder={t.common.status}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" leftIcon={<X size={14} />}
              onClick={() => { setTypeFilter(''); setStatusFilter('') }}>
              {t.common.clear}
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-fg-subtle">{filtered.length} {t.activities.title.toLowerCase()}</p>

      {/* Calendar view */}
      {viewMode === 'calendar' && (
        <CalendarView
          activities={filtered}
          onDaySelect={handleDaySelect}
          dayHeaders={t.dashboard.dayLabels}
          dateLocale={dateLocale}
          noActivitiesLabel={t.activities.emptyDescription}
        />
      )}

      {/* Activities list */}
      {viewMode === 'list' && (
        <>
          {isLoading ? (
            <div className="glass p-4 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="border-b border-border-subtle pb-4 last:border-0 last:pb-0">
                  <Skeleton className="h-4 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<ActivityIcon size={28} />}
              title={t.activities.emptyTitle}
              description={t.activities.emptyDescription}
              action={canUpdateActivities ? { label: t.activities.newActivity, onClick: () => setIsFormOpen(true) } : undefined}
            />
          ) : (
            <div className="glass p-4 space-y-1">
              {filtered.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  onComplete={canUpdateActivities ? handleComplete : undefined}
                  onEdit={canUpdateActivities ? openEditActivity : undefined}
                  onDelete={canDeleteActivities ? handleDelete : undefined}
                  showActions={canUpdateActivities || canDeleteActivities}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create / edit form */}
      <SlideOver
        layer={viewMode === 'calendar' ? 'calendar' : 'modal'}
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditActivity(undefined) }}
        title={editActivity ? t.activities.editActivity : t.activities.newActivity}
      >
        <ActivityForm
          activity={editActivity}
          onSubmit={editActivity ? handleEdit : handleCreate}
          onCancel={() => { setIsFormOpen(false); setEditActivity(undefined) }}
        />
      </SlideOver>
    </div>
  )
}
