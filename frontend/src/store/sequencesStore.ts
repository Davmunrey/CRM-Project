import { create } from 'zustand'
import type { EmailSequence, SequenceEnrollment, EnrollmentStatus, SequenceFlowDefinition, SequenceStep } from '../types'
import { computeEnrollmentStart } from '../features/sequences-flow/sequenceFlowEnrollment'
import {
  createDefaultFlowDefinition,
  flowPrimaryPathToSteps,
  linearStepsToFlow,
  parseFlowDefinition,
} from '../features/sequences-flow/sequenceFlowConverters'
import type { SeedSequenceId } from '../i18n/types'
import { api } from '../lib/api'

// ─── Seed data ───────────────────────────────────────────────────────────────

export const builtInSequenceTemplates: EmailSequence[] = [
  {
    id: 'seq-001',
    name: 'Outreach Inicial',
    description: 'Secuencia de prospección para nuevos leads.',
    steps: [
      { id: 'step-001-1', order: 0, type: 'email', delayDays: 0, subject: 'Encantado de conectar, {{firstName}}', bodyTemplate: 'Hola {{firstName}},\n\nMe gustaría explorar si podemos colaborar.\n\nUn saludo,\n{{senderName}}' },
      { id: 'step-001-2', order: 1, type: 'email', delayDays: 3, subject: 'Seguimiento - {{firstName}}', bodyTemplate: 'Hola {{firstName}},\n\nSolo quería hacer seguimiento.\n\nUn saludo,\n{{senderName}}' },
      { id: 'step-001-3', order: 2, type: 'call_task', delayDays: 7, taskDescription: 'Llamar al contacto para agendar una demo.' },
    ],
    createdBy: 'u1', createdAt: '2025-01-10T09:00:00Z', isActive: true, enrolledCount: 0,
  },
  {
    id: 'seq-002',
    name: 'Re-engagement',
    description: 'Recuperar contactos que llevan más de 60 días sin responder.',
    steps: [
      { id: 'step-002-1', order: 0, type: 'email', delayDays: 0, subject: '¿Sigues interesado, {{firstName}}?', bodyTemplate: 'Hola {{firstName}},\n\nQuería retomar el contacto.\n\nUn saludo,\n{{senderName}}' },
      { id: 'step-002-2', order: 1, type: 'email', delayDays: 5, subject: 'Último intento, {{firstName}}', bodyTemplate: 'Hola {{firstName}},\n\nEste será mi último email.\n\n¡Mucho éxito!\n{{senderName}}' },
    ],
    createdBy: 'u1', createdAt: '2025-01-15T09:00:00Z', isActive: true, enrolledCount: 0,
  },
  {
    id: 'seq-003',
    name: 'Post-demo follow-up',
    description: 'Multi-touch nurture after a demo: recap email, proof point, then a scheduled call.',
    steps: [
      { id: 'step-003-1', order: 0, type: 'email', delayDays: 0, subject: 'Thanks for the demo - {{firstName}}', bodyTemplate: 'Hi {{firstName}},\n\nThanks for the walkthrough.\n\nBest,\n{{senderName}}' },
      { id: 'step-003-2', order: 1, type: 'wait', delayDays: 2 },
      { id: 'step-003-3', order: 2, type: 'email', delayDays: 0, subject: 'Materials you asked for - {{company}}', bodyTemplate: 'Hi {{firstName}},\n\nSharing the references we promised.\n\nBest,\n{{senderName}}' },
      { id: 'step-003-4', order: 3, type: 'call_task', delayDays: 5, taskDescription: 'Call to confirm evaluation criteria and economic buyer.' },
    ],
    createdBy: 'u1', createdAt: '2025-01-20T09:00:00Z', isActive: true, enrolledCount: 0,
  },
  {
    id: 'seq-004',
    name: 'Land and expand',
    description: 'Warm outreach to existing customers: value recap, social touch, then expansion ask.',
    steps: [
      { id: 'step-004-1', order: 0, type: 'email', delayDays: 0, subject: 'Ideas for {{company}} this quarter', bodyTemplate: 'Hi {{firstName}},\n\nHere are three concrete wins we can unlock.\n\nBest,\n{{senderName}}' },
      { id: 'step-004-2', order: 1, type: 'linkedin_task', delayDays: 3, taskDescription: 'Light-touch LinkedIn engagement with your champion.' },
    ],
    createdBy: 'u1', createdAt: '2025-01-22T09:00:00Z', isActive: true, enrolledCount: 0,
  },
  {
    id: 'seq-005',
    name: 'Executive re-engage',
    description: 'Short high-value sequence for stalled executive conversations.',
    steps: [
      { id: 'step-005-1', order: 0, type: 'email', delayDays: 0, subject: 'Quick thought for you, {{firstName}}', bodyTemplate: 'Hi {{firstName}},\n\nWanted to share a quick insight.\n\nBest,\n{{senderName}}' },
      { id: 'step-005-2', order: 1, type: 'email', delayDays: 2, subject: 'One metric worth 5 minutes - {{firstName}}', bodyTemplate: 'Hi {{firstName}},\n\nQuick note with one benchmark.\n\nBest,\n{{senderName}}' },
      { id: 'step-005-3', order: 2, type: 'call_task', delayDays: 1, taskDescription: 'Call to confirm priorities and lock a new executive slot.' },
    ],
    createdBy: 'u1', createdAt: '2025-01-24T09:00:00Z', isActive: true, enrolledCount: 0,
  },
]

function hydrateSeedSequences(sequences: EmailSequence[]): EmailSequence[] {
  return sequences.map((sequence) => {
    const flowDefinition = sequence.flowDefinition
      ? parseFlowDefinition(sequence.flowDefinition)
      : linearStepsToFlow(sequence.steps)
    return {
      ...sequence,
      flowDefinition,
      stopOnContactReply: sequence.stopOnContactReply !== false,
      enrollmentStartDelayDays: Math.max(0, sequence.enrollmentStartDelayDays ?? 0),
    }
  })
}

const hydratedBuiltInSequences = hydrateSeedSequences(builtInSequenceTemplates)

export function getBuiltInSequenceById(id: SeedSequenceId): EmailSequence | undefined {
  return hydratedBuiltInSequences.find((s) => s.id === id)
}

// ─── Store interface ──────────────────────────────────────────────────────────

export interface SequencesStore {
  sequences: EmailSequence[]
  enrollments: SequenceEnrollment[]
  isLoading: boolean
  error: string | null
  fetchSequences: () => Promise<void>
  createSequence: (data: Omit<EmailSequence, 'id' | 'createdAt' | 'enrolledCount'>) => EmailSequence
  updateSequence: (id: string, updates: Partial<EmailSequence>) => void
  deleteSequence: (id: string) => void
  enrollContact: (sequenceId: string, contactId: string, contactName: string) => SequenceEnrollment | null
  pauseEnrollment: (enrollmentId: string) => void
  resumeEnrollment: (enrollmentId: string) => void
  completeEnrollment: (enrollmentId: string) => void
  unenrollContact: (enrollmentId: string) => void
  markEnrollmentReplied: (enrollmentId: string) => void
  getEnrollmentsForContact: (contactId: string) => SequenceEnrollment[]
  getEnrollmentsForSequence: (sequenceId: string) => SequenceEnrollment[]
}

type ApiSeq = Record<string, unknown>
type ApiEnr = Record<string, unknown>

function rowToSequence(r: ApiSeq): EmailSequence {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? '',
    steps: (typeof r.steps === 'string' ? JSON.parse(r.steps) : (r.steps ?? [])) as SequenceStep[],
    flowDefinition: parseFlowDefinition(typeof (r.flowDefinition ?? r.flow_definition) === 'string' ? JSON.parse((r.flowDefinition ?? r.flow_definition) as string) : (r.flowDefinition ?? r.flow_definition)) ?? null,
    createdBy: ((r.createdBy ?? r.created_by) as string),
    createdAt: ((r.createdAt ?? r.created_at) as string),
    isActive: Boolean(r.isActive ?? r.is_active),
    enrolledCount: ((r.enrolledCount ?? r.enrolled_count) as number) ?? 0,
    stopOnContactReply: ((r.stopOnContactReply ?? r.stop_on_contact_reply) as boolean) !== false,
    enrollmentStartDelayDays: Math.max(0, Number((r.enrollmentStartDelayDays ?? r.enrollment_start_delay_days) ?? 0)),
  }
}

function rowToEnrollment(r: ApiEnr): SequenceEnrollment {
  return {
    id: r.id as string,
    sequenceId: ((r.sequenceId ?? r.sequence_id) as string),
    contactId: ((r.contactId ?? r.contact_id) as string),
    contactName: ((r.contactName ?? r.contact_name) as string),
    currentStep: ((r.currentStep ?? r.current_step) as number) ?? 0,
    currentNodeId: ((r.currentNodeId ?? r.current_node_id) as string) ?? null,
    abVariant: ((r.abVariant ?? r.ab_variant) as 'a' | 'b') ?? null,
    status: (r.status as EnrollmentStatus),
    enrolledAt: ((r.enrolledAt ?? r.enrolled_at) as string),
    nextStepAt: ((r.nextStepAt ?? r.next_step_at) as string) ?? undefined,
    completedAt: ((r.completedAt ?? r.completed_at) as string) ?? undefined,
    lastSentThreadId: ((r.lastSentThreadId ?? r.last_sent_thread_id) as string) ?? null,
    lastSentMessageId: ((r.lastSentMessageId ?? r.last_sent_message_id) as string) ?? null,
    lastSentAt: ((r.lastSentAt ?? r.last_sent_at) as string) ?? null,
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSequencesStore = create<SequencesStore>()((set, get) => ({
  sequences: [],
  enrollments: [],
  isLoading: false,
  error: null,

  fetchSequences: async () => {
    set({ isLoading: true, error: null })
    try {
      const [seqData, enrData] = await Promise.all([
        api.get<ApiSeq[]>('/sequences'),
        api.get<ApiEnr[]>('/sequences/enrollments'),
      ])
      set({
        sequences: (seqData ?? []).map(rowToSequence),
        enrollments: (enrData ?? []).map(rowToEnrollment),
        isLoading: false,
      })
    } catch (e: unknown) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  createSequence: (data) => {
    const now = new Date().toISOString()
    const parsed = data.flowDefinition != null ? parseFlowDefinition(data.flowDefinition) : null
    let flow: SequenceFlowDefinition
    let steps: SequenceStep[]
    if (parsed) {
      flow = parsed
      steps = data.steps?.length ? data.steps : flowPrimaryPathToSteps(flow)
    } else if (data.steps?.length) {
      steps = data.steps
      flow = linearStepsToFlow(steps)
    } else {
      flow = createDefaultFlowDefinition()
      steps = flowPrimaryPathToSteps(flow)
    }
    const newSeq: EmailSequence = {
      ...data, steps, flowDefinition: flow,
      id: crypto.randomUUID(), createdAt: now, enrolledCount: 0,
      stopOnContactReply: data.stopOnContactReply !== false,
      enrollmentStartDelayDays: Math.max(0, data.enrollmentStartDelayDays ?? 0),
    }
    set((s) => ({ sequences: [...s.sequences, newSeq] }))
    api.post<ApiSeq>('/sequences', {
      name: newSeq.name, description: newSeq.description, steps: newSeq.steps,
      flowDefinition: newSeq.flowDefinition, createdBy: newSeq.createdBy,
      isActive: newSeq.isActive, stopOnContactReply: newSeq.stopOnContactReply,
      enrollmentStartDelayDays: newSeq.enrollmentStartDelayDays,
    }).then((created) => {
      set((s) => ({ sequences: s.sequences.map((seq) => seq.id === newSeq.id ? rowToSequence(created) : seq) }))
    }).catch(() => {})
    return newSeq
  },

  updateSequence: (id, updates) => {
    set((s) => ({ sequences: s.sequences.map((seq) => seq.id === id ? { ...seq, ...updates } : seq) }))
    api.patch(`/sequences/${id}`, updates).catch(() => {})
  },

  deleteSequence: (id) => {
    set((s) => ({
      sequences: s.sequences.filter((seq) => seq.id !== id),
      enrollments: s.enrollments.filter((e) => e.sequenceId !== id),
    }))
    api.delete(`/sequences/${id}`).catch(() => {})
  },

  enrollContact: (sequenceId, contactId, contactName) => {
    const sequence = get().sequences.find((s) => s.id === sequenceId)
    if (!sequence || !sequence.isActive) return null
    const now = new Date().toISOString()
    const start = sequence ? computeEnrollmentStart(sequence) : null
    const seqStartDays = Math.max(0, sequence?.enrollmentStartDelayDays ?? 0)
    const firstStepDelay = Math.max(0, start?.delayDays ?? sequence?.steps.find((s) => s.order === 0)?.delayDays ?? 0)
    const totalDelayDays = seqStartDays + firstStepDelay
    const d = new Date()
    d.setDate(d.getDate() + totalDelayDays)
    const nextStepAt = d.toISOString()
    const enrollment: SequenceEnrollment = {
      id: crypto.randomUUID(), sequenceId, contactId, contactName,
      currentStep: start?.currentStep ?? 0,
      currentNodeId: start?.currentNodeId ?? null,
      abVariant: start?.abVariant ?? null,
      status: 'active', enrolledAt: now, nextStepAt,
    }
    set((s) => ({
      enrollments: [...s.enrollments, enrollment],
      sequences: s.sequences.map((seq) => seq.id === sequenceId ? { ...seq, enrolledCount: seq.enrolledCount + 1 } : seq),
    }))
    api.post('/sequences/enrollments', {
      sequenceId, contactId, contactName,
      currentStep: enrollment.currentStep, currentNodeId: enrollment.currentNodeId,
      abVariant: enrollment.abVariant, status: 'active', enrolledAt: now, nextStepAt,
    }).then((created) => {
      set((s) => ({ enrollments: s.enrollments.map((e) => e.id === enrollment.id ? rowToEnrollment(created as ApiEnr) : e) }))
    }).catch(() => {})
    return enrollment
  },

  pauseEnrollment: (enrollmentId) => {
    set((s) => ({ enrollments: s.enrollments.map((e) => e.id === enrollmentId ? { ...e, status: 'paused' as EnrollmentStatus } : e) }))
    api.patch(`/sequences/enrollments/${enrollmentId}`, { status: 'paused' }).catch(() => {})
  },

  resumeEnrollment: (enrollmentId) => {
    set((s) => ({ enrollments: s.enrollments.map((e) => e.id === enrollmentId ? { ...e, status: 'active' as EnrollmentStatus } : e) }))
    api.patch(`/sequences/enrollments/${enrollmentId}`, { status: 'active' }).catch(() => {})
  },

  completeEnrollment: (enrollmentId) => {
    const now = new Date().toISOString()
    set((s) => ({ enrollments: s.enrollments.map((e) => e.id === enrollmentId ? { ...e, status: 'completed' as EnrollmentStatus, completedAt: now } : e) }))
    api.patch(`/sequences/enrollments/${enrollmentId}`, { status: 'completed', completedAt: now }).catch(() => {})
  },

  unenrollContact: (enrollmentId) => {
    set((s) => ({ enrollments: s.enrollments.filter((e) => e.id !== enrollmentId) }))
    api.delete(`/sequences/enrollments/${enrollmentId}`).catch(() => {})
  },

  markEnrollmentReplied: (enrollmentId) => {
    const now = new Date().toISOString()
    set((s) => ({
      enrollments: s.enrollments.map((e) =>
        e.id === enrollmentId ? { ...e, status: 'replied' as EnrollmentStatus, completedAt: now, nextStepAt: undefined } : e
      ),
    }))
    api.patch(`/sequences/enrollments/${enrollmentId}`, { status: 'replied', completedAt: now, nextStepAt: null }).catch(() => {})
  },

  getEnrollmentsForContact: (contactId) => get().enrollments.filter((e) => e.contactId === contactId),
  getEnrollmentsForSequence: (sequenceId) => get().enrollments.filter((e) => e.sequenceId === sequenceId),
}))
