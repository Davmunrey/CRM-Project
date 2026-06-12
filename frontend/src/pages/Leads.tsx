import { useEffect, useMemo, useRef, useState } from 'react'
import { AtSign, CircleHelp, Clock3, Flame, FunnelPlus, Plus, RefreshCw, Trash2, UserPlus } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useLeadsStore } from '../store/leadsStore'
import { useAuthStore } from '../store/authStore'
import { useTranslations } from '../i18n'
import type { LeadLifecycleStage } from '../types'
import { formatDateTime } from '../utils/formatters'
import { toast } from '../store/toastStore'
import { PageHeader } from '../components/ui/PageHeader'
import { Toolbar } from '../components/ui/Toolbar'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { UpdatesPanel } from '../components/shared/UpdatesPanel'

const STAGES: LeadLifecycleStage[] = ['subscriber', 'lead', 'mql', 'sql', 'opportunity', 'customer']

function HintPopover({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({
      top: rect.bottom + 6,
      left: Math.max(8, rect.right - 256),
    })
  }

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: computes popover position from DOM measurements when open state changes
    updatePosition()
    const onLayoutChange = () => updatePosition()
    window.addEventListener('scroll', onLayoutChange, true)
    window.addEventListener('resize', onLayoutChange)
    return () => {
      window.removeEventListener('scroll', onLayoutChange, true)
      window.removeEventListener('resize', onLayoutChange)
    }
  }, [open])

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((value) => {
            const next = !value
            if (next) updatePosition()
            return next
          })
        }}
        onMouseEnter={() => {
          updatePosition()
          setOpen(true)
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => {
          updatePosition()
          setOpen(true)
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120)
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-fg/14 text-fg-muted hover:text-fg hover:border-fg/30 transition-colors"
        aria-label={text}
        title={text}
      >
        <CircleHelp size={10} />
      </button>
      {open && position && createPortal(
        <div
          className="fixed z-[80] w-64 rounded-lg border border-fg/10 bg-surface-1 p-2 text-xs leading-4 text-fg-muted shadow-xl"
          style={{ top: position.top, left: position.left }}
        >
          {text}
        </div>,
        document.body
      )}
    </div>
  )
}

export function Leads() {
  const t = useTranslations()
  const isLoading = useLeadsStore((s) => s.isLoading)
  const error = useLeadsStore((s) => s.error)
  const search = useLeadsStore((s) => s.search)
  const stageFilter = useLeadsStore((s) => s.stageFilter)
  const scoreFilter = useLeadsStore((s) => s.scoreFilter)
  const fetchLeads = useLeadsStore((s) => s.fetchLeads)
  const addLead = useLeadsStore((s) => s.addLead)
  const deleteLead = useLeadsStore((s) => s.deleteLead)
  const setSearch = useLeadsStore((s) => s.setSearch)
  const setStageFilter = useLeadsStore((s) => s.setStageFilter)
  const setScoreFilter = useLeadsStore((s) => s.setScoreFilter)
  const getFilteredLeads = useLeadsStore((s) => s.getFilteredLeads)
  const leadEventsByLeadId = useLeadsStore((s) => s.leadEventsByLeadId)
  const scoreInsightsByLeadId = useLeadsStore((s) => s.scoreInsightsByLeadId)
  const scoreHistoryByLeadId = useLeadsStore((s) => s.scoreHistoryByLeadId)
  const fetchLeadEvents = useLeadsStore((s) => s.fetchLeadEvents)
  const fetchScoreInsight = useLeadsStore((s) => s.fetchScoreInsight)
  const fetchScoreHistory = useLeadsStore((s) => s.fetchScoreHistory)
  const convertLeadToContact = useLeadsStore((s) => s.convertLeadToContact)
  const orgUsers = useAuthStore((s) => s.users)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)
  const [expandedScoreLeadId, setExpandedScoreLeadId] = useState<string | null>(null)
  const [expandedUpdatesLeadId, setExpandedUpdatesLeadId] = useState<string | null>(null)

  const filtered = useMemo(() => getFilteredLeads(), [getFilteredLeads])
  const stageLabels = t.leads.stageLabels

  const hotCount = filtered.filter((lead) => lead.score >= 70).length
  useEffect(() => {
    filtered.slice(0, 15).forEach((lead) => {
      fetchScoreInsight(lead.id)
    })
  }, [filtered, fetchScoreInsight])

  return (
    <div className="crm-page space-y-5">
      <PageHeader
        showTitle={false}
        title={t.nav.leads}
        subtitle={`${filtered.length} ${t.leads.title.toLowerCase()} · ${hotCount} ${t.leads.hot.toLowerCase()}`}
        actions={
          <>
            <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => { fetchLeads() }}>
              {t.leads.refresh}
            </Button>
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowQuickAdd((v) => !v)}>
              {t.leads.addLead}
            </Button>
          </>
        }
      />

      {showQuickAdd && (
        <div className="glass rounded-2xl border-fg/10 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t.leads.firstName} className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg outline-none" />
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t.leads.lastName} className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg outline-none" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.common.email} className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg outline-none" />
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={t.leads.company} className="bg-surface-2 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg outline-none" />
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                if (!firstName || !lastName || !email) return
                addLead({
                  firstName,
                  lastName,
                  email,
                  companyName,
                  source: 'website',
                  assignedTo: orgUsers[0]?.id,
                  ownerUserId: orgUsers[0]?.id,
                  tags: [],
                })
                setFirstName('')
                setLastName('')
                setEmail('')
                setCompanyName('')
                setShowQuickAdd(false)
              }}
              className="text-xs px-3 py-2 rounded-lg bg-accent-500/20 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25"
            >
              {t.leads.createLead}
            </button>
          </div>
        </div>
      )}

      <Toolbar panel>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 w-full">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.leads.searchPlaceholder}
          className="md:col-span-2 bg-surface-2 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg outline-none"
        />
        <Select
          ariaLabel={t.leads.allStages}
          value={stageFilter}
          onChange={(e) => setStageFilter((e.target.value as LeadLifecycleStage) || '')}
          options={[
            { value: '', label: t.leads.allStages },
            ...STAGES.map((stage) => ({ value: stage, label: stageLabels[stage] })),
          ]}
          listMaxHeightClass="max-h-56"
        />
        <Select
          ariaLabel={t.leads.allScores}
          value={scoreFilter}
          onChange={(e) => setScoreFilter((e.target.value as 'hot' | 'warm' | 'cold') || '')}
          options={[
            { value: '', label: t.leads.allScores },
            { value: 'hot', label: `${t.leads.hot} (70+)` },
            { value: 'warm', label: `${t.leads.warm} (40-69)` },
            { value: 'cold', label: `${t.leads.cold} (<40)` },
          ]}
          listMaxHeightClass="max-h-40"
        />
      </div>
      </Toolbar>

      <div className="glass rounded-2xl border-fg/8 overflow-hidden">
        <div className="px-4 py-3 border-b border-fg/6 text-xs text-fg-muted uppercase tracking-wider">{t.leads.leadInbox}</div>
        {isLoading && (
          <div className="px-4 py-4 space-y-4" aria-busy="true" aria-label={t.leads.loadingLeads}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <div className="px-4 py-5 text-sm text-danger">{error}</div>}
        {!isLoading && !error && filtered.length === 0 && (
          <EmptyState
            icon={<FunnelPlus size={28} strokeWidth={1.75} />}
            title={t.leads.noLeads}
            description={t.leads.emptyInboxHint}
            density="compact"
          />
        )}
        <div className="divide-y divide-border-subtle">
          {filtered.map((lead) => (
            <div key={lead.id}>
              <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-fg/8 flex items-center justify-center text-xs font-bold text-fg-muted">
                {`${lead.firstName.charAt(0)}${lead.lastName.charAt(0)}`.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-fg truncate">{lead.firstName} {lead.lastName}</p>
                <p className="text-xs text-fg-subtle truncate">{lead.email}{lead.companyName ? ` • ${lead.companyName}` : ''}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                lead.score >= 70 ? 'bg-danger/15 border-danger/30 text-danger' :
                  lead.score >= 40 ? 'bg-warning/15 border-warning/30 text-warning' :
                    'bg-fg/8 border-fg/10 text-fg-muted'
              }`}>
                <span className="inline-flex items-center gap-1">
                  {lead.score >= 70 && <Flame size={10} />}
                  {lead.score}
                </span>
              </span>
              {scoreInsightsByLeadId[lead.id] && (
                <span
                  title={`baseline=${scoreInsightsByLeadId[lead.id].baselineSignals} · eventScore=${scoreInsightsByLeadId[lead.id].eventScore} · recentSignals=${scoreInsightsByLeadId[lead.id].recentSignals}`}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    scoreInsightsByLeadId[lead.id].confidence === 'high'
                      ? 'text-success border-success/30 bg-success/10'
                      : scoreInsightsByLeadId[lead.id].confidence === 'medium'
                        ? 'text-warning border-warning/30 bg-warning/10'
                        : 'text-fg-muted border-fg/10 bg-fg/5'
                  }`}
                >
                  {t.leads.confidence}: {t.leads.confidenceLevels[scoreInsightsByLeadId[lead.id].confidence]}
                </span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-300 border border-accent-500/25">
                {stageLabels[lead.lifecycleStage]}
              </span>
              <button
                type="button"
                onClick={async () => {
                  const willExpand = expandedLeadId !== lead.id
                  setExpandedLeadId(willExpand ? lead.id : null)
                  if (willExpand) await fetchLeadEvents(lead.id)
                }}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-fg/6 hover:bg-fg/10 text-fg-muted"
              >
                <Clock3 size={10} />
                {t.leads.timelineAction}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const willExpand = expandedScoreLeadId !== lead.id
                  setExpandedScoreLeadId(willExpand ? lead.id : null)
                  if (willExpand) {
                    await Promise.all([
                      fetchScoreInsight(lead.id),
                      fetchScoreHistory(lead.id),
                    ])
                  }
                }}
                className="text-[10px] px-2 py-1 rounded bg-fg/6 hover:bg-fg/10 text-fg-muted"
              >
                {t.leads.scoreBreakdownAction}
              </button>
              <button
                type="button"
                onClick={() => setExpandedUpdatesLeadId(expandedUpdatesLeadId === lead.id ? null : lead.id)}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-fg/6 hover:bg-fg/10 text-fg-muted"
              >
                <AtSign size={10} />
                {t.updates.title}
              </button>
              {lead.status !== 'converted' && (
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await convertLeadToContact(lead.id)
                      if (ok) {
                        toast.success(t.leads.convertAction)
                      } else {
                        toast.error(error ?? t.errors.generic)
                      }
                    }}
                    title={t.leads.convertActionHint}
                    aria-label={t.leads.convertActionHint}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-success/15 border border-success/30 text-success hover:bg-success/20"
                  >
                    <UserPlus size={10} />
                    {t.leads.convertAction}
                  </button>
                  <HintPopover text={t.leads.convertActionHint} />
                </div>
              )}
              <button
                type="button"
                onClick={async () => {
                  const ok = await deleteLead(lead.id)
                  if (ok) toast.success(t.common.delete)
                }}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-danger/12 border border-danger/30 text-danger hover:bg-danger/18"
                title={t.common.delete}
                aria-label={t.common.delete}
              >
                <Trash2 size={10} />
                {t.common.delete}
              </button>
              </div>
              {expandedLeadId === lead.id && (
                <div className="px-4 pb-4">
                  <div className="ml-12 rounded-lg border border-fg/8 bg-fg/[0.02] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-fg-subtle mb-2">{t.leads.timelineTitle}</p>
                    {(leadEventsByLeadId[lead.id] ?? []).length === 0 ? (
                      <p className="text-xs text-fg-subtle">{t.leads.noEvents}</p>
                    ) : (
                      <div className="space-y-2">
                        {(leadEventsByLeadId[lead.id] ?? []).map((event) => (
                          <div key={event.id} className="text-xs text-fg-muted">
                            <span className="text-fg-subtle">{formatDateTime(event.createdAt)} • </span>
                            <span className="font-medium">{event.eventType}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {expandedUpdatesLeadId === lead.id && (
                <div className="px-4 pb-4">
                  <div className="ml-12 rounded-lg border border-fg/8 bg-fg/[0.02] p-3">
                    <UpdatesPanel entityType="lead" entityId={lead.id} />
                  </div>
                </div>
              )}
              {expandedScoreLeadId === lead.id && (
                <div className="px-4 pb-4">
                  <div className="ml-12 rounded-lg border border-fg/8 bg-fg/[0.02] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-fg-subtle mb-2">{t.leads.scoreBreakdownTitle}</p>
                    {!scoreInsightsByLeadId[lead.id] ? (
                      <p className="text-xs text-fg-subtle">{t.leads.noScoreInsight}</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                        <div className="rounded border border-fg/8 px-2 py-1.5">
                          <p className="text-fg-subtle">{t.leads.confidence}</p>
                          <p className="text-fg font-medium">{t.leads.confidenceLevels[scoreInsightsByLeadId[lead.id].confidence]}</p>
                        </div>
                        <div className="rounded border border-fg/8 px-2 py-1.5">
                          <p className="text-fg-subtle">{t.leads.baselineSignals}</p>
                          <p className="text-fg font-medium">{scoreInsightsByLeadId[lead.id].baselineSignals}</p>
                        </div>
                        <div className="rounded border border-fg/8 px-2 py-1.5">
                          <p className="text-fg-subtle">{t.leads.eventScore}</p>
                          <p className="text-fg font-medium">{scoreInsightsByLeadId[lead.id].eventScore}</p>
                        </div>
                        <div className="rounded border border-fg/8 px-2 py-1.5">
                          <p className="text-fg-subtle">{t.leads.recentSignals}</p>
                          <p className="text-fg font-medium">{scoreInsightsByLeadId[lead.id].recentSignals}</p>
                        </div>
                        <div className="rounded border border-fg/8 px-2 py-1.5">
                          <p className="text-fg-subtle">{t.leads.scoreAction}</p>
                          <p className="text-fg font-medium">
                            {(scoreInsightsByLeadId[lead.id].computedScore ?? lead.score)} / {scoreInsightsByLeadId[lead.id].persistedScore ?? lead.score}
                          </p>
                        </div>
                      </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-fg-subtle mb-2">{t.leads.scoreHistory}</p>
                          {!(scoreHistoryByLeadId[lead.id]?.length) ? (
                            <p className="text-xs text-fg-subtle">{t.leads.noScoreInsight}</p>
                          ) : (
                            <svg viewBox="0 0 100 28" className="w-full h-10">
                              <polyline
                                fill="none"
                                stroke="rgb(99 102 241)"
                                strokeWidth="2"
                                points={scoreHistoryByLeadId[lead.id]
                                  .map((p, index, arr) => {
                                    const x = arr.length <= 1 ? 0 : (index / (arr.length - 1)) * 100
                                    const y = 28 - ((Math.max(0, Math.min(100, p.score)) / 100) * 28)
                                    return `${x},${y}`
                                  })
                                  .join(' ')}
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
