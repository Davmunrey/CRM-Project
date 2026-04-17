import { useState } from 'react'
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

  const { goals, addGoal, updateGoal, deleteGoal } = useGoalsStore()
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

  const computeCurrentForGoal = (goal: SalesGoal): number => {
    const start = goal.startDate
    const end = goal.endDate
    switch (goal.type) {
      case 'revenue':
        return deals
          .filter((d) => d.stage === 'closed_won' && d.updatedAt >= start && d.updatedAt <= end + 'T23:59:59')
          .reduce((sum, d) => sum + d.value, 0)
      case 'deals_closed':
        return deals
          .filter((d) => d.stage === 'closed_won' && d.updatedAt >= start && d.updatedAt <= end + 'T23:59:59')
          .length
      case 'activities':
        return activities
          .filter((a) => a.createdAt >= start && a.createdAt <= end + 'T23:59:59')
          .length
      case 'contacts_added':
        return contacts
          .filter((c) => c.createdAt >= start && c.createdAt <= end + 'T23:59:59')
          .length
      default:
        return goal.current
    }
  }

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-fg flex items-center gap-2">
            <Target size={22} className="text-accent-400" />
            {t.goals.title}
          </h2>
          <p className="text-sm text-fg-subtle mt-1">{t.goals.progress}</p>
        </div>
        <PermissionGate permission="goals:create">
          <button
            type="button"
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ type: 'revenue', target: 0, period: 'monthly', startDate: new Date().toISOString().slice(0, 10), endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10) }) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gradient text-fg text-sm font-semibold"
          >
            <Plus size={15} />
            {t.goals.title}
          </button>
        </PermissionGate>
      </div>

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
            className={`h-full rounded-full transition-all duration-700 ${overallProgress >= 75 ? 'bg-success' : overallProgress >= 50 ? 'bg-warning' : 'bg-danger'}`}
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
              <label className="block text-xs text-fg-subtle mb-1">{t.common.type}</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as SalesGoal['type'] })}
                className="w-full bg-surface-2 border border-fg/10 rounded-xl px-3 py-2 text-sm text-fg outline-none focus:border-accent-500/40"
              >
                <option value="revenue">{t.goals.revenue}</option>
                <option value="deals_closed">{t.goals.dealsClosed}</option>
                <option value="activities">{t.goals.activitiesCompleted}</option>
                <option value="contacts_added">{t.goals.contactsAdded}</option>
              </select>
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
              <label className="block text-xs text-fg-subtle mb-1">{t.reports.periodLabel}</label>
              <select
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value as SalesGoal['period'] })}
                className="w-full bg-surface-2 border border-fg/10 rounded-xl px-3 py-2 text-sm text-fg outline-none focus:border-accent-500/40"
              >
                <option value="monthly">{t.goals.monthly}</option>
                <option value="quarterly">{t.goals.quarterly}</option>
                <option value="yearly">{t.goals.yearly}</option>
              </select>
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
          const current = computeCurrentForGoal(goal)
          const pct = Math.min(Math.round((current / goal.target) * 100), 100)
          const isCompleted = current >= goal.target
          const now = new Date().toISOString().split('T')[0]
          const isExpired = goal.endDate < now
          const totalDays = Math.max(1, (new Date(goal.endDate).getTime() - new Date(goal.startDate).getTime()) / 86400000)
          const daysElapsed = Math.max(0, (Date.now() - new Date(goal.startDate).getTime()) / 86400000)
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
                  className={`h-full rounded-full transition-all duration-700 ${isCompleted ? 'bg-success' : pct >= 50 ? 'bg-accent-500' : 'bg-danger'}`}
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
