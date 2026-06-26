import { create } from 'zustand'
import type { Lead, LeadLifecycleStage } from '../types'
import { api } from '../lib/api'
import { useContactsStore } from './contactsStore'
import { useCompaniesStore } from './companiesStore'
import { useAuditStore } from './auditStore'
import { useNotificationsStore } from './notificationsStore'
import { useAuthStore } from './authStore'
import { getTranslations } from '../i18n'
import { normalizeIndustryValue } from '../lib/industries'
import { toast } from './toastStore'
import type { ContactSource } from '../types'

const HOT_THRESHOLD = 70
const HOT_SIGNAL_WINDOW_DAYS = 30
const NON_SCORING_EVENT_TYPES = new Set(['manual_score_adjustment', 'manual_recompute', 'score_recomputed'])
const ACTIVITY_EVENT_WEIGHTS: Record<string, number> = {
  email_open: 8,
  email_opened: 8,
  email_click: 12,
  email_clicked: 12,
  email_reply: 20,
  email_replied: 20,
  email_sent: 4,
  call_completed: 15,
  meeting_booked: 18,
  meeting_completed: 18,
  meeting_scheduled: 9,
  note_added: 5,
  website_visit: 6,
  form_submitted: 10,
  deal_created: 14,
}

function daysSince(isoDate?: string): number {
  if (!isoDate) return Number.POSITIVE_INFINITY
  const ts = new Date(isoDate).getTime()
  if (Number.isNaN(ts)) return Number.POSITIVE_INFINITY
  return (Date.now() - ts) / 86_400_000
}

function recencyDecayWeight(eventCreatedAt?: string): number {
  const ageDays = daysSince(eventCreatedAt)
  if (ageDays <= 7) return 1
  if (ageDays <= 30) return 0.7
  if (ageDays <= 90) return 0.4
  return 0.2
}

type ApiLead = Record<string, unknown>

function rowToLead(row: ApiLead): Lead {
  return {
    id: (row.id ?? row.id) as string,
    firstName: ((row.firstName ?? row.first_name) as string) ?? '',
    lastName: ((row.lastName ?? row.last_name) as string) ?? '',
    email: (row.email as string) ?? '',
    phone: ((row.phone) as string) ?? undefined,
    companyName: ((row.companyName ?? row.company_name) as string) ?? undefined,
    jobTitle: ((row.jobTitle ?? row.job_title) as string) ?? undefined,
    source: (row.source as string) ?? 'website',
    status: (row.status as Lead['status']) ?? 'open',
    lifecycleStage: ((row.lifecycleStage ?? row.lifecycle_stage) as LeadLifecycleStage) ?? 'lead',
    score: (row.score as number) ?? 0,
    assignedTo: ((row.assignedTo ?? row.assigned_to) as string) ?? undefined,
    ownerUserId: ((row.ownerUserId ?? row.owner_user_id) as string) ?? undefined,
    tags: (typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags ?? [])) as string[],
    notes: (row.notes as string) ?? undefined,
    createdAt: ((row.createdAt ?? row.created_at) as string) ?? new Date().toISOString(),
    updatedAt: ((row.updatedAt ?? row.updated_at) as string) ?? new Date().toISOString(),
    lastEngagedAt: ((row.lastEngagedAt ?? row.last_engaged_at) as string) ?? undefined,
    convertedContactId: ((row.convertedContactId ?? row.converted_contact_id) as string) ?? undefined,
    convertedCompanyId: ((row.convertedCompanyId ?? row.converted_company_id) as string) ?? undefined,
    convertedDealId: ((row.convertedDealId ?? row.converted_deal_id) as string) ?? undefined,
  }
}

export interface LeadsState {
  leads: Lead[]
  leadEventsByLeadId: Record<string, Array<{ id: string; eventType: string; metadata: Record<string, unknown>; createdAt: string }>>
  scoringRules: Array<{ id: string; key: string; points: number; isEnabled: boolean }>
  scoreInsightsByLeadId: Record<string, {
    confidence: 'high' | 'medium' | 'low'
    baselineSignals: number
    eventScore: number
    recentSignals: number
    computedScore?: number
    persistedScore?: number
    hasRecentEngagement?: boolean
  }>
  scoreHistoryByLeadId: Record<string, Array<{ score: number; createdAt: string }>>
  isLoading: boolean
  error: string | null
  search: string
  stageFilter: '' | LeadLifecycleStage
  scoreFilter: '' | 'hot' | 'warm' | 'cold'

  fetchLeads: () => Promise<void>
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'score' | 'status' | 'lifecycleStage'> & {
    lifecycleStage?: LeadLifecycleStage
    score?: number
    status?: Lead['status']
  }) => Lead
  updateLead: (id: string, updates: Partial<Lead>) => void
  deleteLead: (id: string) => Promise<boolean>
  setSearch: (value: string) => void
  setStageFilter: (value: LeadsState['stageFilter']) => void
  setScoreFilter: (value: LeadsState['scoreFilter']) => void
  getFilteredLeads: () => Lead[]
  fetchScoringRules: () => Promise<void>
  updateScoringRule: (ruleId: string, patch: { points?: number; isEnabled?: boolean }) => Promise<void>
  fetchLeadEvents: (leadId: string) => Promise<void>
  fetchScoreInsight: (leadId: string) => Promise<void>
  fetchScoreHistory: (leadId: string) => Promise<void>
  runScheduledScoreMaintenance: () => Promise<void>
  addLeadEvent: (
    leadId: string,
    eventType: string,
    metadata?: Record<string, unknown>,
    options?: { skipRecompute?: boolean },
  ) => Promise<void>
  recomputeLeadScore: (leadId: string, options?: { allowDemotion?: boolean; reason?: string }) => Promise<void>
  convertLeadToContact: (leadId: string) => Promise<boolean>
}

export const useLeadsStore = create<LeadsState>()((set, get) => ({
  leads: [],
  leadEventsByLeadId: {},
  scoringRules: [],
  scoreInsightsByLeadId: {},
  scoreHistoryByLeadId: {},
  isLoading: false,
  error: null,
  search: '',
  stageFilter: '',
  scoreFilter: '',

  fetchLeads: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.get<ApiLead[]>('/leads')
      set({ leads: (data ?? []).map(rowToLead), isLoading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  addLead: (leadData) => {
    const now = new Date().toISOString()
    const optimistic: Lead = {
      id: crypto.randomUUID(),
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      email: leadData.email,
      phone: leadData.phone,
      companyName: leadData.companyName,
      jobTitle: leadData.jobTitle,
      source: leadData.source,
      status: leadData.status ?? 'open',
      lifecycleStage: leadData.lifecycleStage ?? 'lead',
      score: leadData.score ?? 0,
      assignedTo: leadData.assignedTo,
      ownerUserId: leadData.ownerUserId,
      tags: leadData.tags,
      notes: leadData.notes,
      createdAt: now,
      updatedAt: now,
      lastEngagedAt: leadData.lastEngagedAt,
      convertedContactId: undefined,
      convertedCompanyId: undefined,
      convertedDealId: undefined,
    }
    set((s) => ({ leads: [optimistic, ...s.leads] }))
    api.post<ApiLead>('/leads', {
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      email: leadData.email,
      phone: leadData.phone,
      companyName: leadData.companyName,
      jobTitle: leadData.jobTitle,
      source: leadData.source,
      status: leadData.status ?? 'open',
      lifecycleStage: leadData.lifecycleStage ?? 'lead',
      score: leadData.score ?? 0,
      assignedTo: leadData.assignedTo,
      ownerUserId: leadData.ownerUserId,
      tags: leadData.tags,
      notes: leadData.notes,
      lastEngagedAt: leadData.lastEngagedAt,
    }).then((realLead) => {
      set((s) => ({ leads: s.leads.map((l) => (l.id === optimistic.id ? rowToLead(realLead) : l)) }))
    }).catch((err: Error) => {
      set((s) => ({ leads: s.leads.filter((l) => l.id !== optimistic.id), error: err.message }))
      toast.error(err.message)
    })
    return optimistic
  },

  updateLead: (id, updates) => {
    const prev = get().leads
    set((s) => ({
      leads: s.leads.map((lead) => (lead.id === id ? { ...lead, ...updates, updatedAt: new Date().toISOString() } : lead)),
    }))
    // Roll back on failure so a rejected change (e.g. a lead conversion the server
    // refuses) doesn't leave the row falsely marked converted/updated.
    api.patch(`/leads/${id}`, updates).catch((err: Error) => {
      set({ leads: prev, error: err.message })
    })
  },

  deleteLead: async (id) => {
    set((s) => ({ leads: s.leads.filter((lead) => lead.id !== id) }))
    try {
      await api.delete(`/leads/${id}`)
      return true
    } catch (err: unknown) {
      toast.error(`${getTranslations().leads.deleteFailed} ${(err as Error).message}`)
      await get().fetchLeads()
      return false
    }
  },

  setSearch: (value) => set({ search: value }),
  setStageFilter: (value) => set({ stageFilter: value }),
  setScoreFilter: (value) => set({ scoreFilter: value }),

  getFilteredLeads: () => {
    const { leads, search, stageFilter, scoreFilter } = get()
    return leads.filter((lead) => {
      const query = search.trim().toLowerCase()
      if (query) {
        const haystack = `${lead.firstName} ${lead.lastName} ${lead.email} ${lead.companyName ?? ''}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      if (stageFilter && lead.lifecycleStage !== stageFilter) return false
      if (scoreFilter === 'hot' && lead.score < 70) return false
      if (scoreFilter === 'warm' && (lead.score < 40 || lead.score >= 70)) return false
      if (scoreFilter === 'cold' && lead.score >= 40) return false
      return true
    }).sort((a, b) => b.score - a.score)
  },

  fetchScoringRules: async () => {
    try {
      const data = await api.get<Array<{ id: string; key: string; points: number; isEnabled: boolean; is_enabled: boolean }>>('/leads/scoring-rules')
      set({
        scoringRules: (data ?? []).map((row) => ({
          id: row.id,
          key: row.key ?? '',
          points: row.points ?? 0,
          isEnabled: row.isEnabled ?? row.is_enabled ?? true,
        })),
      })
    } catch (e: unknown) {
      set({ error: (e as Error).message })
    }
  },

  updateScoringRule: async (ruleId, patch) => {
    set((s) => ({
      scoringRules: s.scoringRules.map((rule) => (
        rule.id === ruleId ? { ...rule, ...patch } : rule
      )),
    }))
    try {
      await api.patch(`/leads/scoring-rules/${ruleId}`, patch)
    } catch (e: unknown) {
      set({ error: (e as Error).message })
    }
  },

  fetchLeadEvents: async (leadId) => {
    try {
      const data = await api.get<Array<{ id: string; eventType?: string; event_type?: string; metadata: Record<string, unknown>; createdAt?: string; created_at?: string }>>(`/leads/${leadId}/events`)
      set((s) => ({
        leadEventsByLeadId: {
          ...s.leadEventsByLeadId,
          [leadId]: (data ?? []).map((row) => ({
            id: row.id,
            eventType: (row.eventType ?? row.event_type) as string ?? 'activity',
            metadata: (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata ?? {})) as Record<string, unknown>,
            createdAt: (row.createdAt ?? row.created_at) as string ?? new Date().toISOString(),
          })),
        },
      }))
    } catch (e: unknown) {
      set({ error: (e as Error).message })
    }
  },

  fetchScoreInsight: async (leadId) => {
    try {
      const snapshots = await api.get<Array<{ score: number; reason: string; createdAt?: string; created_at?: string }>>(`/leads/${leadId}/score-snapshots`)
      const latest = snapshots?.[snapshots.length - 1]
      if (!latest?.reason) return
      const parsed = JSON.parse(latest.reason) as {
        computedScore?: number
        persistedScore?: number
        confidence?: { recentSignals?: number; hasRecentEngagement?: boolean }
        factors?: {
          baselineSignals?: { hasLastEngagedAt?: boolean; hasCompany?: boolean; hasJobTitle?: boolean; hotTags?: string[] }
          eventScore?: number
        }
      }
      const baseline = parsed.factors?.baselineSignals
      const baselineSignals = Number(Boolean(baseline?.hasLastEngagedAt))
        + Number(Boolean(baseline?.hasCompany))
        + Number(Boolean(baseline?.hasJobTitle))
        + Number((baseline?.hotTags?.length ?? 0) > 0)
      const recentSignals = parsed.confidence?.recentSignals ?? 0
      const hasRecentEngagement = Boolean(parsed.confidence?.hasRecentEngagement)
      const confidence: 'high' | 'medium' | 'low' = recentSignals >= 3 || (recentSignals >= 1 && hasRecentEngagement)
        ? 'high'
        : recentSignals >= 1 || hasRecentEngagement
          ? 'medium'
          : 'low'
      set((s) => ({
        scoreInsightsByLeadId: {
          ...s.scoreInsightsByLeadId,
          [leadId]: {
            confidence,
            baselineSignals,
            eventScore: Math.round(parsed.factors?.eventScore ?? 0),
            recentSignals,
            computedScore: parsed.computedScore,
            persistedScore: parsed.persistedScore,
            hasRecentEngagement,
          },
        },
      }))
    } catch {
      // snapshots may use plain-string reason format
    }
  },

  fetchScoreHistory: async (leadId) => {
    try {
      const data = await api.get<Array<{ score: number; createdAt?: string; created_at?: string }>>(`/leads/${leadId}/score-snapshots`)
      set((s) => ({
        scoreHistoryByLeadId: {
          ...s.scoreHistoryByLeadId,
          [leadId]: (data ?? []).map((row) => ({
            score: row.score ?? 0,
            createdAt: (row.createdAt ?? row.created_at) as string,
          })),
        },
      }))
    } catch {
      // ignore
    }
  },

  runScheduledScoreMaintenance: async () => {
    const leads = get().leads
    if (!leads.length) return
    const orgId = useAuthStore.getState().currentUser?.organizationId ?? ''
    const checkpointKey = `crm_lead_decay_checkpoint_${orgId}`
    const lastRun = Number(localStorage.getItem(checkpointKey) ?? '0')
    const now = Date.now()
    if (now - lastRun < 6 * 60 * 60 * 1000) return

    const managers = useAuthStore.getState().users.filter((u) => u.role === 'admin' || u.role === 'manager')
    for (const lead of leads) {
      const prevScore = lead.score
      await get().recomputeLeadScore(lead.id, { allowDemotion: true, reason: 'scheduled_decay' })
      const nextLead = get().leads.find((l) => l.id === lead.id)
      const nextScore = nextLead?.score ?? prevScore
      const dropped = prevScore - nextScore
      if (dropped >= 10 || (prevScore >= HOT_THRESHOLD && nextScore < HOT_THRESHOLD)) {
        for (const manager of managers) {
          useNotificationsStore.getState().notify(
            'system',
            'Lead confidence dropped',
            `${lead.firstName} ${lead.lastName} dropped from ${prevScore} to ${nextScore}.`,
            { entityType: 'lead', entityId: lead.id, userId: manager.id },
          )
        }
      }
    }
    localStorage.setItem(checkpointKey, String(now))
  },

  addLeadEvent: async (leadId, eventType, metadata = {}, options = {}) => {
    const now = new Date().toISOString()
    try {
      const data = await api.post<{ id: string; event_type: string; metadata: Record<string, unknown>; created_at: string }>(
        `/leads/${leadId}/events`,
        { eventType, metadata },
      )
      set((s) => ({
        leadEventsByLeadId: {
          ...s.leadEventsByLeadId,
          [leadId]: [
            {
              id: data.id,
              eventType: data.event_type ?? eventType,
              metadata: data.metadata ?? metadata,
              createdAt: data.created_at ?? now,
            },
            ...(s.leadEventsByLeadId[leadId] ?? []),
          ],
        },
      }))
    } catch {
      // optimistically add locally so UI stays consistent
      set((s) => ({
        leadEventsByLeadId: {
          ...s.leadEventsByLeadId,
          [leadId]: [
            { id: crypto.randomUUID(), eventType, metadata, createdAt: now },
            ...(s.leadEventsByLeadId[leadId] ?? []),
          ],
        },
      }))
    }
    if (!options.skipRecompute) {
      await get().recomputeLeadScore(leadId, { reason: `event_ingested:${eventType}` })
    }
  },

  recomputeLeadScore: async (leadId, options = {}) => {
    const lead = get().leads.find((item) => item.id === leadId)
    if (!lead) return

    if (get().scoringRules.length === 0) {
      await get().fetchScoringRules()
    }

    const localEvents = get().leadEventsByLeadId[leadId] ?? []
    let eventScore = 0
    let recentSignalCount = 0
    const eventsByType: Record<string, Array<{ createdAt?: string }>> = {}

    for (const event of localEvents) {
      if (!event.eventType || NON_SCORING_EVENT_TYPES.has(event.eventType)) continue
      if (!eventsByType[event.eventType]) eventsByType[event.eventType] = []
      eventsByType[event.eventType].push({ createdAt: event.createdAt })
    }

    const enabledRules = get().scoringRules.filter((r) => r.isEnabled)
    for (const rule of enabledRules) {
      for (const event of localEvents) {
        if (event.eventType !== rule.key || NON_SCORING_EVENT_TYPES.has(event.eventType)) continue
        if (daysSince(event.createdAt) <= HOT_SIGNAL_WINDOW_DAYS) recentSignalCount += 1
      }
    }

    if (enabledRules.length === 0) {
      for (const event of localEvents) {
        if (!event.eventType || NON_SCORING_EVENT_TYPES.has(event.eventType)) continue
        if (daysSince(event.createdAt) <= HOT_SIGNAL_WINDOW_DAYS) recentSignalCount += 1
      }
    }

    for (const [eventType, events] of Object.entries(eventsByType)) {
      const baseWeight = ACTIVITY_EVENT_WEIGHTS[eventType] ?? 2
      for (const event of events) {
        eventScore += baseWeight * recencyDecayWeight(event.createdAt)
      }
    }

    let computedScore = Math.max(0, Math.min(100, Math.round(eventScore)))
    if (computedScore >= HOT_THRESHOLD && recentSignalCount === 0 && daysSince(lead.lastEngagedAt) > HOT_SIGNAL_WINDOW_DAYS) {
      computedScore = HOT_THRESHOLD - 1
    }

    const allowDemotion = options.allowDemotion ?? false
    const nextScore = allowDemotion ? computedScore : Math.max(lead.score ?? 0, computedScore)
    get().updateLead(leadId, { score: nextScore })

    if (options.reason === 'manual_recompute') {
      useAuditStore.getState().logAction(
        'lead_score_recomputed',
        'lead',
        leadId,
        `${lead.firstName} ${lead.lastName}`.trim(),
        getTranslations().auditMessages.leadScoreRecomputed
          .replace('{from}', String(lead.score))
          .replace('{to}', String(nextScore)),
      )
    }

    const reasonPayload = {
      reason: options.reason ?? 'manual_recompute',
      computedScore,
      persistedScore: nextScore,
      allowDemotion,
      confidence: {
        threshold: HOT_THRESHOLD,
        recentSignalWindowDays: HOT_SIGNAL_WINDOW_DAYS,
        recentSignals: recentSignalCount,
        hasRecentEngagement: daysSince(lead.lastEngagedAt) <= HOT_SIGNAL_WINDOW_DAYS,
      },
      factors: { baselineSignals: {}, eventScore: Math.round(eventScore) },
    }
    api.post(`/leads/${leadId}/score-snapshots`, { score: nextScore, reason: JSON.stringify(reasonPayload) }).catch(() => {})
  },

  convertLeadToContact: async (leadId) => {
    const lead = get().leads.find((item) => item.id === leadId)
    if (!lead) return false

    let companyId = ''
    if (lead.companyName?.trim()) {
      const existing = useCompaniesStore.getState().companies.find(
        (c) => c.name.toLowerCase() === lead.companyName!.toLowerCase(),
      )
      if (existing) {
        companyId = existing.id
      } else {
        const company = useCompaniesStore.getState().addCompany({
          name: lead.companyName,
          domain: '',
          industry: normalizeIndustryValue('other'),
          size: '0-10',
          country: '',
          city: '',
          website: '',
          phone: '',
          status: 'prospect',
          revenue: 0,
          contacts: [],
          deals: [],
          tags: [],
          notes: '',
        })
        companyId = company.id
      }
    }

    const contact = useContactsStore.getState().addContact({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone ?? '',
      jobTitle: lead.jobTitle ?? '',
      companyId,
      status: 'prospect',
      source: ((lead.source as string) ?? 'other') as ContactSource,
      tags: lead.tags,
      assignedTo: lead.assignedTo ?? '',
      lastContactedAt: '',
      notes: lead.notes ?? '',
      linkedDeals: [],
    })

    get().updateLead(leadId, {
      status: 'converted',
      lifecycleStage: 'customer',
      convertedContactId: contact.id,
      convertedCompanyId: companyId || undefined,
    })
    await get().addLeadEvent(leadId, 'note_added', { action: 'lead_converted' })
    return true
  },
}))
