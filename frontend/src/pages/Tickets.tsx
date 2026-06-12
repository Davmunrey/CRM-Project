import { useEffect, useMemo, useState } from 'react'
import { LifeBuoy, Plus, Trash2 } from 'lucide-react'
import { useTicketsStore, type Ticket, type TicketStatus, type TicketPriority } from '../store/ticketsStore'
import { useAuthStore } from '../store/authStore'
import { useTranslations } from '../i18n'
import { hasPermission } from '../utils/permissions'
import { formatRelativeDate } from '../utils/formatters'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { SlideOver } from '../components/ui/Modal'
import { Avatar } from '../components/ui/Avatar'

const STATUSES: TicketStatus[] = ['open', 'pending', 'resolved', 'closed']
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']

const STATUS_DOT: Record<TicketStatus, string> = {
  open: 'bg-info',
  pending: 'bg-warning',
  resolved: 'bg-success',
  closed: 'bg-fg/30',
}
const PRIORITY_CLS: Record<TicketPriority, string> = {
  low: 'text-fg-subtle',
  medium: 'text-info',
  high: 'text-warning',
  urgent: 'text-danger font-semibold',
}

const selectCls =
  'rounded-lg border border-fg/10 bg-surface-2 px-2 py-1 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-500/40'

export function Tickets() {
  const t = useTranslations()
  const { tickets, loading, fetchTickets, createTicket, updateTicket, deleteTicket } = useTicketsStore()
  const members = useAuthStore((s) => s.users)
  const currentUser = useAuthStore((s) => s.currentUser)
  const organizationId = useAuthStore((s) => s.organizationId)
  const fetchOrgUsers = useAuthStore((s) => s.fetchOrgUsers)
  const canWrite = !!currentUser && hasPermission(currentUser.role, 'contacts:update')

  const [filter, setFilter] = useState<TicketStatus | 'all'>('all')
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [assignee, setAssignee] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void fetchTickets()
    if (organizationId) void fetchOrgUsers(organizationId)
  }, [fetchTickets, fetchOrgUsers, organizationId])

  const counts = useMemo(() => {
    const c = { all: tickets.length, open: 0, pending: 0, resolved: 0, closed: 0 }
    for (const tk of tickets) c[tk.status]++
    return c
  }, [tickets])

  const visible = filter === 'all' ? tickets : tickets.filter((tk) => tk.status === filter)
  const memberName = (id: string | null) => members.find((m) => m.id === id)?.name ?? null

  const submit = async () => {
    if (!subject.trim()) return
    setSaving(true)
    const ok = await createTicket({
      subject: subject.trim(),
      description: description.trim() || undefined,
      priority,
      assignedTo: assignee || undefined,
    })
    setSaving(false)
    if (ok) {
      setSubject('')
      setDescription('')
      setPriority('medium')
      setAssignee('')
      setCreateOpen(false)
    }
  }

  return (
    <div className="crm-page space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LifeBuoy size={20} className="text-accent-400" aria-hidden />
          <h1 className="text-lg font-bold text-fg">{t.tickets.title}</h1>
        </div>
        {canWrite && (
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
            {t.tickets.newTicket}
          </Button>
        )}
      </div>

      {/* Status filter chips with counts */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs ${
              filter === s ? 'border-accent-500/40 bg-accent-500/10 text-accent-300' : 'border-fg/10 text-fg-muted hover:bg-fg/5'
            }`}
          >
            {s === 'all' ? t.common.all : t.tickets.statusLabels[s]} · {counts[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-fg-subtle">{t.common.loading}</p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-fg/12 p-10 text-center text-sm text-fg-subtle">{t.tickets.empty}</div>
      ) : (
        <ul className="space-y-2">
          {visible.map((tk: Ticket) => (
            <li key={tk.id} className="flex flex-col gap-2 rounded-xl border border-fg/8 bg-surface-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[tk.status]}`} aria-hidden />
                  <p className="truncate text-sm font-medium text-fg">{tk.subject}</p>
                  <span className={`text-[11px] ${PRIORITY_CLS[tk.priority]}`}>{t.tickets.priorityLabels[tk.priority]}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-fg-subtle">
                  {memberName(tk.assignedTo) ?? t.common.unassigned} · {formatRelativeDate(tk.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {canWrite ? (
                  <>
                    <select className={selectCls} value={tk.status} onChange={(e) => void updateTicket(tk.id, { status: e.target.value as TicketStatus })} aria-label={t.common.status}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{t.tickets.statusLabels[s]}</option>
                      ))}
                    </select>
                    <select className={selectCls} value={tk.priority} onChange={(e) => void updateTicket(tk.id, { priority: e.target.value as TicketPriority })} aria-label={t.common.priority}>
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{t.tickets.priorityLabels[p]}</option>
                      ))}
                    </select>
                    <select className={selectCls} value={tk.assignedTo ?? ''} onChange={(e) => void updateTicket(tk.id, { assignedTo: (e.target.value || null) as never })} aria-label={t.common.assignedTo}>
                      <option value="">{t.common.unassigned}</option>
                      {members.filter((m) => m.isActive).map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => { if (window.confirm(t.tickets.deleteConfirm)) void deleteTicket(tk.id) }} aria-label={t.common.delete} className="text-fg-subtle hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-fg-muted">{t.tickets.statusLabels[tk.status]}</span>
                    {tk.assignedTo && <Avatar name={memberName(tk.assignedTo) ?? '?'} size="xs" />}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <SlideOver isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} title={t.tickets.newTicket}>
        <div className="space-y-4">
          <Input label={t.tickets.subject} value={subject} onChange={(e) => setSubject(e.target.value)} autoFocus />
          <Textarea label={t.common.description} value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-muted">{t.common.priority}</label>
            <select className={`${selectCls} w-full py-2`} value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{t.tickets.priorityLabels[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-muted">{t.common.assignedTo}</label>
            <select className={`${selectCls} w-full py-2`} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">{t.common.unassigned}</option>
              {members.filter((m) => m.isActive).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <Button onClick={() => void submit()} loading={saving} disabled={!subject.trim()} className="w-full">
            {t.tickets.newTicket}
          </Button>
        </div>
      </SlideOver>
    </div>
  )
}
