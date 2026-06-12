import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { PermissionGate } from '../components/auth/PermissionGate'
import {
  ArrowLeft, Edit2, Plus, Building2, Phone, Mail, Calendar,
  FileText, CheckCircle2, Eye, MousePointerClick, Linkedin,
} from 'lucide-react'
import { useContactsStore } from '../store/contactsStore'
import { useCompaniesStore } from '../store/companiesStore'
import { useDealsStore } from '../store/dealsStore'
import { useActivitiesStore } from '../store/activitiesStore'
import { useEmailStore } from '../store/emailStore'
import { Avatar } from '../components/ui/Avatar'
import { Badge, type BadgeVariant } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { SlideOver } from '../components/ui/Modal'
import { AiInsight } from '../components/ai/AiInsight'
import { useAiStore } from '../store/aiStore'
import { ContactForm } from '../components/contacts/ContactForm'
import { ContactStatusBadge } from '../components/contacts/ContactStatusBadge'
import { ActivityItem } from '../components/activities/ActivityItem'
import { ActivityForm } from '../components/activities/ActivityForm'
import { EmailComposer } from '../components/email/EmailComposer'
import { Textarea } from '../components/ui/Textarea'
import { toast } from '../store/toastStore'
import { formatDate, formatCurrency, formatRelativeDate } from '../utils/formatters'
import type { Contact, DealStage, ActivityType } from '../types'
import { CustomFieldsDisplay } from '../components/shared/CustomFieldRenderer'
import { UpdatesPanel } from '../components/shared/UpdatesPanel'
import { getTranslations, useTranslations } from '../i18n'
import { useDateLocale } from '../hooks/useDateLocale'
import { localizedActivity, localizedCompany, localizedContact, localizedCRMEmail, localizedDeal } from '../i18n/localizeSeed'
import { format } from 'date-fns'
import type { Locale } from 'date-fns'

const STAGE_BADGE: Record<DealStage, BadgeVariant> = {
  lead: 'info',
  qualified: 'warning',
  proposal: 'violet',
  negotiation: 'orange',
  closed_won: 'success',
  closed_lost: 'danger',
}

type TabId = 'overview' | 'activities' | 'deals' | 'emails' | 'updates' | 'notes'

const ACTIVITY_ICONS: Record<ActivityType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task: CheckCircle2,
  linkedin: Building2,
}

function getMonthLabel(dateStr: string, locale: Locale): string {
  const d = new Date(dateStr)
  return format(d, 'MMMM yyyy', { locale })
}


export function ContactDetail() {
  const t = useTranslations()
  const dateLocale = useDateLocale()

  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isActivityOpen, setIsActivityOpen] = useState(false)
  const [isEmailOpen, setIsEmailOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)

  const contactRaw = useContactsStore((s) => (id ? s.contacts.find((c) => c.id === id) : undefined))
  const { updateContact } = useContactsStore()
  const companies = useCompaniesStore((s) => s.companies)
  const deals = useDealsStore((s) => s.deals)
  const { activities, addActivity, completeActivity, deleteActivity } = useActivitiesStore()
  const emails = useEmailStore((s) => s.emails)

  const displayContact = useMemo(
    () => (contactRaw ? localizedContact(contactRaw, getTranslations()) : undefined),
    [contactRaw],
  )

  const companyRaw = useMemo(
    () => (contactRaw ? companies.find((c) => c.id === contactRaw.companyId) : undefined),
    [companies, contactRaw],
  )

  const displayCompany = useMemo(
    () => (companyRaw ? localizedCompany(companyRaw, getTranslations()) : undefined),
    [companyRaw],
  )

  const contactDeals = useMemo(() => {
    if (!contactRaw || !id) return []
    return deals
      .filter((d) => d.contactId === id || contactRaw.linkedDeals.includes(d.id))
      .map((d) => localizedDeal(d, getTranslations()))
  }, [deals, id, contactRaw])

  const contactActivities = useMemo(() => {
    if (!id) return []
    return activities
      .filter((a) => a.contactId === id)
      .map((a) => localizedActivity(a, getTranslations()))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [activities, id])

  const contactEmails = useMemo(() => {
    if (!contactRaw) return []
    return emails
      .filter((e) => e.contactId === id || e.to.some((addr) => addr === contactRaw.email))
      .map((e) => localizedCRMEmail(e, getTranslations()))
  }, [emails, id, contactRaw])

  // Group activities by month for timeline
  const activitiesByMonth = useMemo(() => {
    const groups: Record<string, typeof contactActivities> = {}
    for (const act of contactActivities) {
      const label = getMonthLabel(act.createdAt, dateLocale)
      if (!groups[label]) groups[label] = []
      groups[label].push(act)
    }
    return groups
  }, [contactActivities, dateLocale])

  if (!contactRaw || !displayContact) {
    return (
      <div className="crm-page">
        <Button variant="ghost" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate('/contacts')}>
          {t.common.back}
        </Button>
        <p className="text-fg-subtle mt-4">{t.contacts.emptyTitle}</p>
      </div>
    )
  }

  const handleEdit = (data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'tags' | 'linkedDeals' | 'lastContactedAt'>) => {
    updateContact(contactRaw.id, data)
    setIsEditOpen(false)
    toast.success(t.contacts.updated)
  }

  const handleAddActivity = (data: Omit<(typeof activities)[0], 'id' | 'createdAt'>) => {
    addActivity({ ...data, contactId: id })
    setIsActivityOpen(false)
    toast.success(t.activities.newActivity)
  }

  const handleSaveNotes = () => {
    updateContact(contactRaw.id, { notes })
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
    toast.success(t.common.save)
  }

  const handleQuickActivity = (type: ActivityType, subject: string) => {
    addActivity({
      type,
      subject,
      description: '',
      status: 'pending',
      contactId: id,
      createdBy: 'current-user',
    })
    toast.success(t.activities.newActivity)
  }


  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: t.common.details },
    { id: 'activities', label: `${t.activities.title} (${contactActivities.length})` },
    { id: 'deals', label: `${t.deals.title} (${contactDeals.length})` },
    { id: 'emails', label: `${t.nav.inbox} (${contactEmails.length})` },
    { id: 'updates', label: t.updates.title },
    { id: 'notes', label: t.common.notes },
  ]

  return (
    <div className="crm-page space-y-4">
      {/* Back */}
      <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => navigate('/contacts')}>
        {t.nav.contacts}
      </Button>

      {/* Header */}
      <div className="glass border border-fg/8 rounded-xl p-6 mb-4">
        <div className="flex items-start gap-5">
          <Avatar name={`${displayContact.firstName} ${displayContact.lastName}`} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-fg">
                    {displayContact.firstName} {displayContact.lastName}
                  </h2>
                  <p className="text-fg-muted mt-0.5">{displayContact.jobTitle || t.contacts.jobTitle}</p>
                  {displayCompany && (
                    <Link
                      to={`/companies/${displayCompany.id}`}
                      className="flex items-center gap-1.5 text-sm text-accent-400 hover:text-accent-300 mt-1 transition-colors"
                    >
                      <Building2 size={14} />
                      {displayCompany.name}
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AiInsight
                  label={t.ai.nextBestAction}
                  loadingLabel={t.ai.analyzing}
                  resultTitle={t.ai.nextBestActionTitle}
                  run={() => useAiStore.getState().nextBestAction({ contactId: displayContact.id })}
                />
                <PermissionGate permission="contacts:update">
                  <Button variant="secondary" size="sm" leftIcon={<Edit2 size={14} />} onClick={() => setIsEditOpen(true)}>
                    {t.common.edit}
                  </Button>
                </PermissionGate>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <ContactStatusBadge status={displayContact.status} />
              <Badge variant="neutral">{t.contacts.sourceLabels[displayContact.source]}</Badge>
              {displayContact.tags.map((tag) => (
                <Badge key={tag} variant="accent">{tag}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => handleQuickActivity('call', `${t.activities.typeLabels.call} ${displayContact.firstName}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-fg/8 hover:border-fg/12 text-sm text-fg-muted hover:text-fg transition-colors"
        >
          <Phone size={14} />
          {t.activities.typeLabels.call}
        </button>
        <button
          type="button"
          onClick={() => setIsEmailOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-fg/8 hover:border-fg/12 text-sm text-fg-muted hover:text-fg transition-colors"
        >
          <Mail size={14} />
          {t.activities.typeLabels.email}
        </button>
        <button
          type="button"
          onClick={() => handleQuickActivity('meeting', `${t.activities.typeLabels.meeting} ${displayContact.firstName}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-fg/8 hover:border-fg/12 text-sm text-fg-muted hover:text-fg transition-colors"
        >
          <Calendar size={14} />
          {t.activities.typeLabels.meeting}
        </button>
        <button
          type="button"
          onClick={() => handleQuickActivity('note', `${t.activities.typeLabels.note} ${displayContact.firstName}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-fg/8 hover:border-fg/12 text-sm text-fg-muted hover:text-fg transition-colors"
        >
          <FileText size={14} />
          {t.activities.typeLabels.note}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-fg/8">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-accent-400 border-accent-500'
                : 'text-fg-subtle border-transparent hover:text-fg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Contact Info */}
          <div className="glass border border-fg/8 rounded-xl p-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {[
                { label: t.auth.email, value: displayContact.email },
                { label: t.common.phone, value: displayContact.phone || '\u2014' },
                { label: t.contacts.jobTitle, value: displayContact.jobTitle || '\u2014' },
                { label: t.contacts.company, value: displayCompany?.name || '\u2014' },
                { label: t.common.status, value: displayContact.status },
                { label: t.contacts.source, value: t.contacts.sourceLabels[displayContact.source] },
                { label: t.common.assignedTo, value: displayContact.assignedTo },
                { label: t.contacts.lastContacted, value: formatDate(displayContact.lastContactedAt) },
                { label: t.common.createdAt, value: formatDate(displayContact.createdAt) },
                { label: t.common.updatedAt, value: formatDate(displayContact.updatedAt) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-fg-subtle mb-0.5">{label}</p>
                  <p className="text-sm text-fg">{value}</p>
                </div>
              ))}
              {displayContact.linkedinUrl && (
                <div>
                  <p className="text-xs text-fg-subtle mb-0.5">LinkedIn</p>
                  <a
                    href={displayContact.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent flex items-center gap-1 hover:underline"
                  >
                    <Linkedin size={13} />
                    {displayContact.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '')}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Custom Fields */}
          <CustomFieldsDisplay entityId={contactRaw.id} entityType="contact" />
        </div>
      )}

      {/* Tab: Activities (Timeline) */}
      {activeTab === 'activities' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsActivityOpen(true)}>
              {t.activities.newActivity}
            </Button>
          </div>
          {contactActivities.length === 0 ? (
            <div className="glass border border-fg/8 rounded-xl p-8 text-center">
              <p className="text-fg-subtle text-sm">{t.activities.emptyTitle}</p>
            </div>
          ) : (
            <div className="glass border border-fg/8 rounded-xl p-6">
              {Object.entries(activitiesByMonth).map(([month, acts]) => (
                <div key={month} className="mb-6 last:mb-0">
                  <h3 className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-3">
                    {month}
                  </h3>
                  <div className="relative pl-6 border-l-2 border-fg/8 space-y-4">
                    {acts.map((a) => {
                      const IconComponent = ACTIVITY_ICONS[a.type] || FileText
                      return (
                        <div key={a.id} className="relative">
                          {/* Timeline dot */}
                          <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full glass border border-fg/12 flex items-center justify-center">
                            <IconComponent size={9} className="text-fg-muted" />
                          </div>
                          <ActivityItem
                            activity={a}
                            onComplete={completeActivity}
                            onDelete={deleteActivity}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Deals */}
      {activeTab === 'deals' && (
        <div className="space-y-3">
          {contactDeals.length === 0 ? (
            <div className="glass border border-fg/8 rounded-xl p-8 text-center">
              <p className="text-fg-subtle text-sm">{t.deals.emptyTitle}</p>
            </div>
          ) : (
            contactDeals.map((deal) => (
              <div
                key={deal.id}
                className="glass border border-fg/8 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-fg/12 transition-colors"
                onClick={() => navigate('/deals')}
              >
                <div className="flex-1">
                  <p className="font-medium text-fg">{deal.title}</p>
                  <p className="text-xs text-fg-subtle mt-0.5">{t.deals.expectedClose}: {formatDate(deal.expectedCloseDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-success">
                    {formatCurrency(deal.value, deal.currency)}
                  </span>
                  <Badge variant={STAGE_BADGE[deal.stage] ?? 'neutral'}>
                    {t.deals.stageLabels[deal.stage as keyof typeof t.deals.stageLabels] ?? deal.stage}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Emails */}
      {activeTab === 'emails' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" leftIcon={<Mail size={14} />} onClick={() => setIsEmailOpen(true)}>
              {t.inbox.compose}
            </Button>
          </div>
          {contactEmails.length === 0 ? (
            <div className="glass border border-fg/8 rounded-xl p-8 text-center">
              <p className="text-fg-subtle text-sm">{t.inbox.noMessages}</p>
            </div>
          ) : (
            contactEmails.map((email) => (
              <div
                key={email.id}
                className="glass border border-fg/8 rounded-xl p-4 hover:border-fg/12 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-fg truncate">{email.subject || t.common.noResults}</p>
                    <p className="text-xs text-fg-subtle mt-0.5">
                      {email.sentAt ? formatDate(email.sentAt) : formatDate(email.createdAt)}
                      {' \u2022 '}
                      {t.common.to}: {email.to.join(', ')}
                    </p>
                    <p className="text-sm text-fg-muted mt-2 line-clamp-2">
                      {email.body}
                    </p>
                    {/* Tracking badges */}
                    {(email.trackingEnabled || (email.openCount ?? 0) > 0 || (email.clickCount ?? 0) > 0) && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {(email.openCount ?? 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20">
                            <Eye size={9} />
                            {t.common.view} {email.openCount}x &middot; {formatRelativeDate(email.lastOpenedAt!)}
                          </span>
                        ) : email.trackingEnabled ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-fg/8 text-fg-subtle border border-fg/10">
                            <Eye size={9} />
                            {t.common.noResults}
                          </span>
                        ) : null}
                        {(email.clickCount ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-info/15 text-info border border-info/20">
                            <MousePointerClick size={9} />
                            {t.inbox.clicks} {email.clickCount}x
                          </span>
                        )}
                      </div>
                    )}
                    {email.trackingEnabled && (
                      <div className="mt-1.5 min-h-[1.75rem] flex flex-col justify-center">
                        <p className="text-[10px] text-fg-subtle max-w-xl">{t.inbox.trackingServerMetricsHint}</p>
                      </div>
                    )}
                  </div>
                  <span title={email.sendError}>
                    <Badge
                      variant={
                        email.status === 'sent'
                          ? 'success'
                          : email.status === 'failed'
                            ? 'danger'
                            : email.status === 'draft'
                              ? 'warning'
                              : 'info'
                      }
                    >
                      {email.status === 'sent'
                        ? t.inbox.sent
                        : email.status === 'failed'
                          ? t.inbox.sendFailed
                          : email.status === 'draft'
                            ? t.inbox.drafts
                            : t.inbox.title}
                    </Badge>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Updates */}
      {activeTab === 'updates' && (
        <div className="glass border border-fg/8 rounded-xl p-6">
          <UpdatesPanel entityType="contact" entityId={contactRaw.id} />
        </div>
      )}

      {/* Tab: Notes */}
      {activeTab === 'notes' && (
        <div className="glass border border-fg/8 rounded-xl p-6 space-y-4">
          <Textarea
            label={t.common.notes}
            value={notes || contactRaw.notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={8}
            placeholder={t.common.notes}
          />
          <Button onClick={handleSaveNotes}>
            {notesSaved ? t.common.ok : t.common.save}
          </Button>
        </div>
      )}


      {/* Edit slide-over */}
      <SlideOver isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={t.contacts.editContact}>
        <ContactForm contact={contactRaw} onSubmit={handleEdit} onCancel={() => setIsEditOpen(false)} />
      </SlideOver>

      {/* Activity slide-over */}
      <SlideOver isOpen={isActivityOpen} onClose={() => setIsActivityOpen(false)} title={t.activities.newActivity}>
        <ActivityForm defaultContactId={id} onSubmit={handleAddActivity} onCancel={() => setIsActivityOpen(false)} />
      </SlideOver>


      {/* Email Composer */}
      <EmailComposer
        isOpen={isEmailOpen}
        onClose={() => setIsEmailOpen(false)}
        defaultTo={contactRaw.email}
        contactId={contactRaw.id}
        companyId={contactRaw.companyId}
        onRequestGmailConnect={() => navigate('/settings?tab=email')}
      />
    </div>
  )
}
