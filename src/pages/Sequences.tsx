import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Users, CheckCircle2,
  PauseCircle, XCircle, ListOrdered, Trash2, PlayCircle, ChevronRight,
  X, Workflow, Library, Info,
} from 'lucide-react'
import { useSequencesStore } from '../store/sequencesStore'
import { useContactsStore } from '../store/contactsStore'
import { useAuthStore } from '../store/authStore'
import { hasPermission } from '../utils/permissions'
import { SequenceFlowStudio } from '../features/sequences-flow'
import { SequencePersonalisePanel } from '../features/sequences-flow/SequencePersonalisePanel'
import { SequenceMetricsPanel } from '../features/sequences-flow/SequenceMetricsPanel'
import { resolveFlowDefinition } from '../features/sequences-flow/sequenceFlowConverters'
import { PermissionGate } from '../components/auth/PermissionGate'
import { toast } from '../store/toastStore'
import { getTranslations, useTranslations } from '../i18n'
import { localizedEmailSequence } from '../i18n/localizeSeed'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { Switch } from '../components/ui/Switch'
import { WorkflowTemplateLibraryDialog } from '../components/workflows/WorkflowTemplateLibraryDialog'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { formatDateShort } from '../utils/formatters'
import type { EmailSequence, SequenceEnrollment, EnrollmentStatus, SequenceFlowDefinition, SequenceStep } from '../types'

// ─── Constants ───────────────────────────────────────────────────────────────

function getEnrollmentStatusLabels(t: ReturnType<typeof useTranslations>): Record<EnrollmentStatus, string> {
  return {
    active: t.sequences.active,
    completed: t.activities.completed,
    paused: t.sequences.paused,
    replied: t.sequences.enrollmentStatusReplied,
    unsubscribed: t.common.inactive,
  }
}

const ENROLLMENT_STATUS_COLORS: Record<EnrollmentStatus, string> = {
  active: 'bg-success/20 text-success',
  completed: 'bg-info/20 text-info',
  paused: 'bg-warning/20 text-warning',
  replied: 'bg-accent-500/20 text-accent-400',
  unsubscribed: 'bg-surface-2/20 text-fg-muted',
}

// ─── Enroll Modal ────────────────────────────────────────────────────────────

interface EnrollModalProps {
  sequence: EmailSequence
  onClose: () => void
}

function EnrollModal({ sequence, onClose }: EnrollModalProps) {
  const t = useTranslations()
  const locSequence = useMemo(() => localizedEmailSequence(sequence, getTranslations()), [sequence])
  const [contacts, setContacts] = useState(useContactsStore.getState().contacts)
  const [selectedContactId, setSelectedContactId] = useState('')
  const { enrollContact } = useSequencesStore.getState()

  useEffect(() => {
    const unsub = useContactsStore.subscribe((s) => setContacts(s.contacts))
    return unsub
  }, [])

  function handleEnroll() {
    if (!selectedContactId) return
    if (!sequence.isActive) {
      toast.error(t.sequences.enrollBlockedInactive)
      return
    }
    const contact = contacts.find((c) => c.id === selectedContactId)
    if (!contact) return
    const enrolled = enrollContact(sequence.id, contact.id, `${contact.firstName} ${contact.lastName}`)
    if (!enrolled) {
      toast.error(t.sequences.enrollBlockedInactive)
      return
    }
    const name = `${contact.firstName} ${contact.lastName}`.trim()
    toast.success(
      t.sequences.toastEnrolled.replace('{name}', name).replace('{sequence}', locSequence.name),
    )
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 glass rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-fg">{t.sequences.enrolled}</h2>
            <p className="text-xs text-fg-muted mt-0.5">{locSequence.name}</p>
          </div>
          <button type="button"
            onClick={onClose}
            title={t.common.close}
            aria-label={t.common.close}
            className="p-1.5 rounded-lg text-fg-subtle hover:text-fg-muted hover:bg-fg/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {!sequence.isActive ? (
            <p className="text-xs text-warning rounded-lg border border-warning/25 bg-warning/10 px-3 py-2">
              {t.sequences.enrollBlockedInactive}
            </p>
          ) : null}
          <div>
            <Select
              label={t.contacts.title}
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              options={[
                { value: '', label: `(${t.common.selectAll})` },
                ...contacts.map((c) => ({
                  value: c.id,
                  label: `${c.firstName} ${c.lastName}${c.email ? ` (${c.email})` : ''}`,
                })),
              ]}
              listMaxHeightClass="max-h-64"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="button"
              onClick={onClose}
              className="flex-1 bg-surface-2 border border-fg/10 text-fg-muted text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-fg/10 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button type="button"
              onClick={handleEnroll}
              disabled={!selectedContactId || !sequence.isActive}
              title={!sequence.isActive ? t.sequences.enrollBlockedInactive : undefined}
              className="flex-1 btn-gradient text-fg text-sm font-medium px-4 py-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.sequences.enrolled}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sequence Detail ─────────────────────────────────────────────────────────

interface SequenceDetailProps {
  sequence: EmailSequence
  enrollments: SequenceEnrollment[]
  onEnroll: () => void
}

function SequenceDetail({ sequence, enrollments, onEnroll }: SequenceDetailProps) {
  const t = useTranslations()
  const currentUser = useAuthStore((s) => s.currentUser)
  const viewSequence = useMemo(() => localizedEmailSequence(sequence, getTranslations()), [sequence])
  const canEditMeta = Boolean(currentUser && hasPermission(currentUser.role, 'sequences:update'))
  const canEditFlow = canEditMeta
  const enrollmentStatusLabels = getEnrollmentStatusLabels(t)
  const [tab, setTab] = useState<'structure' | 'personalise' | 'metrics' | 'enrolled'>('structure')
  const [titleDraft, setTitleDraft] = useState(sequence.name)
  const [descDraft, setDescDraft] = useState(sequence.description)
  const { updateSequence, pauseEnrollment, resumeEnrollment, completeEnrollment, unenrollContact } =
    useSequencesStore.getState()

  useEffect(() => {
    setTitleDraft(sequence.name)
    setDescDraft(sequence.description)
  }, [sequence.id, sequence.name, sequence.description])

  const stepCount = useMemo(
    () => resolveFlowDefinition(sequence).nodes.filter((n) => n.type !== 'ab_split').length,
    [sequence],
  )

  function formatDate(iso?: string) {
    if (!iso) return t.common.emptyCell
    return formatDateShort(iso)
  }

  function flushMeta() {
    const patches: Partial<EmailSequence> = {}
    if (titleDraft !== sequence.name) patches.name = titleDraft
    if (descDraft !== sequence.description) patches.description = descDraft
    if (Object.keys(patches).length) updateSequence(sequence.id, patches)
  }

  function handlePersistFlow(payload: { flowDefinition: SequenceFlowDefinition; steps: SequenceStep[] }) {
    updateSequence(sequence.id, { flowDefinition: payload.flowDefinition, steps: payload.steps })
    toast.success(t.sequences.toastFlowSaved)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-fg/6 shrink-0 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {canEditMeta ? (
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={flushMeta}
                className="text-lg font-semibold text-fg bg-transparent border border-transparent hover:border-fg/10 focus:border-accent-500/40 rounded-md px-1.5 py-0.5 max-w-full min-w-[10rem]"
                aria-label={t.common.name}
              />
            ) : (
              <h2 className="text-lg font-semibold text-fg truncate">{viewSequence.name}</h2>
            )}
            {!canEditMeta ? (
              viewSequence.isActive ? (
                <span className="text-[10px] font-semibold bg-success/20 text-success px-1.5 py-0.5 rounded-md shrink-0">
                  {t.sequences.active}
                </span>
              ) : (
                <span className="text-[10px] font-semibold bg-surface-2/20 text-fg-muted px-1.5 py-0.5 rounded-md shrink-0">
                  {t.common.inactive}
                </span>
              )
            ) : null}
            <span className="hidden sm:inline text-fg/15 select-none" aria-hidden>
              ·
            </span>
            <p className="text-[11px] text-fg-subtle tabular-nums">
              {stepCount} {t.sequences.steps.toLowerCase()}
              <span className="mx-1.5 text-fg/20">·</span>
              {viewSequence.enrolledCount} {t.sequences.enrolled.toLowerCase()}
              <span className="mx-1.5 text-fg/20">·</span>
              {formatDate(viewSequence.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            {canEditMeta ? (
              <div className="flex items-center gap-2 rounded-md border border-fg/8 bg-fg/[0.02] px-2 py-1">
                <span className="text-[10px] font-medium text-fg-subtle whitespace-nowrap">
                  {t.sequences.sequenceActiveToggleLabel}
                </span>
                <Switch
                  checked={sequence.isActive}
                  onChange={(next) => updateSequence(sequence.id, { isActive: next })}
                  aria-label={t.sequences.sequenceActiveToggleLabel}
                />
              </div>
            ) : null}
            <PermissionGate permission="sequences:enroll">
              <button type="button"
                onClick={onEnroll}
                disabled={!sequence.isActive}
                title={!sequence.isActive ? t.sequences.enrollBlockedInactive : undefined}
                className="btn-gradient text-fg text-[11px] font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={12} />
                {t.sequences.enrolled}
              </button>
            </PermissionGate>
          </div>
        </div>

        {canEditMeta ? (
          <textarea
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={flushMeta}
            placeholder={t.common.description}
            rows={1}
            className="w-full max-w-3xl text-[11px] text-fg-muted bg-fg/[0.03] border border-fg/8 rounded-md px-2 py-1.5 resize-y min-h-[2rem] max-h-24 leading-snug focus:outline-none focus:border-accent-500/35"
            aria-label={t.common.description}
          />
        ) : (
          viewSequence.description ? (
            <p className="text-[11px] text-fg-muted line-clamp-2 max-w-3xl">{viewSequence.description}</p>
          ) : null
        )}

        {canEditMeta ? (
          <details className="group rounded-md border border-fg/8 bg-fg/[0.02] max-w-3xl">
            <summary className="cursor-pointer select-none list-none flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-fg-subtle hover:text-fg-muted [&::-webkit-details-marker]:hidden">
              <ChevronRight size={14} className="shrink-0 opacity-70 transition-transform group-open:rotate-90" />
              {t.sequences.sequenceDeliveryRulesToggle}
            </summary>
            <div className="px-2 pb-2 pt-0 space-y-3 border-t border-fg/6">
              <label className="flex items-start gap-2 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-fg/20 bg-fg/5 text-accent-500 focus:ring-accent-500 shrink-0"
                  checked={sequence.stopOnContactReply !== false}
                  onChange={(e) => {
                    updateSequence(sequence.id, { stopOnContactReply: e.target.checked })
                  }}
                />
                <span>
                  <span className="block text-[11px] font-medium text-fg">{t.sequences.stopOnContactReplyLabel}</span>
                  <span className="block text-[10px] text-fg-subtle leading-relaxed mt-0.5">{t.sequences.stopOnContactReplyHint}</span>
                </span>
              </label>
              <div>
                <label className="block text-[10px] font-medium text-fg-subtle mb-1" htmlFor={`seq-start-delay-${sequence.id}`}>
                  {t.sequences.enrollmentStartDelayLabel}
                </label>
                <input
                  id={`seq-start-delay-${sequence.id}`}
                  type="number"
                  min={0}
                  value={sequence.enrollmentStartDelayDays ?? 0}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10)
                    updateSequence(sequence.id, { enrollmentStartDelayDays: Number.isFinite(n) && n >= 0 ? n : 0 })
                  }}
                  className="w-full max-w-[11rem] bg-surface-2 border border-fg/10 rounded-md px-2 py-1.5 text-fg text-[11px]"
                />
                <p className="text-[10px] text-fg-subtle mt-1 leading-relaxed max-w-xl">{t.sequences.enrollmentStartDelayHint}</p>
              </div>
            </div>
          </details>
        ) : (
          <p className="text-[11px] text-fg-subtle">
            {t.sequences.stopOnContactReplyLabel}: {sequence.stopOnContactReply !== false ? t.common.yes : t.common.no}
            <span className="mx-2 text-fg/20">·</span>
            {t.sequences.enrollmentStartDelayLabel}: {sequence.enrollmentStartDelayDays ?? 0}
          </p>
        )}

        <div className="flex gap-0.5 flex-wrap border-t border-fg/6 pt-2 -mx-0.5">
          {(['structure', 'personalise', 'metrics', 'enrolled'] as const).map((tabKey) => (
            <button type="button"
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`text-[11px] font-medium px-3 py-1.5 rounded-md transition-colors ${
                tab === tabKey
                  ? 'bg-accent-500/15 text-accent-400'
                  : 'text-fg-subtle hover:text-fg-muted hover:bg-fg/5'
              }`}
            >
              {tabKey === 'structure'
                ? t.sequences.tabStructure
                : tabKey === 'personalise'
                  ? t.sequences.tabPersonalise
                  : tabKey === 'metrics'
                    ? t.sequences.tabMetrics
                    : `${t.sequences.tabEnrolled} (${enrollments.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === 'structure' &&
        enrollments.filter((e) => e.sequenceId === sequence.id && e.status === 'active').length === 0 ? (
        <div className="mx-4 mt-1.5 flex items-start gap-2 rounded-md border border-info/20 bg-info/[0.07] px-2.5 py-1.5 text-[10px] text-fg-muted leading-snug">
          <Info size={12} className="shrink-0 mt-0.5 text-info opacity-90" aria-hidden />
          <span>{t.sequences.sequenceNoActiveEnrollmentsBanner}</span>
        </div>
      ) : null}

      {tab === 'structure' ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-3 pb-3 pt-1.5">
          <SequenceFlowStudio sequence={sequence} canEdit={canEditFlow} onPersist={handlePersistFlow} />
        </div>
      ) : tab === 'personalise' ? (
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
          <SequencePersonalisePanel />
        </div>
      ) : tab === 'metrics' ? (
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 min-h-0">
          <SequenceMetricsPanel sequenceId={sequence.id} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          {enrollments.length === 0 ? (
            <div className="text-center py-12">
              <Users size={32} className="mx-auto text-fg-subtle mb-2" />
              <p className="text-sm text-fg-subtle">{t.common.noResults}</p>
              <PermissionGate permission="sequences:create">
                <button type="button"
                  onClick={onEnroll}
                  disabled={!sequence.isActive}
                  title={!sequence.isActive ? t.sequences.enrollBlockedInactive : undefined}
                  className="btn-gradient text-fg text-xs font-medium px-4 py-2 rounded-full mt-4 inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={13} />
                  {t.sequences.enrolled}
                </button>
              </PermissionGate>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-fg/6">
                    <th className="text-left text-[11px] font-semibold text-fg-subtle uppercase tracking-wide pb-3 pr-4">{t.contacts.title}</th>
                    <th className="text-left text-[11px] font-semibold text-fg-subtle uppercase tracking-wide pb-3 pr-4">{t.common.status}</th>
                    <th className="text-left text-[11px] font-semibold text-fg-subtle uppercase tracking-wide pb-3 pr-4">{t.sequences.steps}</th>
                    <th className="text-left text-[11px] font-semibold text-fg-subtle uppercase tracking-wide pb-3 pr-4">{t.sequences.flow.enrollmentNodeColumn}</th>
                    <th className="text-left text-[11px] font-semibold text-fg-subtle uppercase tracking-wide pb-3 pr-4">{t.sequences.flow.enrollmentVariantColumn}</th>
                    <th className="text-left text-[11px] font-semibold text-fg-subtle uppercase tracking-wide pb-3 pr-4">{t.activities.dueDate}</th>
                    <th className="text-left text-[11px] font-semibold text-fg-subtle uppercase tracking-wide pb-3">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enr) => (
                    <tr key={enr.id} className="border-b border-fg/4 hover:bg-fg/2 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-fg">{enr.contactName}</p>
                        <p className="text-[11px] text-fg-subtle">
                          {t.sequences.enrolled} {formatDate(enr.enrolledAt)}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${ENROLLMENT_STATUS_COLORS[enr.status]}`}>
                          {enrollmentStatusLabels[enr.status]}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs text-fg-muted">
                          {enr.currentStep + 1} / {Math.max(1, viewSequence.steps.length)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs font-mono text-fg-muted">{enr.currentNodeId ?? t.common.emptyCell}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs text-fg-muted">{enr.abVariant ?? t.common.emptyCell}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs text-fg-muted">{formatDate(enr.nextStepAt)}</span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          {enr.status === 'active' && (
                            <button type="button"
                              onClick={() => { pauseEnrollment(enr.id); toast.success(t.sequences.paused) }}
                              title={t.sequences.paused}
                              className="p-1 text-fg-subtle hover:text-warning transition-colors"
                            >
                              <PauseCircle size={15} />
                            </button>
                          )}
                          {enr.status === 'paused' && (
                            <button type="button"
                              onClick={() => { resumeEnrollment(enr.id); toast.success(t.sequences.active) }}
                              title={t.sequences.active}
                              className="p-1 text-fg-subtle hover:text-success transition-colors"
                            >
                              <PlayCircle size={15} />
                            </button>
                          )}
                          {(enr.status === 'active' || enr.status === 'paused') && (
                            <button type="button"
                              onClick={() => { completeEnrollment(enr.id); toast.success(t.activities.completed) }}
                              title={t.activities.completed}
                              className="p-1 text-fg-subtle hover:text-info transition-colors"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                          <button type="button"
                            onClick={() => { unenrollContact(enr.id); toast.success(t.common.remove) }}
                            title={t.common.remove}
                            className="p-1 text-fg-subtle hover:text-danger transition-colors"
                          >
                            <XCircle size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Sequences() {
  const t = useTranslations()
  const sequencesLoading = useSequencesStore((s) => s.isLoading)
  const [sequences, setSequences] = useState<EmailSequence[]>([])
  const [enrollments, setEnrollments] = useState<SequenceEnrollment[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false)

  // Manual Zustand v5 subscription
  const syncState = useCallback(() => {
    const s = useSequencesStore.getState()
    setSequences(s.sequences)
    setEnrollments(s.enrollments)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncs local state from Zustand store on mount and on subsequent store changes
    syncState()
    const unsub = useSequencesStore.subscribe(syncState)
    return unsub
  }, [syncState])

  useEffect(() => {
    void useSequencesStore.getState().fetchSequences()
  }, [])

  const selectedSequence = sequences.find((s) => s.id === selectedId) ?? null
  const selectedSequenceView = useMemo(
    () => (selectedSequence ? localizedEmailSequence(selectedSequence, getTranslations()) : null),
    [selectedSequence],
  )
  const selectedEnrollments = selectedSequence
    ? enrollments.filter((e) => e.sequenceId === selectedSequence.id)
    : []

  function handleDelete(seqId: string) {
    if (!confirm(t.common.bulkDeleteConfirm)) return
    useSequencesStore.getState().deleteSequence(seqId)
    if (selectedId === seqId) setSelectedId(null)
    toast.success(t.sequences.toastSequenceDeleted)
  }

  function handleCreateSequence() {
    const uid = useAuthStore.getState().currentUser?.id ?? 'current-user'
    const created = useSequencesStore.getState().createSequence({
      name: t.sequences.defaultNewSequenceName,
      description: '',
      steps: [],
      flowDefinition: undefined,
      createdBy: uid,
      isActive: true,
      stopOnContactReply: true,
    })
    setSelectedId(created.id)
    toast.success(t.sequences.newSequence)
  }

  return (
    <div className="crm-page-full flex flex-col min-h-0">
      {showTemplateLibrary && (
        <WorkflowTemplateLibraryDialog onClose={() => setShowTemplateLibrary(false)} />
      )}
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 py-4 border-b border-fg/6">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-fg tracking-tight">{t.sequences.title}</h2>
          <p className="text-sm text-fg-muted mt-1">
            {sequences.length} {t.sequences.title.toLowerCase()} · {enrollments.filter((e) => e.status === 'active').length} {t.sequences.active.toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
            to="/automations"
            className="inline-flex items-center gap-1.5 rounded-full border border-fg/10 bg-surface-2/90 px-3.5 py-1.5 text-sm text-fg hover:border-border-strong transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
          >
            <Workflow size={14} className="text-accent-400" aria-hidden />
            {t.sequences.crossLinkAutomations}
          </Link>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex gap-6 pb-6 pt-2 min-h-0">
        {/* ─── Left: Sequence List ─────────────────────────────────────── */}
        <div className="w-[280px] flex-shrink-0 glass rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-fg/6 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">{t.sequences.title}</h2>
            <PermissionGate permission="sequences:create">
              <button type="button"
                onClick={handleCreateSequence}
                className="btn-gradient text-fg text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1"
              >
                <Plus size={13} />
                {t.common.create}
              </button>
            </PermissionGate>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sequencesLoading ? (
              <div className="p-3 space-y-3" aria-busy="true" aria-label={t.common.loading}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="border-b border-fg/4 pb-3">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : sequences.length === 0 ? (
              <div className="px-2 pb-4">
                <EmptyState
                  icon={<ListOrdered size={26} strokeWidth={1.75} />}
                  title={t.sequences.title}
                  primary={t.common.noResults}
                  secondary={t.sequences.emptyDescription}
                  density="compact"
                />
                <PermissionGate permission="sequences:create">
                  <div className="flex justify-center -mt-4">
                    <Button type="button" size="sm" leftIcon={<Plus size={14} />} onClick={handleCreateSequence}>
                      {t.sequences.newSequence}
                    </Button>
                  </div>
                </PermissionGate>
              </div>
            ) : (
              sequences.map((seq) => {
                const loc = localizedEmailSequence(seq, getTranslations())
                const seqEnrollments = enrollments.filter((e) => e.sequenceId === seq.id)
                const activeCount = seqEnrollments.filter((e) => e.status === 'active').length
                const nodeCount = resolveFlowDefinition(seq).nodes.filter((n) => n.type !== 'ab_split').length

                return (
                  <div
                    key={seq.id}
                    onClick={() => setSelectedId(seq.id)}
                    className={`group px-4 py-3 border-b border-fg/4 cursor-pointer transition-colors ${
                      selectedId === seq.id
                        ? 'bg-accent-600/10 border-l-2 border-l-accent-500'
                        : 'hover:bg-fg/3'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-fg truncate">{loc.name}</p>
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${seq.isActive ? 'bg-success' : 'bg-fg/25'}`}
                            title={seq.isActive ? t.sequences.active : t.common.inactive}
                          />
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-fg-subtle">
                          <span>{nodeCount} {t.sequences.steps.toLowerCase()}</span>
                          <span>{activeCount} {t.sequences.active.toLowerCase()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <PermissionGate permission="sequences:update">
                          <div
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <Switch
                              checked={seq.isActive}
                              onChange={(next) => useSequencesStore.getState().updateSequence(seq.id, { isActive: next })}
                              aria-label={t.sequences.sequenceActiveToggleLabel}
                            />
                          </div>
                        </PermissionGate>
                        <PermissionGate permission="sequences:delete">
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(seq.id) }}
                            title={t.common.delete}
                            aria-label={t.common.delete}
                            className="p-1 text-fg-subtle hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </PermissionGate>
                        <ChevronRight size={13} className="text-fg-subtle" />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ─── Right: Detail ───────────────────────────────────────────── */}
        <div className="flex-1 glass rounded-2xl overflow-hidden min-w-0 flex flex-col min-h-0">
          {selectedSequence && selectedSequenceView ? (
            <SequenceDetail
              sequence={selectedSequence}
              enrollments={selectedEnrollments}
              onEnroll={() => setShowEnrollModal(true)}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-fg/8 flex items-center justify-center mx-auto mb-4">
                  <ListOrdered size={28} className="text-fg-subtle" />
                </div>
                <h3 className="text-fg font-medium mb-1">{t.common.view} {t.sequences.title.toLowerCase()}</h3>
                <p className="text-sm text-fg-subtle">{t.common.or} {t.sequences.newSequence.toLowerCase()}</p>
                <PermissionGate permission="sequences:create">
                  <button type="button"
                    onClick={handleCreateSequence}
                    className="btn-gradient text-fg text-xs font-medium px-5 py-2.5 rounded-full mt-4 inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    {t.sequences.newSequence}
                  </button>
                </PermissionGate>
              </div>
            </div>
          )}
        </div>
      </div>

      {showEnrollModal && selectedSequenceView && (
        <EnrollModal sequence={selectedSequenceView} onClose={() => setShowEnrollModal(false)} />
      )}
    </div>
  )
}
