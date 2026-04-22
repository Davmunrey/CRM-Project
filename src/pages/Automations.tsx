import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Workflow, Plus, Trash2, ToggleLeft, ToggleRight, Zap, Bell,
  ArrowRight, CheckCircle2, Clock, ChevronDown, ChevronUp, X, Play, Library,
  ListOrdered,
} from 'lucide-react'
import { useAutomationsStore } from '../store/automationsStore'
import { PermissionGate } from '../components/auth/PermissionGate'
import { Select } from '../components/ui/Select'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { Toolbar } from '../components/ui/Toolbar'
import { StatCard } from '../components/ui/StatCard'
import { EmptyState } from '../components/ui/EmptyState'
import { toast } from '../store/toastStore'
import { formatRelativeDate } from '../utils/formatters'
import { getTranslations, useI18nStore, useTranslations } from '../i18n'
import { localizedAutomationRule } from '../i18n/localizeSeed'
import type { SeedAutomationId } from '../i18n/types'
import {
  AUTOMATION_SEED_STRUCTURAL_RULES,
  AUTOMATION_SEED_TEMPLATE_IDS,
  getAutomationTemplateRulePayload,
} from '../i18n/seed/automationSeedRulesEn'
import { WorkflowTemplateLibraryDialog } from '../components/workflows/WorkflowTemplateLibraryDialog'
import type {
  AutomationRule, AutomationTriggerType, AutomationActionType,
  AutomationTrigger, AutomationAction, DealStage, ActivityType,
} from '../types'

// ─── Label maps (built at render time so they pick up active language) ─────────

function getTriggerLabels(t: ReturnType<typeof useTranslations>): Record<AutomationTriggerType, string> {
  return {
    deal_stage_changed: `${t.deals.title} ${t.common.changeStatus.toLowerCase()}`,
    deal_created: `${t.deals.title} ${t.common.create.toLowerCase()}`,
    deal_closed_won: `${t.deals.title} ${t.deals.won.toLowerCase()}`,
    deal_closed_lost: `${t.deals.title} ${t.deals.lost.toLowerCase()}`,
    activity_completed: `${t.activities.title} ${t.activities.completed.toLowerCase()}`,
    contact_created: `${t.contacts.title} ${t.common.create.toLowerCase()}`,
    follow_up_overdue: `${t.followUps.title} ${t.activities.overdue.toLowerCase()}`,
  }
}

function getActionLabels(t: ReturnType<typeof useTranslations>): Record<AutomationActionType, string> {
  return {
    create_activity: `${t.common.create} ${t.activities.title.toLowerCase()}`,
    send_notification: `${t.settings.notifications}`,
    update_deal_stage: `${t.deals.stage}`,
    assign_to_user: `${t.common.assignedTo}`,
    add_tag: `${t.common.add} ${t.common.tags.toLowerCase()}`,
  }
}

const STAGE_OPTIONS: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
const ACTIVITY_TYPE_OPTIONS: ActivityType[] = ['call', 'email', 'meeting', 'task', 'note', 'linkedin']

// ─── Trigger badge color ──────────────────────────────────────────────────────

function triggerColor(type: AutomationTriggerType) {
  if (type === 'deal_closed_won') return 'bg-success/15 text-success border-success/20'
  if (type === 'deal_closed_lost') return 'bg-danger/15 text-danger border-danger/20'
  if (type.startsWith('deal')) return 'bg-accent-500/15 text-accent-400 border-accent-500/20'
  if (type.startsWith('activity')) return 'bg-accent-500/15 text-accent-400 border-accent-500/25'
  return 'bg-fg/8 text-fg-muted border-fg/10'
}

// ─── Blank rule template ──────────────────────────────────────────────────────

function blankRule(): Omit<AutomationRule, 'id' | 'executionCount' | 'createdAt' | 'updatedAt'> {
  return {
    name: '',
    description: '',
    isActive: true,
    trigger: { type: 'deal_stage_changed' },
    actions: [{ type: 'create_activity', activityType: 'task', activitySubject: '', activityDaysFromNow: 1 }],
  }
}

// ─── Action editor ────────────────────────────────────────────────────────────

function ActionEditor({
  action,
  actionLabels,
  t,
  onChange,
  onRemove,
}: {
  action: AutomationAction
  actionLabels: Record<AutomationActionType, string>
  t: ReturnType<typeof useTranslations>
  onChange: (a: AutomationAction) => void
  onRemove: () => void
}) {
  return (
    <div className="glass rounded-xl p-3 border border-fg/6 space-y-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <Select
            ariaLabel={t.automations.action}
            value={action.type}
            onChange={(e) => onChange({ type: e.target.value as AutomationActionType })}
            options={(Object.keys(actionLabels) as AutomationActionType[]).map((k) => ({ value: k, label: actionLabels[k] }))}
            listMaxHeightClass="max-h-48"
          />
        </div>
        <button type="button" onClick={onRemove} title={t.common.delete} aria-label={t.common.delete} className="p-1.5 text-fg-subtle hover:text-danger transition-colors">
          <X size={13} />
        </button>
      </div>

      {action.type === 'create_activity' && (
        <>
          <Select
            ariaLabel={t.common.type}
            value={action.activityType ?? 'task'}
            onChange={(e) => onChange({ ...action, activityType: e.target.value as ActivityType })}
            options={ACTIVITY_TYPE_OPTIONS.map((k) => ({ value: k, label: t.activities.typeLabels[k] }))}
            listMaxHeightClass="max-h-48"
          />
          <input
            type="text"
            placeholder={t.activities.subject}
            value={action.activitySubject ?? ''}
            onChange={(e) => onChange({ ...action, activitySubject: e.target.value })}
            className="w-full bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent-500/50"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={90}
              value={action.activityDaysFromNow ?? 1}
              onChange={(e) => onChange({ ...action, activityDaysFromNow: Number(e.target.value) })}
              aria-label={t.automations.trigger}
              title={t.automations.trigger}
              className="w-20 bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg focus:outline-none focus:border-accent-500/50"
            />
            <span className="text-xs text-fg-subtle">{t.automations.trigger.toLowerCase()}</span>
          </div>
        </>
      )}

      {action.type === 'send_notification' && (
        <>
          <input
            type="text"
            placeholder={t.settings.notifications}
            value={action.notificationTitle ?? ''}
            onChange={(e) => onChange({ ...action, notificationTitle: e.target.value })}
            className="w-full bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent-500/50"
          />
          <textarea
            placeholder={t.common.notes}
            value={action.notificationMessage ?? ''}
            onChange={(e) => onChange({ ...action, notificationMessage: e.target.value })}
            rows={2}
            className="w-full bg-surface-2 border border-fg/10 rounded-lg px-3 py-1.5 text-xs text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent-500/50 resize-none"
          />
        </>
      )}

      {action.type === 'update_deal_stage' && (
        <Select
          ariaLabel={t.deals.stage}
          value={action.newStage ?? 'qualified'}
          onChange={(e) => onChange({ ...action, newStage: e.target.value as DealStage })}
          options={STAGE_OPTIONS.map((s) => ({
            value: s,
            label: t.deals.stageLabels[s as keyof typeof t.deals.stageLabels] ?? s,
          }))}
          listMaxHeightClass="max-h-48"
        />
      )}
    </div>
  )
}

// ─── Rule form modal ──────────────────────────────────────────────────────────

function RuleModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Omit<AutomationRule, 'id' | 'executionCount' | 'createdAt' | 'updatedAt'>
  onSave: (rule: typeof initial) => void
  onClose: () => void
}) {
  const t = useTranslations()
  const triggerLabels = getTriggerLabels(t)
  const actionLabels = getActionLabels(t)
  const [form, setForm] = useState(initial)

  const setTrigger = (tr: AutomationTrigger) => setForm((f) => ({ ...f, trigger: tr }))
  const setActions = (actions: AutomationAction[]) => setForm((f) => ({ ...f, actions }))

  const updateAction = (i: number, a: AutomationAction) =>
    setActions(form.actions.map((ac, idx) => (idx === i ? a : ac)))
  const removeAction = (i: number) => setActions(form.actions.filter((_, idx) => idx !== i))
  const addAction = () => setActions([...form.actions, { type: 'create_activity', activityType: 'task', activitySubject: '', activityDaysFromNow: 1 }])

  const handleSave = () => {
    if (!form.name.trim()) { toast.error(t.common.name); return }
    if (form.actions.length === 0) { toast.error(`${t.common.add} ${t.automations.action.toLowerCase()}`); return }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg border border-fg/10 rounded-2xl shadow-float overflow-hidden flex flex-col max-h-[90vh] bg-surface-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-fg/6">
          <h2 className="text-sm font-semibold text-fg">
            {initial.name ? t.common.edit : t.automations.newRule}
          </h2>
          <button type="button" onClick={onClose} title={t.common.close} aria-label={t.common.close} className="p-1.5 text-fg-subtle hover:text-fg transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* Name & description */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder={`${t.common.name} *`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full bg-surface-2 border border-fg/10 rounded-xl px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent-500/50"
            />
            <input
              type="text"
              placeholder={t.common.description}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full bg-surface-2 border border-fg/10 rounded-xl px-3 py-2 text-xs text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent-500/50"
            />
          </div>

          {/* Trigger */}
          <div>
            <p className="text-xs font-semibold text-fg-muted mb-2 uppercase tracking-wide">{t.automations.trigger}</p>
            <div className="glass rounded-xl p-3 border border-fg/6 space-y-2">
              <Select
                ariaLabel={t.automations.trigger}
                value={form.trigger.type}
                onChange={(e) => setTrigger({ type: e.target.value as AutomationTriggerType })}
                options={(Object.keys(triggerLabels) as AutomationTriggerType[]).map((k) => ({
                  value: k,
                  label: triggerLabels[k],
                }))}
                listMaxHeightClass="max-h-56"
              />

              {form.trigger.type === 'deal_stage_changed' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-fg-subtle mb-1">{t.common.from}</p>
                    <Select
                      ariaLabel={t.common.from}
                      label={t.common.from}
                      value={form.trigger.fromStage ?? ''}
                      onChange={(e) => setTrigger({ ...form.trigger, fromStage: (e.target.value as DealStage) || undefined })}
                      options={[
                        { value: '', label: t.common.all },
                        ...STAGE_OPTIONS.map((s) => ({
                          value: s,
                          label: t.deals.stageLabels[s as keyof typeof t.deals.stageLabels] ?? s,
                        })),
                      ]}
                      listMaxHeightClass="max-h-48"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-fg-subtle mb-1">{t.common.to}</p>
                    <Select
                      ariaLabel={t.common.to}
                      label={t.common.to}
                      value={form.trigger.toStage ?? ''}
                      onChange={(e) => setTrigger({ ...form.trigger, toStage: (e.target.value as DealStage) || undefined })}
                      options={[
                        { value: '', label: t.common.all },
                        ...STAGE_OPTIONS.map((s) => ({
                          value: s,
                          label: t.deals.stageLabels[s as keyof typeof t.deals.stageLabels] ?? s,
                        })),
                      ]}
                      listMaxHeightClass="max-h-48"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div>
            <p className="text-xs font-semibold text-fg-muted mb-2 uppercase tracking-wide">{t.automations.action}</p>
            <div className="space-y-2">
              {form.actions.map((action, i) => (
                <ActionEditor
                  key={i}
                  action={action}
                  actionLabels={actionLabels}
                  t={t}
                  onChange={(a) => updateAction(i, a)}
                  onRemove={() => removeAction(i)}
                />
              ))}
              <button type="button"
                onClick={addAction}
                className="w-full py-2 rounded-xl border border-dashed border-fg/10 text-xs text-fg-subtle hover:text-fg-muted hover:border-fg/20 transition-colors"
              >
                + {t.common.add} {t.automations.action.toLowerCase()}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-fg/6">
          <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="button" variant="primary" size="sm" className="flex-1" onClick={handleSave}>
            {t.common.save}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Starter template library ────────────────────────────────────────────────

type AutomationRulePayload = Omit<AutomationRule, 'id' | 'executionCount' | 'createdAt' | 'updatedAt'>

function AutomationStarterLibrary({ onUseTemplate }: { onUseTemplate: (payload: AutomationRulePayload) => void }) {
  const t = useTranslations()
  const triggerLabels = getTriggerLabels(t)
  return (
    <div className="glass rounded-xl border border-fg/6 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="p-2 rounded-lg bg-accent-500/15 flex-shrink-0">
          <Library size={16} className="text-accent-400" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{t.automations.libraryTitle}</p>
          <p className="text-xs text-fg-subtle mt-0.5">{t.automations.librarySubtitle}</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {(AUTOMATION_SEED_TEMPLATE_IDS as readonly SeedAutomationId[]).map((templateId) => {
          const copy = t.workflowLibrary.automations[templateId]
          const structural = AUTOMATION_SEED_STRUCTURAL_RULES.find((r) => r.id === templateId)
          if (!structural) return null
          return (
            <div key={templateId} className="rounded-lg border border-fg/8 bg-fg/[0.02] p-3 space-y-2 flex flex-col">
              <p className="text-xs font-semibold text-fg">{copy.name}</p>
              <p className="text-[10px] text-fg-subtle line-clamp-3 flex-1">{copy.description}</p>
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-fg-muted">
                <span className="px-1.5 py-0.5 rounded border border-fg/8">{triggerLabels[structural.trigger.type]}</span>
                {structural.trigger.toStage && (
                  <>
                    <ArrowRight size={10} className="text-fg-subtle flex-shrink-0" aria-hidden />
                    <span className="text-accent-400">
                      {t.deals.stageLabels[structural.trigger.toStage as keyof typeof t.deals.stageLabels] ?? structural.trigger.toStage}
                    </span>
                  </>
                )}
              </div>
              <PermissionGate permission="automations:create">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full mt-auto"
                  onClick={() => onUseTemplate(getAutomationTemplateRulePayload(templateId))}
                >
                  {t.automations.useTemplate}
                </Button>
              </PermissionGate>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Rule card ────────────────────────────────────────────────────────────────

function RuleCard({ rule }: { rule: AutomationRule }) {
  const t = useTranslations()
  const language = useI18nStore((s) => s.language)
  const displayRule = useMemo(() => localizedAutomationRule(rule, getTranslations()), [rule, language])
  const triggerLabels = getTriggerLabels(t)
  const actionLabels = getActionLabels(t)
  const { toggleRule, deleteRule, updateRule } = useAutomationsStore()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)

  const handleSave = (data: Omit<AutomationRule, 'id' | 'executionCount' | 'createdAt' | 'updatedAt'>) => {
    updateRule(rule.id, data)
    setEditing(false)
    toast.success(t.automations.toastRuleUpdated)
  }

  return (
    <>
      {editing && (
        <RuleModal
          initial={{
            name: displayRule.name,
            description: displayRule.description,
            isActive: rule.isActive,
            trigger: rule.trigger,
            actions: displayRule.actions,
          }}
          onSave={handleSave}
          onClose={() => setEditing(false)}
        />
      )}

      <div className={`glass rounded-xl border transition-colors ${rule.isActive ? 'border-fg/6' : 'border-fg/3 opacity-60'}`}>
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`p-2 rounded-lg flex-shrink-0 ${rule.isActive ? 'bg-accent-500/15' : 'bg-fg/4'}`}>
              <Workflow size={14} className={rule.isActive ? 'text-accent-400' : 'text-fg-subtle'} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-fg">{displayRule.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${triggerColor(rule.trigger.type)}`}>
                  {triggerLabels[rule.trigger.type]}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface-2 border border-fg/8 text-fg-muted">
                  {rule.actions.length} {t.automations.action.toLowerCase()}
                </span>
              </div>
              {displayRule.description && (
                <p className="text-xs text-fg-subtle mt-0.5 truncate">{displayRule.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                {rule.executionCount > 0 ? (
                  <span className="text-[10px] text-fg-subtle flex items-center gap-1">
                    <CheckCircle2 size={10} className="text-success" />
                    {t.automations.executionCount}: {rule.executionCount}
                  </span>
                ) : (
                  <span className="text-[10px] text-fg-subtle">{t.automations.executionCount}: 0</span>
                )}
                <span className="text-[10px] text-fg-subtle flex items-center gap-1">
                  <Clock size={10} />
                  {rule.lastExecutedAt ? formatRelativeDate(rule.lastExecutedAt) : t.common.notAvailable}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <button type="button"
                onClick={() => setExpanded((v) => !v)}
                  title={expanded ? t.common.close : t.common.view}
                  aria-label={expanded ? t.common.close : t.common.view}
                className="p-1.5 text-fg-subtle hover:text-fg transition-colors"
              >
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              <PermissionGate permission="automations:update">
                <button type="button"
                  onClick={() => setEditing(true)}
                  className="p-1.5 text-fg-subtle hover:text-fg transition-colors text-xs"
                >
                  {t.common.edit}
                </button>
              </PermissionGate>
              <PermissionGate permission="automations:update">
                <button type="button"
                  onClick={() => toggleRule(rule.id)}
                  className="flex-shrink-0"
                  title={rule.isActive ? t.common.disabled : t.common.enabled}
                >
                  {rule.isActive
                    ? <ToggleRight size={20} className="text-accent-400" />
                    : <ToggleLeft size={20} className="text-fg-subtle" />
                  }
                </button>
              </PermissionGate>
              <PermissionGate permission="automations:delete">
                <button type="button"
                  onClick={() => { deleteRule(rule.id); toast.success(t.automations.toastRuleDeleted) }}
                  title={t.common.delete}
                  aria-label={t.common.delete}
                  className="p-1.5 text-fg-subtle hover:text-danger transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>

        {/* Expanded: trigger + actions detail */}
        {expanded && (
          <div className="px-4 pb-3 border-t border-fg/4 pt-3">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-fg/4 border border-fg/6">
                <Zap size={11} className="text-warning" />
                <span className="text-fg-muted">{triggerLabels[rule.trigger.type]}</span>
                {rule.trigger.toStage && (
                  <><ArrowRight size={10} className="text-fg-subtle" /><span className="text-accent-400">{t.deals.stageLabels[rule.trigger.toStage as keyof typeof t.deals.stageLabels] ?? rule.trigger.toStage}</span></>
                )}
              </div>
              <ArrowRight size={12} className="text-fg-subtle" />
              {displayRule.actions.map((a: AutomationAction, i: number) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-fg/4 border border-fg/6">
                  <Bell size={11} className="text-accent-400" />
                  <span className="text-fg-muted">{actionLabels[a.type]}</span>
                  {a.activitySubject && <span className="text-fg-subtle">: {a.activitySubject}</span>}
                  {a.notificationTitle && <span className="text-fg-subtle">: {a.notificationTitle}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Automations() {
  const t = useTranslations()
  const rules = useAutomationsStore((s) => s.rules)
  const recentExecutions = useAutomationsStore((s) => s.recentExecutions)
  const fetchRecentExecutions = useAutomationsStore((s) => s.fetchRecentExecutions)
  const fetchRules = useAutomationsStore((s) => s.fetchRules)
  const addRule = useAutomationsStore((s) => s.addRule)
  const [showNew, setShowNew] = useState(false)
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false)

  useEffect(() => {
    void fetchRules()
    void fetchRecentExecutions()
  }, [fetchRules, fetchRecentExecutions])

  const active = rules.filter((r) => r.isActive).length
  const inactive = rules.filter((r) => !r.isActive).length
  const totalExecutions = rules.reduce((s, r) => s + r.executionCount, 0)

  const handleSave = (data: AutomationRulePayload) => {
    addRule(data)
    setShowNew(false)
    toast.success(t.automations.toastRuleCreated)
  }

  const handleUseTemplate = (payload: AutomationRulePayload) => {
    addRule(payload)
    toast.success(t.automations.toastTemplateAdded)
  }

  return (
    <div className="crm-page space-y-5">
      {showNew && (
        <RuleModal initial={blankRule()} onSave={handleSave} onClose={() => setShowNew(false)} />
      )}
      {showTemplateLibrary && (
        <WorkflowTemplateLibraryDialog onClose={() => setShowTemplateLibrary(false)} />
      )}

      <PageHeader
        showTitle={false}
        title={t.automations.title}
        subtitle={`${active} ${t.sequences.active.toLowerCase()} · ${inactive} ${t.automations.statInactiveRules.toLowerCase()} · ${totalExecutions} ${t.automations.executionCount.toLowerCase()}`}
        actions={(
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              leftIcon={<Library size={14} />}
              onClick={() => setShowTemplateLibrary(true)}
            >
              {t.workflowTemplates.browseButton}
            </Button>
            <Link
              to="/sequences"
              className="inline-flex items-center gap-1.5 rounded-full border border-fg/10 bg-surface-2/90 px-3.5 py-1.5 text-sm text-fg hover:border-border-strong transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            >
              <ListOrdered size={14} className="text-accent-400 shrink-0" aria-hidden />
              {t.automations.crossLinkSequences}
            </Link>
          </div>
        )}
      />

      <Toolbar panel>
        <div className="flex items-center justify-end w-full gap-2">
          <PermissionGate permission="automations:create">
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowNew(true)}>
              {t.automations.newRule}
            </Button>
          </PermissionGate>
        </div>
      </Toolbar>

      {/* KPI strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title={`${t.common.total} ${t.automations.title}`}
          value={rules.length}
          icon={<Workflow size={18} />}
          accent="accent"
        />
        <StatCard title={t.sequences.active} value={active} icon={<Zap size={18} />} accent="warning" />
        <StatCard
          title={t.automations.executionCount}
          value={totalExecutions}
          icon={<Play size={18} />}
          accent="success"
        />
        <StatCard
          title={t.automations.statInactiveRules}
          value={inactive}
          icon={<ToggleLeft size={18} />}
          accent="info"
        />
      </div>

      <AutomationStarterLibrary onUseTemplate={handleUseTemplate} />

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="glass rounded-xl border border-fg/6">
          <EmptyState
            icon={<Workflow size={28} strokeWidth={1.75} />}
            title={t.automations.title}
            description={t.automations.emptyRulesDescription}
          />
          <PermissionGate permission="automations:create">
            <div className="flex justify-center pb-6 -mt-8">
              <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowNew(true)}>
                {t.automations.newRule}
              </Button>
            </div>
          </PermissionGate>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} />
          ))}
        </div>
      )}

      <div className="glass rounded-xl p-4 border border-fg/6">
        <p className="text-xs text-fg-subtle mb-3 uppercase tracking-wide">{t.automations.executionLogTitle}</p>
        {recentExecutions.length === 0 ? (
          <p className="text-xs text-fg-subtle">{t.common.noResults}</p>
        ) : (
          <div className="space-y-2">
            {recentExecutions.slice(0, 10).map((exec) => {
              const triggerLabels = getTriggerLabels(t)
              const triggerLine = triggerLabels[exec.triggerType] ?? exec.triggerType
              const ruleRow = rules.find((r) => r.id === exec.ruleId)
              const ruleLabel = ruleRow
                ? localizedAutomationRule(ruleRow, getTranslations()).name
                : `${t.automations.executionLogRuleId}: ${exec.ruleId}`
              return (
                <div key={exec.id} className="flex items-center justify-between gap-3 rounded-lg border border-fg/6 bg-fg/[0.02] px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs text-fg truncate">{triggerLine}</p>
                    <p className="text-[10px] text-fg-subtle truncate">
                      {ruleLabel} · {formatRelativeDate(exec.createdAt)}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    exec.status === 'success'
                      ? 'text-success border-success/30 bg-success/10'
                      : 'text-danger border-danger/30 bg-danger/10'
                  }`}>
                    {exec.status === 'success' ? t.automations.executionStatusOk : t.automations.executionStatusFailed}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
