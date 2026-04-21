import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { EmailSequence, SequenceEnrollment, EnrollmentStatus } from '../types'
import type { SeedSequenceId } from '../i18n/types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { devConsole } from '../lib/devConsole'
import { getOrgId, sbDelete } from '../lib/supabaseHelpers'

// ─── Seed data ───────────────────────────────────────────────────────────────

/** Built-in sequence definitions (demo + template install source). */
export const seedSequences: EmailSequence[] = [
  {
    id: 'seq-001',
    name: 'Outreach Inicial',
    description: 'Secuencia de prospección para nuevos leads.',
    steps: [
      { id: 'step-001-1', order: 0, type: 'email', delayDays: 0, subject: 'Encantado de conectar, {{firstName}}', bodyTemplate: 'Hola {{firstName}},\n\nMe gustaría explorar si podemos colaborar.\n\nUn saludo,\nDavid' },
      { id: 'step-001-2', order: 1, type: 'email', delayDays: 3, subject: 'Seguimiento - {{firstName}}', bodyTemplate: 'Hola {{firstName}},\n\nSolo quería hacer seguimiento.\n\nUn saludo,\nDavid' },
      { id: 'step-001-3', order: 2, type: 'call_task', delayDays: 7, taskDescription: 'Llamar al contacto para agendar una demo.' },
    ],
    createdBy: 'u1', createdAt: '2025-01-10T09:00:00Z', isActive: true, enrolledCount: 0,
  },
  {
    id: 'seq-002',
    name: 'Re-engagement',
    description: 'Recuperar contactos que llevan más de 60 días sin responder.',
    steps: [
      { id: 'step-002-1', order: 0, type: 'email', delayDays: 0, subject: '¿Sigues interesado, {{firstName}}?', bodyTemplate: 'Hola {{firstName}},\n\nQuería retomar el contacto.\n\nUn saludo,\nDavid' },
      { id: 'step-002-2', order: 1, type: 'email', delayDays: 5, subject: 'Último intento, {{firstName}}', bodyTemplate: 'Hola {{firstName}},\n\nEste será mi último email.\n\n¡Mucho éxito!\nDavid' },
    ],
    createdBy: 'u1', createdAt: '2025-01-15T09:00:00Z', isActive: true, enrolledCount: 0,
  },
  {
    id: 'seq-003',
    name: 'Post-demo follow-up',
    description: 'Multi-touch nurture after a demo: recap email, proof point, then a scheduled call.',
    steps: [
      {
        id: 'step-003-1',
        order: 0,
        type: 'email',
        delayDays: 0,
        subject: 'Thanks for the demo - {{firstName}}',
        bodyTemplate:
          'Hi {{firstName}},\n\nThanks for the walkthrough. Here is a short recap of what we covered and the timeline we discussed.\n\nBest,\nDavid',
      },
      { id: 'step-003-2', order: 1, type: 'wait', delayDays: 2 },
      {
        id: 'step-003-3',
        order: 2,
        type: 'email',
        delayDays: 0,
        subject: 'Materials you asked for - {{company}}',
        bodyTemplate:
          'Hi {{firstName}},\n\nSharing the references and security overview we promised. Happy to go deeper on any section.\n\nBest,\nDavid',
      },
      {
        id: 'step-003-4',
        order: 3,
        type: 'call_task',
        delayDays: 5,
        taskDescription: 'Call to confirm evaluation criteria, security review, and economic buyer.',
      },
    ],
    createdBy: 'u1',
    createdAt: '2025-01-20T09:00:00Z',
    isActive: true,
    enrolledCount: 0,
  },
  {
    id: 'seq-004',
    name: 'Land and expand',
    description: 'Warm outreach to existing customers: value recap, social touch, then a commercial expansion ask.',
    steps: [
      {
        id: 'step-004-1',
        order: 0,
        type: 'email',
        delayDays: 0,
        subject: 'Ideas for {{company}} this quarter',
        bodyTemplate:
          'Hi {{firstName}},\n\nBased on how your team is using the product, here are three concrete wins we can unlock without a disruptive migration.\n\nBest,\nDavid',
      },
      {
        id: 'step-004-2',
        order: 1,
        type: 'linkedin_task',
        delayDays: 3,
        taskDescription: 'Light-touch LinkedIn engagement with your champion (comment or DM).',
      },
      {
        id: 'step-004-3',
        order: 2,
        type: 'email',
        delayDays: 7,
        subject: 'Expansion options - {{firstName}}',
        bodyTemplate:
          'Hi {{firstName}},\n\nIf you are open to more seats or add-on modules, I can share options aligned to your renewal window.\n\nBest,\nDavid',
      },
    ],
    createdBy: 'u1',
    createdAt: '2025-01-22T09:00:00Z',
    isActive: true,
    enrolledCount: 0,
  },
  {
    id: 'seq-005',
    name: 'Meeting no-show recovery',
    description: 'Polite recovery after a missed meeting: reschedule, a value ping, then phone outreach.',
    steps: [
      {
        id: 'step-005-1',
        order: 0,
        type: 'email',
        delayDays: 0,
        subject: 'Missed you today - want to reschedule?',
        bodyTemplate:
          'Hi {{firstName}},\n\nWe had time blocked and I did not see you join. Here is my calendar link - pick anything that works.\n\nBest,\nDavid',
      },
      {
        id: 'step-005-2',
        order: 1,
        type: 'email',
        delayDays: 2,
        subject: 'One metric worth 5 minutes - {{firstName}}',
        bodyTemplate:
          'Hi {{firstName}},\n\nQuick note with one benchmark peers in your space track closely. Happy to unpack it live.\n\nBest,\nDavid',
      },
      {
        id: 'step-005-3',
        order: 2,
        type: 'call_task',
        delayDays: 1,
        taskDescription: 'Call to confirm priorities and lock a new executive slot.',
      },
    ],
    createdBy: 'u1',
    createdAt: '2025-01-24T09:00:00Z',
    isActive: true,
    enrolledCount: 0,
  },
]

export function getBuiltInSequenceById(id: SeedSequenceId): EmailSequence | undefined {
  return seedSequences.find((s) => s.id === id)
}

// ─── Store interface ─────────────────────────────────────────────────────────

export interface SequencesStore {
  sequences: EmailSequence[]
  enrollments: SequenceEnrollment[]
  isLoading: boolean
  error: string | null
  fetchSequences: () => Promise<void>
  createSequence: (data: Omit<EmailSequence, 'id' | 'createdAt' | 'enrolledCount'>) => EmailSequence
  updateSequence: (id: string, updates: Partial<EmailSequence>) => void
  deleteSequence: (id: string) => void
  enrollContact: (sequenceId: string, contactId: string, contactName: string) => SequenceEnrollment
  pauseEnrollment: (enrollmentId: string) => void
  resumeEnrollment: (enrollmentId: string) => void
  completeEnrollment: (enrollmentId: string) => void
  unenrollContact: (enrollmentId: string) => void
  getEnrollmentsForContact: (contactId: string) => SequenceEnrollment[]
  getEnrollmentsForSequence: (sequenceId: string) => SequenceEnrollment[]
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useSequencesStore = create<SequencesStore>()((set, get) => ({
  sequences: seedSequences,
  enrollments: [],
  isLoading: false,
  error: null,

  fetchSequences: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ sequences: seedSequences, enrollments: [] })
      return
    }
    set({ isLoading: true, error: null })
    try {
      const [seqRes, enrRes] = await Promise.all([
        (supabase as any).from('email_sequences').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('sequence_enrollments').select('*').order('enrolled_at', { ascending: false }),
      ])
      if (seqRes.error) throw seqRes.error
      if (enrRes.error) throw enrRes.error
      const sequences: EmailSequence[] = (seqRes.data ?? []).map((r: any) => ({
        id: r.id, name: r.name, description: r.description,
        steps: r.steps ?? [], createdBy: r.created_by, createdAt: r.created_at,
        isActive: r.is_active, enrolledCount: r.enrolled_count ?? 0,
      }))
      const enrollments: SequenceEnrollment[] = (enrRes.data ?? []).map((r: any) => ({
        id: r.id, sequenceId: r.sequence_id, contactId: r.contact_id,
        contactName: r.contact_name, currentStep: r.current_step, status: r.status,
        enrolledAt: r.enrolled_at, nextStepAt: r.next_step_at, completedAt: r.completed_at,
      }))
      set({ sequences, enrollments, isLoading: false })
    } catch (e: any) {
      set({ error: e.message, isLoading: false })
    }
  },

  createSequence: (data) => {
    const now = new Date().toISOString()
    const newSeq: EmailSequence = { ...data, id: uuidv4(), createdAt: now, enrolledCount: 0 }
    set((s) => ({ sequences: [...s.sequences, newSeq] }))
    if (isSupabaseConfigured && supabase) {
      ;(supabase as any).from('email_sequences').insert({
        id: newSeq.id, name: newSeq.name, description: newSeq.description,
        steps: newSeq.steps, created_by: newSeq.createdBy, is_active: newSeq.isActive,
        enrolled_count: 0, organization_id: getOrgId(),
      }).then(({ error }: any) => { if (error) devConsole.error('[sequencesStore] insert error', error) })
    }
    return newSeq
  },

  updateSequence: (id, updates) => {
    set((s) => ({ sequences: s.sequences.map((seq) => seq.id === id ? { ...seq, ...updates } : seq) }))
    if (isSupabaseConfigured && supabase) {
      const row: Record<string, unknown> = {}
      if (updates.name !== undefined) row.name = updates.name
      if (updates.description !== undefined) row.description = updates.description
      if (updates.steps !== undefined) row.steps = updates.steps
      if (updates.isActive !== undefined) row.is_active = updates.isActive
      if (updates.enrolledCount !== undefined) row.enrolled_count = updates.enrolledCount
      ;(supabase as any).from('email_sequences').update(row).eq('id', id)
        .then(({ error }: any) => { if (error) devConsole.error('[sequencesStore] update error', error) })
    }
  },

  deleteSequence: (id) => {
    set((s) => ({
      sequences: s.sequences.filter((seq) => seq.id !== id),
      enrollments: s.enrollments.filter((e) => e.sequenceId !== id),
    }))
    if (isSupabaseConfigured && supabase) {
      sbDelete('email_sequences', id).catch((e) => devConsole.error('[sequencesStore] delete error', e))
    }
  },

  enrollContact: (sequenceId, contactId, contactName) => {
    const sequence = get().sequences.find((s) => s.id === sequenceId)
    const now = new Date().toISOString()
    const firstStep = sequence?.steps.find((s) => s.order === 0)
    let nextStepAt: string | undefined
    if (firstStep) {
      const d = new Date()
      d.setDate(d.getDate() + (firstStep.delayDays ?? 0))
      nextStepAt = d.toISOString()
    }
    const enrollment: SequenceEnrollment = {
      id: uuidv4(), sequenceId, contactId, contactName,
      currentStep: 0, status: 'active', enrolledAt: now, nextStepAt,
    }
    set((s) => ({
      enrollments: [...s.enrollments, enrollment],
      sequences: s.sequences.map((seq) => seq.id === sequenceId ? { ...seq, enrolledCount: seq.enrolledCount + 1 } : seq),
    }))
    if (isSupabaseConfigured && supabase) {
      ;(supabase as any).from('sequence_enrollments').insert({
        id: enrollment.id, sequence_id: sequenceId, contact_id: contactId,
        contact_name: contactName, current_step: 0, status: 'active',
        enrolled_at: now, next_step_at: nextStepAt, organization_id: getOrgId(),
      }).then(({ error }: any) => { if (error) devConsole.error('[sequencesStore] enroll error', error) })
    }
    return enrollment
  },

  pauseEnrollment: (enrollmentId) => {
    set((s) => ({ enrollments: s.enrollments.map((e) => e.id === enrollmentId ? { ...e, status: 'paused' as EnrollmentStatus } : e) }))
    if (isSupabaseConfigured && supabase) {
      ;(supabase as any).from('sequence_enrollments').update({ status: 'paused' }).eq('id', enrollmentId)
        .then(({ error }: any) => { if (error) devConsole.error('[sequencesStore] pause error', error) })
    }
  },

  resumeEnrollment: (enrollmentId) => {
    set((s) => ({ enrollments: s.enrollments.map((e) => e.id === enrollmentId ? { ...e, status: 'active' as EnrollmentStatus } : e) }))
    if (isSupabaseConfigured && supabase) {
      ;(supabase as any).from('sequence_enrollments').update({ status: 'active' }).eq('id', enrollmentId)
        .then(({ error }: any) => { if (error) devConsole.error('[sequencesStore] resume error', error) })
    }
  },

  completeEnrollment: (enrollmentId) => {
    const now = new Date().toISOString()
    set((s) => ({ enrollments: s.enrollments.map((e) => e.id === enrollmentId ? { ...e, status: 'completed' as EnrollmentStatus, completedAt: now } : e) }))
    if (isSupabaseConfigured && supabase) {
      ;(supabase as any).from('sequence_enrollments').update({ status: 'completed', completed_at: now }).eq('id', enrollmentId)
        .then(({ error }: any) => { if (error) devConsole.error('[sequencesStore] complete error', error) })
    }
  },

  unenrollContact: (enrollmentId) => {
    set((s) => ({ enrollments: s.enrollments.filter((e) => e.id !== enrollmentId) }))
    if (isSupabaseConfigured && supabase) {
      sbDelete('sequence_enrollments', enrollmentId).catch((e) => devConsole.error('[sequencesStore] unenroll error', e))
    }
  },

  getEnrollmentsForContact: (contactId) => get().enrollments.filter((e) => e.contactId === contactId),
  getEnrollmentsForSequence: (sequenceId) => get().enrollments.filter((e) => e.sequenceId === sequenceId),
}))
