import { useMemo, useState } from 'react'
import { useTranslations } from '../i18n'
import {
  Target, DollarSign, Handshake, Activity, UserPlus,
  Plus, Trash2, Edit2, X, Check, TrendingUp,
} from 'lucide-react'
import { useGoalsStore } from '../store/goalsStore'
import { useDealsStore } from '../store/dealsStore'
import { useActivitiesStore } from '../store/activitiesStore'
import { useContactsStore } from '../store/contactsStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency } from '../utils/formatters'
import { toast } from '../store/toastStore'
import type { SalesGoal } from '../types'
import { PermissionGate } from '../components/auth/PermissionGate'
import { Select } from '../components/ui/Select'
import { PageHeader } from '../components/ui/PageHeader'

// GOAL_TYPE_CONFIG and PERIOD_LABELS are built inside the component using translations

interface GoalFormData {
  type: SalesGoal['type']
  target: number
  period: SalesGoal['period']
  startDate: string
  endDate: string
}

export function SalesGoals() {
  const t = useTranslations()

  const GOAL_TYPE_CONFIG: Record<SalesGoal['type'], { label: string; icon: React.ReactNode; color: string; bgColor: string; format: (v: number) => string }> = {
    revenue: {
      label: t.goals.revenue,
      icon: <DollarSign size={18} />,
      color: 'text-success',
      bgColor: 'bg-success/15',
      format: (v) => formatCurrency(v),
    },
    deals_closed: {
      label: t.goals.dealsClosed,
      icon: <Handshake size={18} />,
      color: 'text-accent-400',
      bgColor: 'bg-accent-500/15',
      format: (v) => String(v),
    },
    activities: {
      label: t.goals.activitiesCompleted,
      icon: <Activity size={18} />,
      color: 'text-warning',
      bgColor: 'bg-warning/15',
      format: (v) => String(v),
    },
    contacts_added: {
      label: t.goals.contactsAdded,
      icon: <UserPlus size={18} />,
      color: 'text-accent-400',
      bgColor: 'bg-accent-500/15',
      format: (v) => String(v),
    },
  }

  const PERIOD_LABELS: Record<string, string> = {
    monthly: t.goals.monthly,
    quarterly: t.goals.quarterly,
    yearly: t.goals.yearly,
  }

  const goals = useGoalsStore((s) => s.goals)
  const addGoal = useGoalsStore((s) => s.addGoal)
  const updateGoal = useGoalsStore((s) => s.updateGoal)
  const deleteGoal = useGoalsStore((s) => s.deleteGoal)
  const currentUser = useAuthStore((s) => s.currentUser)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<GoalFormData>({
    type: 'revenue',
    target: 0,
    period: 'monthly',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
  })

  // Compute real-time progress from stores
  const deals = useDealsStore((s) => s.deals)
  const activities = useActivitiesStore((s) => s.activities)
  const contacts = useContactsStore((s) => s.contacts)
  const orgUsers = useAuthStore((s) => s.users)

  const computeCurrentForGoal = (goal: SalesGoal): number => {
    const start = goal.startDate
    const end = goal.endDate
    const inRange = (ts: string) => ts >= start && ts <= end + 'T23:59:59'
    // Goals are per-user (goal.userId). Owner is tracked by display name across the
    // app, so resolve the id→name and scope to that owner; if it can't be resolved,
    // fall back to org-wide totals rather than showing nothing.
    const ownerName = orgUsers.find((u) => u.id === goal.userId)?.name
    const ownedBy = (who: string | null | undefined) => !ownerName || who === ownerName
    switch (goal.type) {
      case 'revenue':
        return deals
          .filter((d) => d.stage === 'closed_won' && inRange(d.updatedAt) && ownedBy(d.assignedTo))
          .reduce((sum, d) => sum + d.value, 0)
      case 'deals_closed':
        return deals
          .filter((d) => d.stage === 'closed_won' && inRange(d.updatedAt) && ownedBy(d.assignedTo))
          .length
      case 'activities':
        return activities
          .filter((a) => inRange(a.createdAt) && ownedBy(a.createdBy))
          .length
      case 'contacts_added':
        return contacts
          .filter((c) => inRange(c.createdAt) && ownedBy(c.assignedTo))
          .length
      default:
        return goal.current
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- goals dep is intentional to refresh the snapshot when goals change
  const nowMs = useMemo(() => Date.now(), [goals])

  const handleSubmit = async () => {
    if (form.target <= 0) {
      toast.error(`${t.goals.title} > 0`)
      return
    }
    if (form.endDate < form.startDate) {
      toast.error(`${t.common.to} >= ${t.common.from}`)
      return
    }
    if (editingId) {
      updateGoal(editingId, { ...form })
      toast.success(`${t.common.save} ✓`)
      setEditingId(null)
    } else {
      const result = await addGoal({ ...form, userId: currentUser?.id ?? '', current: 0 })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`${t.common.create} ✓`)
    }
    setShowForm(false)
    setForm({ type: 'revenue', target: 0, period: 'monthly', startDate: new Date().toISOString().slice(0, 10), endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10) })
  }

  const startEdit = (goal: SalesGoal) => {
    setForm({ type: goal.type, target: goal.target, period: goal.period, startDate: goal.startDate, endDate: goal.endDate })
    setEditingId(goal.id)
    setShowForm(true)
  }

  // Group goals by period
  const activeGoals = goals.filter((g) => {
    const now = new Date().toISOString().split('T')[0]
    return g.endDate >= now
  })

  // Overall progress
  const overallProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((sum, g) => {
        const current = computeCurrentForGoal(g)
        return sum + Math.min(current / g.target, 1) * 100
      }, 0) / activeGoals.length)
    : 0

  return (
    <div className="crm-page space-y-6">
      <PageHeader
        showTitle={false}
        title={t.goals.title}
        subtitle={t.goals.progress}
        actions={
          <PermissionGate permission="goals:create">
            <button
              type="button"
              onClick={() => { setShowForm(true); setEditingId(null); setForm({ type: 'revenue', target: 0, period: 'monthly', startDate: new Date().toISOString().slice(0, 10), endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10) }) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gradient text-fg text-sm font-semibold"
            >
              <Plus size={16} />
              {t.goals.title}
            </button>
          </PermissionGate>
        }
      />

      {/* Overall progress card */}
      <div className="glass rounded-2xl shadow-float border-fg/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-fg">{t.goals.progress}</p>
            <p className="text-xs text-fg-subtle mt-0.5">{activeGoals.length} {t.goals.title.toLowerCase()} · {t.common.active.toLowerCase()}</p>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className={overallProgress >= 75 ? 'text-success' : overallProgress >= 50 ? 'text-warning' : 'text-danger'} />
            <span className={`text-2xl font-bold ${overallProgress >= 75 ? 'text-success' : overallProgress >= 50 ? 'text-warning' : 'text-danger'}`}>
              {overallProgress}%
            </span>
          </div>
        </div>
        <div className="h-3 rounded-full bg-fg/6 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-slow ${overallProgress >= 75 ? 'bg-success' : overallProgress >= 50 ? 'bg-warning' : 'bg-danger'}`}
            style={{ width: `${Math.min(overallProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Goal form */}
      {showForm && (
        <div className="glass rounded-2xl border-fg/10 p-6 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-fg">{editingId ? t.common.edit : t.goals.title}</p>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-fg/8 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Select
                label={t.common.type}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as SalesGoal['type'] })}
                options={[
                  { value: 'revenue', label: t.goals.revenue },
                  { value: 'deals_closed', label: t.goals.dealsClosed },
                  { value: 'activities', label: t.goals.activitiesCompleted },
                  { value: 'contacts_added', label: t.goals.contactsAdded },
                ]}
                listMaxHeightClass="max-h-40"
              />
            </div>
            <div>
              <label className="block text-xs text-fg-subtle mb-1">{t.goals.title}</label>
              <input
                type="number"
                value={form.target || ''}
                onChange={(e) => setForm({ ...form, target: Number(e.target.value) })}
                placeholder={t.goals.targetValuePlaceholder}
                className="w-full bg-surface-2 border border-fg/10 rounded-xl px-3 py-2 text-sm text-fg outline-none focus:border-accent-500/40 placeholder:text-fg-subtle"
              />
            </div>
            <div>
              <Select
                label={t.reports.periodLabel}
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value as SalesGoal['period'] })}
                options={[
                  { value: 'monthly', label: t.goals.monthly },
                  { value: 'quarterly', label: t.goals.quarterly },
                  { value: 'yearly', label: t.goals.yearly },
                ]}
                listMaxHeightClass="max-h-40"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-fg-subtle mb-1">{t.common.from}</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full bg-surface-2 border border-fg/10 rounded-xl px-3 py-2 text-sm text-fg outline-none focus:border-accent-500/40"
                />
              </div>
              <div>
                <label className="block text-xs text-fg-subtle mb-1">{t.common.to}</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full bg-surface-2 border border-fg/10 rounded-xl px-3 py-2 text-sm text-fg outline-none focus:border-accent-500/40"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null) }}
              className="px-4 py-2 rounded-xl text-sm text-fg-muted hover:text-fg hover:bg-fg/6 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button type="button" onClick={handleSubmit} className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gradient text-fg text-sm font-semibold">
              <Check size={14} />
              {editingId ? t.common.save : t.common.create}
            </button>
          </div>
        </div>
      )}

      {/* Goals grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const cfg = GOAL_TYPE_CONFIG[goal.type]
          // Backend accepts goal types (calls_made/meetings_held/…) the UI doesn't
          // configure; skip rather than dereferencing an undefined cfg and crashing the grid.
          if (!cfg) return null
          const current = computeCurrentForGoal(goal)
          const pct = Math.min(Math.round((current / goal.target) * 100), 100)
          const isCompleted = current >= goal.target
          const now = new Date(nowMs).toISOString().split('T')[0]
          const isExpired = goal.endDate < now
          const totalDays = Math.max(1, (new Date(goal.endDate).getTime() - new Date(goal.startDate).getTime()) / 86400000)
          const daysElapsed = Math.max(0, (nowMs - new Date(goal.startDate).getTime()) / 86400000)
          const expectedPct = Math.min(Math.round((daysElapsed / totalDays) * 100), 100)
          const onTrack = pct >= expectedPct

          return (
            <div key={goal.id} className={`glass rounded-2xl border-fg/8 p-5 ${isCompleted ? 'border-success/20' : isExpired ? 'border-danger/20 opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${cfg.bgColor} flex items-center justify-center ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-fg">{cfg.label}</p>
                    <p className="text-[10px] text-fg-subtle">{PERIOD_LABELS[goal.period]} · {goal.startDate} → {goal.endDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <PermissionGate permission="goals:update">
                    <button type="button" onClick={() => startEdit(goal)} className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-fg/8 transition-colors">
                      <Edit2 size={13} />
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="goals:delete">
                    <button type="button" onClick={() => { deleteGoal(goal.id); toast.success(`${t.common.delete} ✓`) }} className="p-1.5 rounded-lg text-fg-subtle hover:text-danger hover:bg-danger/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </PermissionGate>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className={`text-2xl font-bold ${cfg.color}`}>{cfg.format(current)}</span>
                  <span className="text-sm text-fg-subtle ml-1">/ {cfg.format(goal.target)}</span>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${isCompleted ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-danger'}`}>{pct}%</span>
                </div>
              </div>

              <div className="h-2.5 rounded-full bg-fg/6 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-slow ${isCompleted ? 'bg-success' : pct >= 50 ? 'bg-accent-500' : 'bg-danger'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* On track indicator */}
              {!isExpired && !isCompleted && (
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-medium ${onTrack ? 'text-success' : 'text-warning'}`}>
                    {onTrack ? `✓ ${t.goals.onTrack}` : `⚠ ${t.goals.atRisk}`}
                  </span>
                  <span className="text-[10px] text-fg-subtle">{t.goals.progress}: {expectedPct}%</span>
                </div>
              )}
              {isCompleted && (
                <p className="text-[10px] font-semibold text-success">✓ {t.goals.onTrack}</p>
              )}
              {isExpired && !isCompleted && (
                <p className="text-[10px] font-semibold text-danger">{t.goals.behind}</p>
              )}
            </div>
          )
        })}
      </div>

      {goals.length === 0 && (
        <div className="glass rounded-2xl border-fg/8 p-12 text-center">
          <Target size={40} className="mx-auto text-fg-subtle mb-3" />
          <p className="text-fg-muted font-medium">{t.goals.title}</p>
          <p className="text-xs text-fg-subtle mt-1">{t.common.noResults}</p>
        </div>
      )}
    </div>
  )
}
