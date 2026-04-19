import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslations } from '../i18n'
import { RefreshCw, AlertTriangle, Clock, Phone, Mail, ClipboardList, User, Filter } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useContactsStore } from '../store/contactsStore'
import { useActivitiesStore } from '../store/activitiesStore'
import { useCompaniesStore } from '../store/companiesStore'
import { getFollowUpReminders } from '../utils/followUpEngine'
import { EmailComposer } from '../components/email/EmailComposer'
import { Avatar } from '../components/ui/Avatar'
import { Toolbar } from '../components/ui/Toolbar'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { toast } from '../store/toastStore'
import { formatDate } from '../utils/formatters'
import type { FollowUpReminder, ActivityType } from '../types'

type UrgencyFilter = 'all' | 'critical' | 'high' | 'medium' | 'low'

const URGENCY_COLORS: Record<FollowUpReminder['urgency'], string> = {
  critical: 'text-danger',
  high: 'text-warning',
  medium: 'text-warning',
  low: 'text-fg-muted',
}

const URGENCY_BG: Record<FollowUpReminder['urgency'], string> = {
  critical: 'bg-danger/15 text-danger border border-danger/20',
  high: 'bg-warning/15 text-warning border border-warning/20',
  medium: 'bg-warning/15 text-warning border border-yellow-500/20',
  low: 'bg-fg/6 text-fg-muted border border-fg/8',
}

export function FollowUps() {
  const t = useTranslations()
  const navigate = useNavigate()
  const currentUserName = useAuthStore((s) => s.currentUser?.name ?? '')
  const contacts = useContactsStore((s) => s.contacts)
  const activities = useActivitiesStore((s) => s.activities)
  const addActivity = useActivitiesStore((s) => s.addActivity)
  const companies = useCompaniesStore((s) => s.companies)

  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [emailComposerOpen, setEmailComposerOpen] = useState(false)
  const [emailContactId, setEmailContactId] = useState<string | undefined>()
  const [emailDefaultTo, setEmailDefaultTo] = useState('')

  const reminders = useMemo(() => {
    void refreshKey
    return getFollowUpReminders(contacts, activities, companies)
  }, [contacts, activities, companies, refreshKey])

  const filtered = useMemo(() => {
    if (urgencyFilter === 'all') return reminders
    return reminders.filter((r) => r.urgency === urgencyFilter)
  }, [reminders, urgencyFilter])

  const stats = useMemo(() => {
    const critical = reminders.filter((r) => r.urgency === 'critical').length
    const high = reminders.filter((r) => r.urgency === 'high').length
    const medium = reminders.filter((r) => r.urgency === 'medium').length
    const low = reminders.filter((r) => r.urgency === 'low').length
    return { total: reminders.length, critical, high, medium, low }
  }, [reminders])

  const handleCall = (reminder: FollowUpReminder) => {
    addActivity({
      type: 'call',
      subject: `${t.nav.followUps} — ${reminder.contactName}`,
      description: `${t.activities.typeLabels.call} — ${t.nav.followUps}`,
      status: 'pending',
      contactId: reminder.contactId,
      createdBy: currentUserName || t.common.notAvailable,
    })
    toast.success(`${t.activities.typeLabels.call} — ${reminder.contactName}`)
  }

  const handleEmail = (reminder: FollowUpReminder) => {
    const contact = contacts.find((c) => c.id === reminder.contactId)
    setEmailContactId(reminder.contactId)
    setEmailDefaultTo(contact?.email ?? '')
    setEmailComposerOpen(true)
  }

  const handleTask = (reminder: FollowUpReminder) => {
    addActivity({
      type: 'task',
      subject: `${t.nav.followUps} — ${reminder.contactName}`,
      description: `${t.activities.typeLabels.task} — ${t.nav.followUps}`,
      status: 'pending',
      contactId: reminder.contactId,
      createdBy: currentUserName || t.common.notAvailable,
    })
    toast.success(`${t.activities.typeLabels.task} — ${reminder.contactName}`)
  }

  const URGENCY_LABELS: Record<FollowUpReminder['urgency'], string> = {
    critical: t.followUps.critical,
    high: t.followUps.high,
    medium: t.followUps.medium,
    low: t.followUps.low,
  }

  const filterButtons: { value: UrgencyFilter; label: string; count: number }[] = [
    { value: 'all', label: t.common.all, count: stats.total },
    { value: 'critical', label: t.followUps.critical, count: stats.critical },
    { value: 'high', label: t.followUps.high, count: stats.high },
    { value: 'medium', label: t.followUps.medium, count: stats.medium },
    { value: 'low', label: t.followUps.low, count: stats.low },
  ]

  return (
    <div className="crm-page space-y-4">
      <PageHeader
        showTitle={false}
        title={t.followUps.title}
        subtitle={`${stats.total} ${t.contacts.title} — ${t.followUps.title}`}
        actions={
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-2 rounded-xl text-fg-subtle hover:text-fg hover:bg-fg/5 border border-fg/8 transition-colors"
            title={t.common.reset}
          >
            <RefreshCw size={16} />
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title={t.followUps.title} value={stats.total} icon={<User size={18} />} accent="accent" />
        <StatCard title={t.followUps.critical} value={stats.critical} icon={<AlertTriangle size={18} />} accent="danger" />
        <StatCard title={t.followUps.high} value={stats.high} icon={<Clock size={18} />} accent="warning" />
        <StatCard title={t.followUps.medium} value={stats.medium} icon={<Clock size={18} />} accent="warning" />
      </div>

      <Toolbar panel>
      <div className="flex items-center gap-2 flex-wrap w-full">
        <Filter size={13} className="text-fg-subtle" />
        {filterButtons.map((btn) => (
          <button
            type="button"
            key={btn.value}
            onClick={() => setUrgencyFilter(btn.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              urgencyFilter === btn.value
                ? 'bg-accent-500/20 border-accent-500/40 text-accent-300'
                : 'bg-fg/4 border-fg/8 text-fg-muted hover:text-fg hover:bg-fg/6'
            }`}
          >
            {btn.label}
            {btn.count > 0 && (
              <span className={`text-[10px] font-bold min-w-[16px] text-center ${
                urgencyFilter === btn.value ? 'text-accent-400' : 'text-fg-subtle'
              }`}>
                {btn.count}
              </span>
            )}
          </button>
        ))}
      </div>
      </Toolbar>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="glass rounded-xl p-10 border border-fg/6 text-center">
            <User size={28} className="text-fg-subtle mx-auto mb-3" />
            <p className="text-sm font-medium text-fg-muted">{t.followUps.title}</p>
            <p className="text-xs text-fg-subtle mt-1">{t.common.noResults}</p>
          </div>
        ) : (
          filtered.map((reminder) => (
            <div
              key={reminder.contactId}
              onClick={() => navigate(`/contacts/${reminder.contactId}`)}
              className="rounded-xl border border-fg/8 bg-fg/[0.02] px-4 py-3 hover:bg-fg/[0.05] transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar name={reminder.contactName} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-fg truncate">{reminder.contactName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${URGENCY_BG[reminder.urgency]}`}>
                        {URGENCY_LABELS[reminder.urgency]}
                      </span>
                    </div>
                    <p className="text-xs text-fg-subtle truncate">{reminder.companyName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs font-medium ${URGENCY_COLORS[reminder.urgency]}`}>
                        {t.followUps.daysSinceBadge.replace(/\{days\}/g, String(reminder.daysSinceContact))}
                      </span>
                      {reminder.lastActivityType && (
                        <span className="text-[11px] text-fg-subtle">
                          {t.activities.typeLabels[reminder.lastActivityType as ActivityType] ?? reminder.lastActivityType} · {formatDate(reminder.lastActivityDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleCall(reminder) }}
                    className="p-2 rounded-lg text-fg-subtle hover:text-fg hover:bg-fg/8 border border-fg/6 transition-colors"
                    title={`${t.common.add} ${t.activities.typeLabels.call}`}
                  >
                    <Phone size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleEmail(reminder) }}
                    className="p-2 rounded-lg text-fg-subtle hover:text-fg hover:bg-fg/8 border border-fg/6 transition-colors"
                    title={`${t.common.add} ${t.activities.typeLabels.email}`}
                  >
                    <Mail size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleTask(reminder) }}
                    className="p-2 rounded-lg text-fg-subtle hover:text-fg hover:bg-fg/8 border border-fg/6 transition-colors"
                    title={`${t.common.add} ${t.activities.typeLabels.task}`}
                  >
                    <ClipboardList size={13} />
                  </button>
                </div>
              </div>

              {reminder.suggestedAction && (
                <p className="text-xs text-fg-subtle italic mt-2 pl-10 truncate">{reminder.suggestedAction}</p>
              )}
            </div>
          ))
        )}
      </div>

      <EmailComposer
        isOpen={emailComposerOpen}
        onClose={() => setEmailComposerOpen(false)}
        contactId={emailContactId}
        defaultTo={emailDefaultTo}
        onRequestGmailConnect={() => navigate('/settings?tab=email')}
      />
    </div>
  )
}
