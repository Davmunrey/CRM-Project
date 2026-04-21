import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Mail, Phone, Linkedin, Clock, Users, CheckCircle2,
  PauseCircle, XCircle, ListOrdered, Trash2, PlayCircle, ChevronRight,
  X, GripVertical, Workflow, Library,
} from 'lucide-react'
import { useSequencesStore } from '../store/sequencesStore'
import { useContactsStore } from '../store/contactsStore'
import { PermissionGate } from '../components/auth/PermissionGate'
import { toast } from '../store/toastStore'
import { getTranslations, useI18nStore, useTranslations } from '../i18n'
import { localizedEmailSequence } from '../i18n/localizeSeed'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { WorkflowTemplateLibraryDialog } from '../components/workflows/WorkflowTemplateLibraryDialog'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { formatDateShort } from '../utils/formatters'
import type {
  EmailSequence,
  SequenceStep,
  SequenceStepType,
  SequenceEnrollment,
  EnrollmentStatus,
} from '../types'

// ─── Constants ───────────────────────────────────────────────────────────────

function getStepTypeLabels(t: ReturnType<typeof useTranslations>): Record<SequenceStepType, string> {
  return {
    email: t.activities.typeLabels.email,
    call_task: t.activities.typeLabels.call,
    linkedin_task: t.activities.typeLabels.linkedin,
    wait: t.sequences.paused,
  }
}

function getEnrollmentStatusLabels(t: ReturnType<typeof useTranslations>): Record<EnrollmentStatus, string> {
  return {
    active: t.sequences.active,
    completed: t.activities.completed,
    paused: t.sequences.paused,
    replied: t.common.back,
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

// ─── Step icon ───────────────────────────────────────────────────────────────

function StepIcon({ type, size = 16 }: { type: SequenceStepType; size?: number }) {
  switch (type) {
    case 'email': return <Mail size={size} className="text-accent-400" />
    case 'call_task': return <Phone size={size} className="text-success" />
    case 'linkedin_task': return <Linkedin size={size} className="text-info" />
    case 'wait': return <Clock size={size} className="text-warning" />
  }
}

// ─── Enroll Modal ────────────────────────────────────────────────────────────

interface EnrollModalProps {
  sequence: EmailSequence
  onClose: () => void
}

function EnrollModal({ sequence, onClose }: EnrollModalProps) {
  const t = useTranslations()
  const language = useI18nStore((s) => s.language)
  const locSequence = useMemo(() => localizedEmailSequence(sequence, getTranslations()), [sequence, language])
  const [contacts, setContacts] = useState(useContactsStore.getState().contacts)
  const [selectedContactId, setSelectedContactId] = useState('')
  const { enrollContact } = useSequencesStore.getState()

  useEffect(() => {
    const unsub = useContactsStore.subscribe((s) => setContacts(s.contacts))
    return unsub
  }, [])

  function handleEnroll() {
    if (!selectedContactId) return
    const contact = contacts.find((c) => c.id === selectedContactId)
    if (!contact) return
    enrollContact(sequence.id, contact.id, `${contact.firstName} ${contact.lastName}`)
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
          <div>
            <Select
              label={t.contacts.title}
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              options={[
                { value: '', label: `— ${t.common.selectAll} —` },
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
              disabled={!selectedContactId}
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

// ─── New / Edit Step Form ────────────────────────────────────────────────────

interface StepFormProps {
  step: SequenceStep
  index: number
  onChange: (updated: SequenceStep) => void
  onRemove: () => void
}

function StepFormRow({ step, index, onChange, onRemove }: StepFormProps) {
  const t = useTranslations()
  const stepTypeLabels = getStepTypeLabels(t)

  return (
    <div className="flex gap-3 items-start p-4 bg-fg/3 border border-fg/8 rounded-xl">
      <div className="flex items-center gap-1 text-fg-subtle pt-1 cursor-grab flex-shrink-0">
        <GripVertical size={14} />
        <span className="text-xs font-mono text-fg-subtle">{index + 1}</span>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-3">
        {/* Type */}
        <div>
          <Select
            label={t.common.type}
            value={step.type}
            onChange={(e) => onChange({ ...step, type: e.target.value as SequenceStepType })}
            options={(Object.keys(stepTypeLabels) as SequenceStepType[]).map((k) => ({
              value: k,
              label: stepTypeLabels[k],
            }))}
            listMaxHeightClass="max-h-48"
          />
        </div>

        {/* Delay */}
        <div>
          <label className="block text-[10px] font-medium text-fg-subtle mb-1">{t.activities.dueDate}</label>
          <input
            type="number"
            min={0}
            value={step.delayDays}
            onChange={(e) => onChange({ ...step, delayDays: parseInt(e.target.value) || 0 })}
            aria-label={t.activities.dueDate}
            title={t.activities.dueDate}
            className="w-full bg-surface-2 border border-fg/10 rounded-lg px-3 py-2 text-fg text-xs focus:outline-none focus:border-accent-500/50"
          />
        </div>

        {/* Email-specific fields */}
        {step.type === 'email' && (
          <>
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-fg-subtle mb-1">{t.activities.subject}</label>
              <input
                type="text"
                value={step.subject ?? ''}
                onChange={(e) => onChange({ ...step, subject: e.target.value })}
                placeholder={`${t.activities.subject}...`}
                className="w-full bg-surface-2 border border-fg/10 rounded-lg px-3 py-2 text-fg text-xs placeholder:text-fg-subtle focus:outline-none focus:border-accent-500/50"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-fg-subtle mb-1">
                {t.common.description} <span className="text-fg-subtle font-normal">({'{{firstName}}'}, {'{{companyName}}'})</span>
              </label>
              <textarea
                value={step.bodyTemplate ?? ''}
                onChange={(e) => onChange({ ...step, bodyTemplate: e.target.value })}
                placeholder={`${t.common.description}...`}
                rows={3}
                className="w-full bg-surface-2 border border-fg/10 rounded-lg px-3 py-2 text-fg text-xs placeholder:text-fg-subtle focus:outline-none focus:border-accent-500/50 resize-none font-mono"
              />
            </div>
          </>
        )}

        {/* Task-specific fields */}
        {(step.type === 'call_task' || step.type === 'linkedin_task') && (
          <div className="col-span-2">
            <label className="block text-[10px] font-medium text-fg-subtle mb-1">{t.common.description}</label>
            <input
              type="text"
              value={step.taskDescription ?? ''}
              onChange={(e) => onChange({ ...step, taskDescription: e.target.value })}
              placeholder={`${t.common.description}...`}
              className="w-full bg-surface-2 border border-fg/10 rounded-lg px-3 py-2 text-fg text-xs placeholder:text-fg-subtle focus:outline-none focus:border-accent-500/50"
            />
          </div>
        )}
      </div>

      <button type="button"
        onClick={onRemove}
        title={t.common.delete}
        aria-label={t.common.delete}
        className="p-1.5 text-fg-subtle hover:text-danger transition-colors flex-shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ─── New Sequence SlideOver ───────────────────────────────────────────────────

interface NewSequenceSlideOverProps {
  open: boolean
  onClose: () => void
}

function NewSequenceSlideOver({ open, onClose }: NewSequenceSlideOverProps) {
  const t = useTranslations()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<SequenceStep[]>([])

  function reset() {
    setName('')
    setDescription('')
    setSteps([])
  }

  function handleClose() {
    reset()
    onClose()
  }

  function addStep() {
    const newStep: SequenceStep = {
      id: `step-${Date.now()}`,
      order: steps.length,
      type: 'email',
      delayDays: steps.length === 0 ? 0 : 3,
    }
    setSteps((prev) => [...prev, newStep])
  }

  function updateStep(index: number, updated: SequenceStep) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...updated, order: i } : s)))
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })))
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error(t.common.name)
      return
    }
    useSequencesStore.getState().createSequence({
      name: name.trim(),
      description: description.trim(),
      steps,
      createdBy: 'current-user',
      isActive: true,
    })
    toast.success(`"${name}" ${t.sequences.newSequence.toLowerCase()}`)
    handleClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 ml-auto w-full max-w-xl h-full bg-surface-1 border-l border-fg/8 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-fg/8">
          <div>
            <h2 className="text-lg font-semibold text-fg">{t.sequences.newSequence}</h2>
            <p className="text-xs text-fg-muted mt-0.5">{t.common.description}</p>
          </div>
          <button type="button"
            onClick={handleClose}
            title={t.common.close}
            aria-label={t.common.close}
            className="p-1.5 rounded-lg text-fg-subtle hover:text-fg-muted hover:bg-fg/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1.5">{t.common.name} *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${t.sequences.title}...`}
              className="w-full bg-surface-2 border border-fg/10 rounded-xl px-4 py-2.5 text-fg text-sm placeholder:text-fg-subtle focus:outline-none focus:border-accent-500/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1.5">{t.common.description}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`${t.common.description}...`}
              rows={2}
              className="w-full bg-surface-2 border border-fg/10 rounded-xl px-4 py-2.5 text-fg text-sm placeholder:text-fg-subtle focus:outline-none focus:border-accent-500/50 resize-none"
            />
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-fg-muted">
                {t.sequences.steps} ({steps.length})
              </label>
              <button type="button"
                onClick={addStep}
                className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1 transition-colors"
              >
                <Plus size={13} />
                {t.common.add}
              </button>
            </div>

            {steps.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-fg/10 rounded-xl">
                <ListOrdered size={24} className="mx-auto text-fg-subtle mb-2" />
                <p className="text-sm text-fg-subtle">{t.common.noResults}</p>
                <button type="button"
                  onClick={addStep}
                  className="text-xs text-accent-400 hover:text-accent-300 mt-2 transition-colors"
                >
                  + {t.common.add}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <StepFormRow
                    key={step.id}
                    step={step}
                    index={idx}
                    onChange={(updated) => updateStep(idx, updated)}
                    onRemove={() => removeStep(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-fg/8 flex items-center gap-3">
          <button type="button"
            onClick={handleClose}
            className="flex-1 bg-surface-2 border border-fg/10 text-fg-muted text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-fg/10 transition-colors"
          >
            {t.common.cancel}
          </button>
          <button type="button"
            onClick={handleSave}
            className="flex-1 btn-gradient text-fg text-sm font-medium px-4 py-2.5 rounded-xl"
          >
            {t.sequences.newSequence}
          </button>
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
  const language = useI18nStore((s) => s.language)
  const viewSequence = useMemo(() => localizedEmailSequence(sequence, getTranslations()), [sequence, language])
  const stepTypeLabels = getStepTypeLabels(t)
  const enrollmentStatusLabels = getEnrollmentStatusLabels(t)
  const [tab, setTab] = useState<'steps' | 'enrolled'>('steps')
  const { pauseEnrollment, resumeEnrollment, completeEnrollment, unenrollContact } = useSequencesStore.getState()

  function formatDate(iso?: string) {
    if (!iso) return '—'
    return formatDateShort(iso)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-fg/6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-fg truncate">{viewSequence.name}</h2>
              {viewSequence.isActive ? (
                <span className="text-[10px] font-semibold bg-success/20 text-success px-2 py-0.5 rounded-full flex-shrink-0">
                  {t.sequences.active}
                </span>
              ) : (
                <span className="text-[10px] font-semibold bg-surface-2/20 text-fg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                  {t.common.inactive}
                </span>
              )}
            </div>
            {viewSequence.description && (
              <p className="text-sm text-fg-muted">{viewSequence.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-fg-subtle">
              <span>{viewSequence.steps.length} {t.sequences.steps.toLowerCase()}</span>
              <span>{viewSequence.enrolledCount} {t.sequences.enrolled.toLowerCase()}</span>
              <span>{t.common.createdAt} {formatDate(viewSequence.createdAt)}</span>
            </div>
          </div>
          <PermissionGate permission="sequences:enroll">
            <button type="button"
              onClick={onEnroll}
              className="btn-gradient text-fg text-xs font-medium px-4 py-2 rounded-full flex items-center gap-1.5 flex-shrink-0"
            >
              <Plus size={13} />
              {t.sequences.enrolled}
            </button>
          </PermissionGate>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {(['steps', 'enrolled'] as const).map((tabKey) => (
            <button type="button"
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`text-xs font-medium px-4 py-2 rounded-full transition-colors ${
                tab === tabKey
                  ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                  : 'text-fg-subtle hover:text-fg-muted hover:bg-fg/5'
              }`}
            >
              {tabKey === 'steps' ? t.sequences.steps : `${t.sequences.enrolled} (${enrollments.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'steps' && (
          <div className="space-y-0">
            {viewSequence.steps.length === 0 ? (
              <div className="text-center py-12">
                <ListOrdered size={32} className="mx-auto text-fg-subtle mb-2" />
                <p className="text-sm text-fg-subtle">{t.common.noResults}</p>
              </div>
            ) : (
              viewSequence.steps
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((step, idx) => (
                  <div key={step.id} className="flex gap-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-surface-2 border border-fg/10 flex items-center justify-center">
                        <StepIcon type={step.type} size={15} />
                      </div>
                      {idx < viewSequence.steps.length - 1 && (
                        <div className="w-px flex-1 bg-fg/8 my-1 min-h-[32px]" />
                      )}
                    </div>

                    {/* Step content */}
                    <div className={`flex-1 pb-6 ${idx === viewSequence.steps.length - 1 ? '' : ''}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-fg">
                          {t.sequences.steps} {idx + 1} — {stepTypeLabels[step.type]}
                        </span>
                        {step.delayDays > 0 && (
                          <span className="text-[10px] bg-fg/6 text-fg-muted px-2 py-0.5 rounded-full">
                            +{step.delayDays}
                          </span>
                        )}
                        {step.delayDays === 0 && idx === 0 && (
                          <span className="text-[10px] bg-accent-500/15 text-accent-400 px-2 py-0.5 rounded-full">
                            0
                          </span>
                        )}
                      </div>

                      {step.type === 'email' && (
                        <div className="bg-fg/3 border border-fg/8 rounded-xl p-4 space-y-2">
                          {step.subject && (
                            <p className="text-sm font-medium text-fg">
                              <span className="text-fg-subtle text-xs font-normal mr-2">{t.activities.subject}:</span>
                              {step.subject}
                            </p>
                          )}
                          {step.bodyTemplate && (
                            <p className="text-xs text-fg-muted whitespace-pre-wrap line-clamp-3 font-mono">
                              {step.bodyTemplate}
                            </p>
                          )}
                        </div>
                      )}

                      {(step.type === 'call_task' || step.type === 'linkedin_task') && step.taskDescription && (
                        <div className="bg-fg/3 border border-fg/8 rounded-xl p-4">
                          <p className="text-xs text-fg-muted">{step.taskDescription}</p>
                        </div>
                      )}

                      {step.type === 'wait' && (
                        <div className="bg-fg/3 border border-fg/8 rounded-xl p-4">
                          <p className="text-xs text-fg-muted">{t.sequences.paused} {step.delayDays}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {tab === 'enrolled' && (
          <div>
            {enrollments.length === 0 ? (
              <div className="text-center py-12">
                <Users size={32} className="mx-auto text-fg-subtle mb-2" />
                <p className="text-sm text-fg-subtle">{t.common.noResults}</p>
                <PermissionGate permission="sequences:create">
                  <button type="button"
                    onClick={onEnroll}
                    className="btn-gradient text-fg text-xs font-medium px-4 py-2 rounded-full mt-4 inline-flex items-center gap-1.5"
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
                            {enr.currentStep + 1} / {viewSequence.steps.length}
                          </span>
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
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Sequences() {
  const t = useTranslations()
  const language = useI18nStore((s) => s.language)
  const sequencesLoading = useSequencesStore((s) => s.isLoading)
  const [sequences, setSequences] = useState<EmailSequence[]>([])
  const [enrollments, setEnrollments] = useState<SequenceEnrollment[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewSlideOver, setShowNewSlideOver] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false)

  // Manual Zustand v5 subscription
  const syncState = useCallback(() => {
    const s = useSequencesStore.getState()
    setSequences(s.sequences)
    setEnrollments(s.enrollments)
  }, [])

  useEffect(() => {
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
    [selectedSequence, language],
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
                onClick={() => setShowNewSlideOver(true)}
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
                    <Button type="button" size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowNewSlideOver(true)}>
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
                          {seq.isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-fg-subtle">
                          <span>{seq.steps.length} {t.sequences.steps.toLowerCase()}</span>
                          <span>{activeCount} {t.sequences.active.toLowerCase()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
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
        <div className="flex-1 glass rounded-2xl overflow-hidden min-w-0">
          {selectedSequenceView ? (
            <SequenceDetail
              sequence={selectedSequenceView}
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
                    onClick={() => setShowNewSlideOver(true)}
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

      {/* Modals / SlideOvers */}
      <NewSequenceSlideOver open={showNewSlideOver} onClose={() => setShowNewSlideOver(false)} />
      {showEnrollModal && selectedSequenceView && (
        <EnrollModal sequence={selectedSequenceView} onClose={() => setShowEnrollModal(false)} />
      )}
    </div>
  )
}
