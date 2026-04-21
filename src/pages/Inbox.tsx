import { useState, useEffect, useMemo } from 'react'
import {
  Mail, Send, Inbox as InboxIcon, Loader2, RefreshCw, Wifi, WifiOff, User, Clock, Reply, Plus, Eye, MousePointerClick,
  Paperclip, Download, Search, ChevronLeft, ChevronRight, Archive, Trash2, CheckCheck, ListChecks, X,
} from 'lucide-react'
import { Spinner } from '../components/ui/Spinner'
import { Link } from 'react-router-dom'
import { useEmailStore } from '../store/emailStore'
import { useContactsStore } from '../store/contactsStore'
import { useDealsStore } from '../store/dealsStore'
import { useCompaniesStore } from '../store/companiesStore'
import { useActivitiesStore } from '../store/activitiesStore'
import { useAuthStore } from '../store/authStore'
import { initiateGmailOAuth, GmailApiError, downloadGmailAttachment, modifyGmailThreadLabels, trashGmailThread } from '../services/gmailService'
import { useGmailToken } from '../contexts/GmailTokenContext'
import { supabase } from '../lib/supabase'
import { useSettingsStore } from '../store/settingsStore'
import { useViewsStore } from '../store/viewsStore'
import { EmailComposer } from '../components/email/EmailComposer'
import { toast } from '../store/toastStore'
import { PermissionGate } from '../components/auth/PermissionGate'
import { hasPermission } from '../utils/permissions'
import { useTranslations } from '../i18n'
import type { GmailThread, GmailMessage, CRMEmail, Contact, InboxAdvancedFilters } from '../types'
import { formatDateTime, formatRelativeDate } from '../utils/formatters'
import { trackUxAction } from '../lib/uxMetrics'
import { buildInboxQueryMatcher } from '../utils/inboxQuery'
import { toGmailThreadsListQuery } from '../utils/inboxGmailQuery'
import { PanelEmpty } from '../components/shared/PanelEmpty'
import { Skeleton } from '../components/ui/Skeleton'
import { Select } from '../components/ui/Select'
import { Button } from '../components/ui/Button'
import {
  extractEmail,
  parseEmails,
  type ThreadMatch,
  buildAutoThreadMatchMap,
  buildPersistedThreadMatchMap,
  buildReplySubject,
} from '../features/inbox'

// ─── Thread item ──────────────────────────────────────────────────────────────

function ThreadItem({
  thread,
  selected,
  bulkSelected,
  onClick,
  onToggleBulk,
  contactByEmail,
}: {
  thread: GmailThread
  selected: boolean
  bulkSelected: boolean
  onClick: () => void
  onToggleBulk: () => void
  contactByEmail: Map<string, { id: string; name: string }>
}) {
  const t = useTranslations()
  const lastMsg = thread.messages[thread.messages.length - 1]
  const isUnread = lastMsg?.labelIds?.includes('UNREAD')
  const senderEmail = extractEmail(lastMsg?.from ?? '')
  const matchedContact = contactByEmail.get(senderEmail)

  return (
    <div
      onClick={onClick}
      className={`group px-3 py-2.5 border-b border-fg/[0.06] cursor-pointer transition-colors motion-reduce:transition-none ${
        selected ? 'bg-accent-600/[0.12] border-l-[3px] border-l-accent-500 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.12)]' : 'hover:bg-fg/[0.04]'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={bulkSelected}
          onChange={(e) => {
            e.stopPropagation()
            onToggleBulk()
          }}
          onClick={(e) => e.stopPropagation()}
          className={`mt-1 rounded border-fg/12 bg-fg/6 text-accent-500 focus:ring-accent-500 transition-opacity ${
            bulkSelected ? 'opacity-100' : 'opacity-35 group-hover:opacity-100'
          }`}
          aria-label={t.inbox.selectThread}
          title={t.inbox.selectThread}
        />
        <div className="w-9 h-9 rounded-full bg-accent-600/18 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-accent-400">
          {(lastMsg?.from?.charAt(0) ?? '?').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <p className={`text-sm leading-tight truncate ${isUnread ? 'font-semibold text-fg' : 'font-medium text-fg-muted'}`}>
              {lastMsg?.from?.replace(/<.*>/, '').trim() || t.inbox.unknownSender}
            </p>
            <span className="text-xs text-fg-subtle tabular-nums flex-shrink-0">
              {lastMsg?.date ? formatRelativeDate(lastMsg.date) : ''}
            </span>
          </div>
          <p className={`text-sm truncate leading-snug ${isUnread ? 'text-fg font-medium' : 'text-fg-muted'}`}>{lastMsg?.subject ?? ''}</p>
          <p className="text-xs text-fg-subtle truncate mt-0.5 leading-snug">{thread.snippet}</p>
          {matchedContact && (
            <Link
              to={`/contacts/${matchedContact.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-accent-600/20 text-accent-300 border border-accent-500/30 hover:bg-accent-600/30 transition-colors mt-1"
            >
              <User size={12} />
              {matchedContact.name}
            </Link>
          )}
        </div>
        {isUnread && <div className="w-2 h-2 rounded-full bg-accent-500 flex-shrink-0 mt-1" />}
      </div>
    </div>
  )
}

// ─── Tracking badges ──────────────────────────────────────────────────────────
function TrackingBadges({ email }: { email: CRMEmail }) {
  const t = useTranslations()
  if (!email.trackingEnabled && !email.openCount && !email.clickCount) return null

  return (
    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
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
  )
}

// ─── Local email item ─────────────────────────────────────────────────────────
function LocalEmailItem({
  email,
  selected,
  bulkSelected,
  onClick,
  onToggleBulk,
  contacts,
  onTrackOpen,
  onTrackClick,
}: {
  email: CRMEmail
  selected: boolean
  bulkSelected: boolean
  onClick: () => void
  onToggleBulk: () => void
  contacts: Contact[]
  onTrackOpen: (id: string) => void
  onTrackClick: (id: string) => void
}) {
  const t = useTranslations()
  const contact = email.contactId ? contacts.find((c) => c.id === email.contactId) : undefined

  const unread = email.isRead === false

  return (
    <div
      onClick={onClick}
      className={`group px-3 py-2.5 border-b border-fg/[0.06] cursor-pointer transition-colors motion-reduce:transition-none ${
        selected ? 'bg-accent-600/[0.12] border-l-[3px] border-l-accent-500 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.12)]' : 'hover:bg-fg/[0.04]'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={bulkSelected}
          onChange={(e) => {
            e.stopPropagation()
            onToggleBulk()
          }}
          onClick={(e) => e.stopPropagation()}
          className={`mt-1 rounded border-fg/12 bg-fg/6 text-accent-500 focus:ring-accent-500 transition-opacity ${
            bulkSelected ? 'opacity-100' : 'opacity-35 group-hover:opacity-100'
          }`}
          aria-label={t.inbox.selectMessage}
          title={t.inbox.selectMessage}
        />
        <div className="w-9 h-9 rounded-full bg-fg/8 flex items-center justify-center flex-shrink-0">
          <User size={14} className="text-fg-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <p className={`text-sm leading-tight truncate ${unread ? 'text-fg font-semibold' : 'font-medium text-fg-muted'}`}>
              {contact ? `${contact.firstName} ${contact.lastName}` : email.to.join(', ')}
            </p>
            <span className="text-xs text-fg-subtle tabular-nums flex-shrink-0">
              {formatRelativeDate(email.sentAt ?? email.createdAt)}
            </span>
          </div>
          <p className={`text-sm truncate leading-snug ${unread ? 'text-fg font-semibold' : 'text-fg'}`}>{email.subject || ''}</p>
          <p className="text-xs text-fg-subtle truncate mt-0.5 leading-snug">{email.body.slice(0, 80)}</p>
          {email.status === 'scheduled' && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-300 border border-accent-500/25">
              <Clock size={9} />
              {email.scheduledFor ? formatDateTime(email.scheduledFor) : t.inbox.scheduled}
            </span>
          )}
          <TrackingBadges email={email} />
          {email.trackingEnabled && (
            <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
              <button type="button"
                onClick={() => onTrackOpen(email.id)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-fg/5 hover:bg-success/15 text-fg-subtle hover:text-success border border-fg/8 transition-colors"
              >
                {t.common.view}
              </button>
              <button type="button"
                onClick={() => onTrackClick(email.id)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-fg/5 hover:bg-info/15 text-fg-subtle hover:text-info border border-fg/8 transition-colors"
              >
                {t.inbox.clicks}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Thread view ──────────────────────────────────────────────────────────────
function ThreadView({
  thread,
  match,
  linkSource,
  hasPersistedLink,
  linkedEmails,
  onReply,
  onReplyAll,
  onCreateFollowUp,
  onThreadAction,
  onPinLink,
  onUnpinLink,
  onManualLinkSave,
  onDownloadAttachment,
  allContacts,
  allDeals,
  canEditLinks,
  canCreateFollowUp,
}: {
  thread: GmailThread | null
  match: ThreadMatch | null
  linkSource: 'auto' | 'manual' | null
  hasPersistedLink: boolean
  linkedEmails: CRMEmail[]
  onReply: (to: string, subject: string) => void
  onReplyAll: (thread: GmailThread, messageIndex: number) => void
  onCreateFollowUp: (thread: GmailThread, match: ThreadMatch | null) => void
  onThreadAction: (thread: GmailThread, action: 'mark_read' | 'mark_unread' | 'archive' | 'trash') => void
  onPinLink: (thread: GmailThread, match: ThreadMatch | null) => void
  onUnpinLink: (thread: GmailThread) => void
  onManualLinkSave: (thread: GmailThread, contactId?: string, dealId?: string) => void
  onDownloadAttachment: (messageId: string, attachmentId: string, filename: string) => void
  allContacts: Contact[]
  allDeals: Array<{ id: string; title: string }>
  canEditLinks: boolean
  canCreateFollowUp: boolean
}) {
  const t = useTranslations()
  const [manualContactId, setManualContactId] = useState(match?.contact?.id ?? '')
  const [manualDealId, setManualDealId] = useState(match?.dealId ?? '')
  const manualContactOptions = useMemo(
    () => [
      { value: '', label: t.inbox.contactPlaceholder },
      ...allContacts.map((c) => ({
        value: c.id,
        label: `${c.firstName} ${c.lastName}`,
      })),
    ],
    [allContacts, t.inbox.contactPlaceholder],
  )
  const manualDealOptions = useMemo(
    () => [
      { value: '', label: t.inbox.dealPlaceholder },
      ...allDeals.map((d) => ({ value: d.id, label: d.title })),
    ],
    [allDeals, t.inbox.dealPlaceholder],
  )

  useEffect(() => {
    setManualContactId(match?.contact?.id ?? '')
    setManualDealId(match?.dealId ?? '')
  }, [match?.contact?.id, match?.dealId])

  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!thread?.messages.length) {
      setExpandedMessageIds(new Set())
      return
    }
    const last = thread.messages[thread.messages.length - 1]
    if (last?.id) setExpandedMessageIds(new Set([last.id]))
  }, [thread?.id, thread?.messages.length])

  const messagePreview = (msg: GmailMessage) => {
    const raw = (msg.snippet || msg.body || '').replace(/\s+/g, ' ').trim()
    return raw.length > 160 ? `${raw.slice(0, 160)}…` : raw
  }

  const toggleMessageExpanded = (messageId: string) => {
    setExpandedMessageIds((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) next.delete(messageId)
      else next.add(messageId)
      return next
    })
  }

  if (!thread) return (
    <div className="flex flex-1 min-h-0 items-center justify-center p-4 bg-gradient-to-b from-surface-1/40 to-surface-0/20">
      <PanelEmpty
        icon={<Mail size={32} className="text-fg-muted opacity-80" />}
        title={t.inbox.readingPaneSelectTitle}
        primary={t.inbox.readingPaneSelectHint}
        density="compact"
      />
    </div>
  )

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-surface-1/50 to-surface-1/20">
      <header className="flex-shrink-0 border-b border-fg/8 bg-surface-1/60">
        <div className="px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold text-fg leading-snug tracking-tight">{thread.messages[0]?.subject ?? ''}</h2>
          <p className="text-2xs text-fg-subtle mt-1 uppercase tracking-wide">
            {t.inbox.threadMessageListLabel}
            {' · '}
            {t.inbox.messageCount.replace('{n}', String(thread.messages.length))}
          </p>
        </div>
        <div
          className="px-3 py-2 flex flex-wrap items-center gap-1.5 border-t border-fg/6"
          role="toolbar"
          aria-label={t.common.actions}
        >
          <Button variant="secondary" size="xs" leftIcon={<CheckCheck size={14} aria-hidden />} onClick={() => onThreadAction(thread, 'mark_read')}>
            {t.inbox.markRead}
          </Button>
          <Button variant="secondary" size="xs" leftIcon={<Mail size={14} aria-hidden />} onClick={() => onThreadAction(thread, 'mark_unread')}>
            {t.inbox.markUnread}
          </Button>
          <Button variant="secondary" size="xs" leftIcon={<Archive size={14} aria-hidden />} onClick={() => onThreadAction(thread, 'archive')}>
            {t.inbox.archive}
          </Button>
          <Button variant="danger" size="xs" leftIcon={<Trash2 size={14} aria-hidden />} onClick={() => onThreadAction(thread, 'trash')}>
            {t.inbox.trash}
          </Button>
        </div>
        <div className="px-3 pb-3 flex flex-wrap items-center gap-2">
          {match?.contact && (
            <Link
              to={`/contacts/${match.contact.id}`}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent-600/20 text-accent-300 border border-accent-500/30 hover:bg-accent-600/30 transition-colors"
            >
              <User size={9} />
              {match.contact.firstName} {match.contact.lastName}
            </Link>
          )}
          {match?.dealId && (
            <Link
              to="/deals"
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-info/15 text-info border border-info/25 hover:bg-info/25 transition-colors"
            >
              {t.inbox.dealPlaceholder}: {match.dealTitle}
            </Link>
          )}
          {match?.companyName && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-fg/8 text-fg-muted border border-fg/10">
              {match.companyName}
            </span>
          )}
          {linkSource && (
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
              linkSource === 'manual'
                ? 'bg-success/15 text-success border-success/20'
                : 'bg-fg/8 text-fg-subtle border-fg/10'
            }`}>
              {linkSource === 'manual' ? t.inbox.pinnedLink : t.inbox.autoLink}
            </span>
          )}
          {!hasPersistedLink && match && canEditLinks && (
            <button type="button"
              onClick={() => onPinLink(thread, match)}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20 hover:bg-success/25 transition-colors"
              title={t.inbox.pinLink}
              aria-label={t.inbox.pinLink}
            >
              {t.inbox.pinLink}
            </button>
          )}
          {hasPersistedLink && canEditLinks && (
            <button type="button"
              onClick={() => onUnpinLink(thread)}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-fg/8 text-fg-muted border border-fg/10 hover:bg-danger/15 hover:text-danger hover:border-danger/20 transition-colors"
              title={t.inbox.unpin}
              aria-label={t.inbox.unpin}
            >
              {t.inbox.unpin}
            </button>
          )}
          {canCreateFollowUp && (
            <button type="button"
              onClick={() => onCreateFollowUp(thread, match)}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/20 hover:bg-warning/25 transition-colors"
              title={t.inbox.followUpCreated}
              aria-label={t.inbox.followUpCreated}
            >
              <Plus size={10} />
              {t.followUps.title}
            </button>
          )}
        </div>
        {canEditLinks && (
          <div className="px-3 pb-3 flex flex-wrap items-center gap-2 border-t border-fg/6">
            <div className="min-w-[7rem] max-w-[10rem]">
              <Select
                ariaLabel={t.inbox.contactPlaceholder}
                value={manualContactId}
                onChange={(e) => setManualContactId(e.target.value)}
                options={manualContactOptions}
                listMaxHeightClass="max-h-48"
                className="[&_button]:rounded-full [&_button]:text-[10px] [&_button]:py-0.5 [&_button]:px-2 [&_button]:min-h-0"
              />
            </div>
            <div className="min-w-[7rem] max-w-[10rem]">
              <Select
                ariaLabel={t.inbox.dealPlaceholder}
                value={manualDealId}
                onChange={(e) => setManualDealId(e.target.value)}
                options={manualDealOptions}
                listMaxHeightClass="max-h-48"
                className="[&_button]:rounded-full [&_button]:text-[10px] [&_button]:py-0.5 [&_button]:px-2 [&_button]:min-h-0"
              />
            </div>
            {match?.dealId && manualDealId !== match.dealId && (
              <button type="button"
                onClick={() => setManualDealId(match.dealId ?? '')}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-info/15 text-info border border-info/25 hover:bg-info/25 transition-colors"
                title={t.inbox.dealPlaceholder}
              >
                {t.inbox.useMatchedDeal}
              </button>
            )}
            <button type="button"
              onClick={() => onManualLinkSave(thread, manualContactId || undefined, manualDealId || undefined)}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent-600/20 text-accent-300 border border-accent-500/30 hover:bg-accent-600/30 transition-colors"
              title={t.inbox.saveLink}
              aria-label={t.inbox.saveLink}
            >
              {t.inbox.saveLink}
            </button>
          </div>
        )}
      </header>
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-2" aria-label={t.inbox.threadMessageListLabel}>
        {thread.messages.map((msg, i) => {
          const expanded = expandedMessageIds.has(msg.id)
          const fromDisplay = msg.from?.replace(/<.*>/, '').trim() || t.inbox.unknownSender
          return (
          <article key={msg.id} className="rounded-2xl border border-fg/10 bg-surface-1/50 shadow-sm overflow-hidden">
            {!expanded ? (
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button type="button"
                  onClick={() => toggleMessageExpanded(msg.id)}
                  className="p-1 rounded-lg text-fg-subtle hover:bg-fg/10 hover:text-fg transition-colors shrink-0"
                  aria-expanded="false"
                  title={t.inbox.threadShowFullMessage}
                  aria-label={t.inbox.threadShowFullMessage}
                >
                  <ChevronRight size={16} aria-hidden />
                </button>
                <div className="w-8 h-8 rounded-full bg-accent-600/20 flex items-center justify-center text-xs font-bold text-accent-400 shrink-0">
                  {(msg.from?.charAt(0) ?? '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{fromDisplay}</p>
                  <p className="text-xs text-fg-subtle truncate">{messagePreview(msg)}</p>
                </div>
                <span className="text-2xs text-fg-subtle shrink-0 tabular-nums hidden sm:inline">{msg.date ? formatDateTime(msg.date) : ''}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="xs"
                    leftIcon={<Reply size={14} aria-hidden />}
                    onClick={() => onReply(msg.from, buildReplySubject(msg.subject))}
                    aria-label={t.inbox.reply}
                    title={t.inbox.reply}
                    className="max-sm:px-2"
                  >
                    <span className="hidden sm:inline">{t.inbox.reply}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    leftIcon={<Reply size={14} aria-hidden />}
                    onClick={() => onReplyAll(thread, i)}
                    aria-label={t.inbox.replyAll}
                    title={t.inbox.replyAll}
                    className="max-sm:px-2"
                  >
                    <span className="hidden sm:inline">{t.inbox.replyAll}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-fg/6 bg-surface-1/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <button type="button"
                      onClick={() => toggleMessageExpanded(msg.id)}
                      className="p-1 rounded-lg text-fg-subtle hover:bg-fg/10 hover:text-fg transition-colors shrink-0"
                      aria-expanded="true"
                      title={t.inbox.threadCollapseMessage}
                      aria-label={t.inbox.threadCollapseMessage}
                    >
                      <ChevronRight size={16} className="rotate-90" aria-hidden />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-accent-600/20 flex items-center justify-center text-xs font-bold text-accent-400 shrink-0">
                      {(msg.from?.charAt(0) ?? '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{fromDisplay}</p>
                      <p className="text-[10px] text-fg-subtle truncate">{t.common.to}: {msg.to}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-fg-subtle shrink-0">
                    <Clock size={12} aria-hidden />
                    <span className="text-xs tabular-nums">{msg.date ? formatDateTime(msg.date) : ''}</span>
                    <Button variant="secondary" size="xs" leftIcon={<Reply size={14} aria-hidden />} onClick={() => onReply(msg.from, buildReplySubject(msg.subject))}>
                      {t.inbox.reply}
                    </Button>
                    <Button variant="secondary" size="xs" leftIcon={<Reply size={14} aria-hidden />} onClick={() => onReplyAll(thread, i)}>
                      {t.inbox.replyAll}
                    </Button>
                  </div>
                </div>
                <div className="px-4 py-4">
                  <p className="text-sm text-fg-muted whitespace-pre-wrap leading-relaxed">{msg.body || msg.snippet}</p>
                  {(msg.attachments?.length ?? 0) > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {msg.attachments!.map((att) => (
                        <button type="button"
                          key={att.attachmentId}
                          onClick={() => onDownloadAttachment(msg.id, att.attachmentId, att.filename)}
                          className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-fg/5 hover:bg-fg/8 border border-fg/10 text-xs text-fg-muted transition-colors"
                        >
                          <span className="inline-flex items-center gap-1 truncate">
                            <Paperclip size={11} />
                            {att.filename}
                          </span>
                          <span className="inline-flex items-center gap-1 text-fg-subtle">
                            <Download size={11} />
                            {Math.ceil((att.size || 0) / 1024)} KB
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </article>
          )
        })}
        {linkedEmails.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-fg-subtle mb-2">{t.inbox.crmSentInThread}</p>
            <div className="space-y-1.5">
              {linkedEmails.map((email) => (
                <p key={email.id} className="text-xs text-fg-muted truncate">
                  {formatRelativeDate(email.sentAt ?? email.createdAt)} - {email.subject}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── LocalEmailView ────────────────────────────────────────────────────────────
function LocalEmailView({
  email,
  contacts,
  onReply,
  onTrackOpen,
  onTrackClick,
}: {
  email: CRMEmail | null
  contacts: Contact[]
  onReply: (to: string, subject: string) => void
  onTrackOpen: (id: string) => void
  onTrackClick: (id: string) => void
}) {
  const t = useTranslations()

  if (!email) return (
    <div className="flex flex-1 min-h-0 items-center justify-center p-4 bg-gradient-to-b from-surface-1/40 to-surface-0/20">
      <PanelEmpty
        icon={<Mail size={32} className="text-fg-muted opacity-80" />}
        title={t.inbox.readingPaneSelectTitle}
        primary={t.inbox.readingPaneSelectHint}
        density="compact"
      />
    </div>
  )

  const contact = email.contactId ? contacts.find((c) => c.id === email.contactId) : undefined

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full">
      <div className="px-4 py-3 border-b border-fg/8 flex-shrink-0 flex items-center justify-between bg-surface-1/40">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-fg truncate">{email.subject || ''}</h2>
          <p className="text-xs text-fg-subtle mt-0.5">
            {t.common.to}: {contact ? `${contact.firstName} ${contact.lastName}` : email.to.join(', ')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => onReply(email.to.join(', '), buildReplySubject(email.subject))}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-fg/6 hover:bg-accent-600/15 hover:text-accent-400 text-fg-muted transition-colors"
          >
            <Reply size={12} />
            {t.inbox.reply}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-fg/6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full btn-gradient flex items-center justify-center text-xs font-bold text-fg">
              {email.from.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-fg">{email.from}</p>
              <p className="text-[10px] text-fg-subtle">
                {email.sentAt ? formatDateTime(email.sentAt) : ''}
                {email.gmailMessageId && (
                  <span className="ml-2 text-success">{t.settings.connected} Gmail</span>
                )}
              </p>
              <TrackingBadges email={email} />
              {email.trackingEnabled && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <button type="button"
                    onClick={() => onTrackOpen(email.id)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-fg/5 hover:bg-success/15 text-fg-subtle hover:text-success border border-fg/8 transition-colors"
                  >
                    {t.common.view}
                  </button>
                  <button type="button"
                    onClick={() => onTrackClick(email.id)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-fg/5 hover:bg-info/15 text-fg-subtle hover:text-info border border-fg/8 transition-colors"
                  >
                    {t.inbox.clicks}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="px-4 py-4">
            <p className="text-sm text-fg-muted whitespace-pre-wrap leading-relaxed">{email.body}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function Inbox() {
  const t = useTranslations()
  const currentUser = useAuthStore((s) => s.currentUser)
  const {
    emails, threads, threadsLoading,
    gmailAddress, threadLinks, threadWorkspace, threadsError, threadsLastSyncedAt, threadsNextPageToken, threadsHistoryId, syncState, lastSyncErrorAt, lastSyncErrorMessage, fetchThreadLinks, fetchThreadWorkspace, setThreadLink, clearThreadLink, setThreadOwner, setThreadNote, deleteEmail, disconnectGmail,
    trackEmailOpen, trackEmailClick, processScheduledEmails, refreshTrackingMetrics, wakeDueSnoozedEmails, snoozeEmail,
  } = useEmailStore()
  const { inboxViews, addInboxView, deleteInboxView } = useViewsStore()
  const { accessToken, setGmailToken, clearGmailToken } = useGmailToken()
  const contacts = useContactsStore((s) => s.contacts)
  const deals = useDealsStore((s) => s.deals)
  const companies = useCompaniesStore((s) => s.companies)
  const orgUsers = useAuthStore((s) => s.users)
  const addActivity = useActivitiesStore((s) => s.addActivity)
  const { settings } = useSettingsStore()

  const [folder, setFolder] = useState<'inbox' | 'sent' | 'scheduled' | 'drafts' | 'snoozed'>('inbox')
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  /** Reply composer embedded in the reading pane (not the modal). */
  const [threadInlineReply, setThreadInlineReply] = useState<{
    to: string
    subject: string
    defaultCc?: string
  } | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [listQuery, setListQuery] = useState('')
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set())
  const [selectedLocalEmailIds, setSelectedLocalEmailIds] = useState<Set<string>>(new Set())
  const [inboxQuickFilter, setInboxQuickFilter] = useState<'all' | 'unread' | 'linked' | 'mine'>('all')
  const [emailQuickFilter, setEmailQuickFilter] = useState<'all' | 'tracked' | 'opened' | 'clicked'>('all')
  const [advancedFilters, setAdvancedFilters] = useState<InboxAdvancedFilters>({
    unreadOnly: false,
    linkedOnly: false,
    mineOnly: false,
    hasAttachments: false,
    tracking: 'all',
  })
  const [selectedInboxViewId, setSelectedInboxViewId] = useState('')
  const [newInboxViewName, setNewInboxViewName] = useState('')

  const [isWideViewport, setIsWideViewport] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsWideViewport(mq.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const canCreateActivities = !!currentUser && hasPermission(currentUser.role, 'activities:create')
  const canLinkEmails = !!currentUser && hasPermission(currentUser.role, 'email:link')
  const canDeleteEmails = !!currentUser && hasPermission(currentUser.role, 'email:update')

  const connected = !!gmailAddress

  // Build contact email lookup map for thread chip matching
  const contactByEmail = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const c of contacts) {
      if (c.email) map.set(c.email.toLowerCase(), { id: c.id, name: `${c.firstName} ${c.lastName}`.trim() })
    }
    return map
  }, [contacts])

  useEffect(() => {
    refreshTrackingMetrics().catch(() => {
      // Non-blocking: tracking counters are best-effort.
    })
  }, [refreshTrackingMetrics, emails.length])

  async function refreshAccessToken(): Promise<string> {
    const { data, error } = await supabase!.functions.invoke('gmail-refresh-token')
    if (error || !data?.access_token) {
      throw new Error('Token refresh failed — please reconnect Gmail')
    }
    const newExpiry = Date.now() + (data.expires_in ?? 3600) * 1000
    setGmailToken(data.access_token, newExpiry)
    return data.access_token as string
  }

  // 401 refresh+retry wrapper
  async function refreshAndRetry<T>(fn: (token: string) => Promise<T>): Promise<T> {
    const activeToken = accessToken ?? await refreshAccessToken()
    try {
      return await fn(activeToken)
    } catch (err) {
      if (err instanceof GmailApiError && err.status === 401) {
        const refreshedToken = await refreshAccessToken()
        return await fn(refreshedToken)
      }
      throw err
    }
  }

  const handleLoadThreads = async (query = '', options: { silent?: boolean } = {}) => {
    try {
      const gmailQuery = toGmailThreadsListQuery(query)
      await refreshAndRetry((token) => useEmailStore.getState().loadThreads(token, gmailQuery))
      if (query.trim()) trackUxAction('inbox_search', { queryLength: query.trim().length })
    } catch (err) {
      if (!options.silent) toast.error(err instanceof Error ? err.message : t.errors.generic)
    }
  }

  const handleLoadMoreThreads = async () => {
    if (!threadsNextPageToken) return
    try {
      await refreshAndRetry((token) =>
        useEmailStore.getState().loadThreads(token, toGmailThreadsListQuery(listQuery.trim()), {
          append: true,
          pageToken: threadsNextPageToken,
        }),
      )
      trackUxAction('inbox_load_more')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errors.generic)
    }
  }

  // Load Gmail threads when connected (token can be refreshed on-demand)
  useEffect(() => {
    if (connected && folder === 'inbox') {
      handleLoadThreads('', { silent: true })
    }
  }, [connected, folder])

  useEffect(() => {
    if (connected) {
      fetchThreadLinks()
      fetchThreadWorkspace()
    }
  }, [connected, fetchThreadLinks, fetchThreadWorkspace])

  useEffect(() => {
    if (!connected || folder !== 'inbox') return
    const timer = window.setTimeout(() => {
      handleLoadThreads(listQuery.trim(), { silent: true })
    }, 280)
    return () => window.clearTimeout(timer)
  }, [listQuery, connected, folder])

  const handleConnectGmail = async () => {
    const clientId = settings.googleClientId
    if (!clientId) {
      toast.error(`${t.settings.gmailIntegration} ${t.settings.apiKey}`)
      return
    }
    setConnecting(true)
    try {
      await initiateGmailOAuth(clientId)
      // Browser will redirect — no further action needed here
    } catch (err) {
      setConnecting(false)
      toast.error(err instanceof Error ? err.message : t.errors.gmailConnectionError)
    }
  }

  useEffect(() => {
    if (!connected) return
    const run = async () => {
      try {
        await refreshAndRetry(async (token) => processScheduledEmails(token))
      } catch {
        // ignore periodic scheduler errors
      }
    }
    run()
    const id = window.setInterval(run, 15000)
    return () => window.clearInterval(id)
  }, [connected, processScheduledEmails, accessToken])

  useEffect(() => {
    const id = window.setInterval(() => {
      wakeDueSnoozedEmails()
    }, 5000)
    return () => window.clearInterval(id)
  }, [wakeDueSnoozedEmails])

  const mailboxEmails = useMemo(
    () => {
      if (!currentUser?.id) return emails
      return emails.filter((e) => !e.ownerUserId || e.ownerUserId === currentUser.id)
    },
    [emails, currentUser?.id],
  )
  const sentEmails = useMemo(() => mailboxEmails.filter((e) => e.status === 'sent'), [mailboxEmails])
  const scheduledEmails = useMemo(() => mailboxEmails.filter((e) => e.status === 'scheduled'), [mailboxEmails])
  const draftEmails = useMemo(
    () => mailboxEmails.filter((e) => e.status === 'draft' || e.status === 'failed'),
    [mailboxEmails],
  )
  const snoozedEmails = useMemo(() => mailboxEmails.filter((e) => e.status === 'snoozed'), [mailboxEmails])
  const folderNav = useMemo(() => {
    const inboxUnread = threads.reduce((acc, th) => {
      const last = th.messages[th.messages.length - 1]
      return acc + (last?.labelIds?.includes('UNREAD') ? 1 : 0)
    }, 0)
    return {
      inbox: { total: threads.length, unread: inboxUnread },
      sent: { total: sentEmails.length, unread: sentEmails.filter((e) => e.isRead === false).length },
      scheduled: { total: scheduledEmails.length, unread: scheduledEmails.filter((e) => e.isRead === false).length },
      drafts: { total: draftEmails.length, unread: draftEmails.filter((e) => e.isRead === false).length },
      snoozed: { total: snoozedEmails.length, unread: snoozedEmails.filter((e) => e.isRead === false).length },
    }
  }, [threads, sentEmails, scheduledEmails, draftEmails, snoozedEmails])

  const FOLDERS = useMemo(
    () => [
      { id: 'inbox' as const, label: t.inbox.title, icon: <InboxIcon size={15} />, ...folderNav.inbox },
      { id: 'sent' as const, label: t.inbox.sent, icon: <Send size={15} />, ...folderNav.sent },
      { id: 'scheduled' as const, label: t.email.sendLater, icon: <Clock size={15} />, ...folderNav.scheduled },
      { id: 'drafts' as const, label: t.inbox.drafts, icon: <Mail size={15} />, ...folderNav.drafts },
      { id: 'snoozed' as const, label: t.inbox.snoozed, icon: <Clock size={15} />, ...folderNav.snoozed },
    ],
    [t, folderNav],
  )

  const hasReadingSelection =
    (folder === 'inbox' && selectedThreadId !== null) ||
    (folder !== 'inbox' && selectedEmailId !== null)

  /** CRM emails linked by gmailThreadId supply is:tracked / opened / clicked for Gmail threads (client filter). */
  const threadCrmTrackingById = useMemo(() => {
    const map = new Map<string, { tracked: boolean; opened: boolean; clicked: boolean }>()
    for (const e of mailboxEmails) {
      const tid = e.gmailThreadId
      if (!tid) continue
      const cur = map.get(tid) ?? { tracked: false, opened: false, clicked: false }
      if (e.trackingEnabled) cur.tracked = true
      if ((e.openCount ?? 0) > 0) cur.opened = true
      if ((e.clickCount ?? 0) > 0) cur.clicked = true
      map.set(tid, cur)
    }
    return map
  }, [mailboxEmails])
  const queryMatcher = useMemo(() => buildInboxQueryMatcher(listQuery), [listQuery])
  const filteredThreads = threads.filter((thread) => {
    const lastMsg = thread.messages[thread.messages.length - 1]
    const crm = threadCrmTrackingById.get(thread.id) ?? { tracked: false, opened: false, clicked: false }
    return queryMatcher({
      from: lastMsg?.from ?? '',
      to: parseEmails(lastMsg?.to ?? ''),
      subject: lastMsg?.subject ?? '',
      snippet: thread.snippet ?? '',
      body: thread.messages.map((msg) => msg.body ?? msg.snippet ?? '').join('\n'),
      unread: Boolean(lastMsg?.labelIds?.includes('UNREAD')),
      hasAttachment: thread.messages.some((message) => (message.attachments?.length ?? 0) > 0),
      tracked: crm.tracked,
      opened: crm.opened,
      clicked: crm.clicked,
      mine: (threadWorkspace[thread.id]?.ownerUserId ?? '') === (currentUser?.id ?? ''),
    })
  })
  const filteredSentEmails = sentEmails.filter((email) => queryMatcher({
    from: email.from,
    to: email.to,
    subject: email.subject,
    snippet: email.body.slice(0, 200),
    body: email.body,
    unread: email.isRead === false,
    hasAttachment: (email.attachments?.length ?? 0) > 0,
    tracked: Boolean(email.trackingEnabled),
    opened: (email.openCount ?? 0) > 0,
    clicked: (email.clickCount ?? 0) > 0,
    mine: (email.ownerUserId ?? '') === (currentUser?.id ?? ''),
  }))
  const filteredScheduledEmails = scheduledEmails.filter((email) => queryMatcher({
    from: email.from,
    to: email.to,
    subject: email.subject,
    snippet: email.body.slice(0, 200),
    body: email.body,
    unread: email.isRead === false,
    hasAttachment: (email.attachments?.length ?? 0) > 0,
    tracked: Boolean(email.trackingEnabled),
    opened: (email.openCount ?? 0) > 0,
    clicked: (email.clickCount ?? 0) > 0,
    mine: (email.ownerUserId ?? '') === (currentUser?.id ?? ''),
  }))
  const filteredDraftEmails = draftEmails.filter((email) => queryMatcher({
    from: email.from,
    to: email.to,
    subject: email.subject,
    snippet: email.body.slice(0, 200),
    body: email.body,
    unread: email.isRead === false,
    hasAttachment: (email.attachments?.length ?? 0) > 0,
    tracked: false,
    opened: false,
    clicked: false,
    mine: (email.ownerUserId ?? '') === (currentUser?.id ?? ''),
  }))
  const filteredSnoozedEmails = snoozedEmails.filter((email) => queryMatcher({
    from: email.from,
    to: email.to,
    subject: email.subject,
    snippet: email.body.slice(0, 200),
    body: email.body,
    unread: email.isRead === false,
    hasAttachment: (email.attachments?.length ?? 0) > 0,
    tracked: Boolean(email.trackingEnabled),
    opened: (email.openCount ?? 0) > 0,
    clicked: (email.clickCount ?? 0) > 0,
    mine: (email.ownerUserId ?? '') === (currentUser?.id ?? ''),
  }))
  const selectedThread = threads.find((th) => th.id === selectedThreadId) ?? null
  const selectedEmail = mailboxEmails.find((e) => e.id === selectedEmailId) ?? null

  const threadMatchById = useMemo(
    () => buildAutoThreadMatchMap(threads, contacts, companies, deals),
    [threads, contacts, companies, deals],
  )

  const persistedThreadMatchById = useMemo(
    () => buildPersistedThreadMatchMap(threadLinks, contacts, companies, deals),
    [threadLinks, contacts, companies, deals],
  )

  const selectedThreadMatch = selectedThread
    ? (persistedThreadMatchById.get(selectedThread.id) ?? threadMatchById.get(selectedThread.id) ?? null)
    : null
  const selectedThreadLink = selectedThread ? (threadLinks[selectedThread.id] ?? null) : null
  const selectedWorkspace = selectedThread ? (threadWorkspace[selectedThread.id] ?? null) : null
  const selectedThreadLinkedEmails = selectedThread
    ? mailboxEmails.filter((e) => e.gmailThreadId === selectedThread.id)
    : []

  const inboxThreadsVisible = filteredThreads.filter((thread) => {
    if (inboxQuickFilter === 'all') return true
    if (inboxQuickFilter === 'unread') {
      const lastMsg = thread.messages[thread.messages.length - 1]
      return Boolean(lastMsg?.labelIds?.includes('UNREAD'))
    }
    if (inboxQuickFilter === 'mine') {
      return (threadWorkspace[thread.id]?.ownerUserId ?? '') === (currentUser?.id ?? '')
    }
    const match = persistedThreadMatchById.get(thread.id) ?? threadMatchById.get(thread.id)
    if (!(match?.contact || match?.companyId || match?.dealId)) return false
    return true
  }).filter((thread) => {
    const lastMsg = thread.messages[thread.messages.length - 1]
    const hasAttachment = thread.messages.some((message) => (message.attachments?.length ?? 0) > 0)
    const linked = Boolean((persistedThreadMatchById.get(thread.id) ?? threadMatchById.get(thread.id))?.contact
      || (persistedThreadMatchById.get(thread.id) ?? threadMatchById.get(thread.id))?.companyId
      || (persistedThreadMatchById.get(thread.id) ?? threadMatchById.get(thread.id))?.dealId)
    const mine = (threadWorkspace[thread.id]?.ownerUserId ?? '') === (currentUser?.id ?? '')
    if (advancedFilters.unreadOnly && !lastMsg?.labelIds?.includes('UNREAD')) return false
    if (advancedFilters.linkedOnly && !linked) return false
    if (advancedFilters.mineOnly && !mine) return false
    if (advancedFilters.hasAttachments && !hasAttachment) return false
    return true
  })

  const applyEmailQuickFilter = (items: CRMEmail[]) => items.filter((email) => {
    if (emailQuickFilter === 'all') return true
    if (emailQuickFilter === 'tracked') return Boolean(email.trackingEnabled)
    if (emailQuickFilter === 'opened') return (email.openCount ?? 0) > 0
    if ((email.clickCount ?? 0) <= 0) return false
    return true
  }).filter((email) => {
    if (advancedFilters.tracking === 'tracked' && !email.trackingEnabled) return false
    if (advancedFilters.tracking === 'opened' && (email.openCount ?? 0) <= 0) return false
    if (advancedFilters.tracking === 'clicked' && (email.clickCount ?? 0) <= 0) return false
    return true
  })

  const sentEmailsVisible = applyEmailQuickFilter(filteredSentEmails)
  const scheduledEmailsVisible = applyEmailQuickFilter(filteredScheduledEmails)
  const draftEmailsVisible = filteredDraftEmails
  const snoozedEmailsVisible = applyEmailQuickFilter(filteredSnoozedEmails)
  const localFolderVisibleEmails = useMemo(() => {
    if (folder === 'sent') return sentEmailsVisible
    if (folder === 'scheduled') return scheduledEmailsVisible
    if (folder === 'drafts') return draftEmailsVisible
    if (folder === 'snoozed') return snoozedEmailsVisible
    return []
  }, [folder, sentEmailsVisible, scheduledEmailsVisible, draftEmailsVisible, snoozedEmailsVisible])

  const listPaneSubtitle = useMemo(() => {
    if (folder === 'inbox') {
      const total = threads.length
      const vis = inboxThreadsVisible.length
      return vis === total
        ? t.inbox.listTotalThreads.replace('{n}', String(total))
        : t.inbox.listVisibleOfTotal.replace('{visible}', String(vis)).replace('{total}', String(total))
    }
    if (folder === 'sent') {
      const total = sentEmails.length
      const vis = sentEmailsVisible.length
      return vis === total
        ? t.inbox.listTotalMessages.replace('{n}', String(total))
        : t.inbox.listVisibleMessages.replace('{visible}', String(vis)).replace('{total}', String(total))
    }
    if (folder === 'scheduled') {
      const total = scheduledEmails.length
      const vis = scheduledEmailsVisible.length
      return vis === total
        ? t.inbox.listTotalMessages.replace('{n}', String(total))
        : t.inbox.listVisibleMessages.replace('{visible}', String(vis)).replace('{total}', String(total))
    }
    if (folder === 'drafts') {
      const total = draftEmails.length
      const vis = draftEmailsVisible.length
      return vis === total
        ? t.inbox.listTotalMessages.replace('{n}', String(total))
        : t.inbox.listVisibleMessages.replace('{visible}', String(vis)).replace('{total}', String(total))
    }
    if (folder === 'snoozed') {
      const total = snoozedEmails.length
      const vis = snoozedEmailsVisible.length
      return vis === total
        ? t.inbox.listTotalMessages.replace('{n}', String(total))
        : t.inbox.listVisibleMessages.replace('{visible}', String(vis)).replace('{total}', String(total))
    }
    return ''
  }, [
    folder,
    threads.length,
    inboxThreadsVisible.length,
    t,
    sentEmails.length,
    sentEmailsVisible.length,
    scheduledEmails.length,
    scheduledEmailsVisible.length,
    draftEmails.length,
    draftEmailsVisible.length,
    snoozedEmails.length,
    snoozedEmailsVisible.length,
  ])

  const isSyncStale = !!threadsLastSyncedAt && Date.now() - new Date(threadsLastSyncedAt).getTime() > 10 * 60 * 1000
  const syncVisualState = syncState === 'error' ? 'error' : (syncState === 'syncing' ? 'syncing' : (isSyncStale ? 'stale' : 'healthy'))
  const syncText = syncVisualState === 'syncing'
    ? t.inbox.syncSyncing
    : syncVisualState === 'error'
      ? t.inbox.syncError
      : syncVisualState === 'stale'
        ? t.inbox.syncStale
        : t.inbox.syncHealthy

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (folder !== 'inbox') return
      const el = e.target as HTMLElement | null
      if (!el) return
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable) return
      if (e.key !== 'j' && e.key !== 'k' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      const list = inboxThreadsVisible
      if (!list.length) return
      e.preventDefault()
      const down = e.key === 'j' || e.key === 'ArrowDown'
      let i = list.findIndex((th) => th.id === selectedThreadId)
      if (i < 0) i = 0
      else if (down) i = Math.min(list.length - 1, i + 1)
      else i = Math.max(0, i - 1)
      const pick = list[i]
      if (pick) {
        setSelectedThreadId(pick.id)
        setSelectedEmailId(null)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [folder, inboxThreadsVisible, selectedThreadId])

  const applyInboxSavedView = (viewId: string) => {
    setSelectedInboxViewId(viewId)
    const view = inboxViews.find((item) => item.id === viewId)
    if (!view) return
    setListQuery(view.query)
    setAdvancedFilters(view.filters)
  }

  const saveCurrentInboxView = () => {
    if (!newInboxViewName.trim()) return
    const created = addInboxView(newInboxViewName, listQuery, advancedFilters)
    setSelectedInboxViewId(created.id)
    setNewInboxViewName('')
    toast.success(t.inbox.savedViewCreated)
  }

  const openInlineReply = (to: string, subject: string, defaultCc?: string) => {
    setThreadInlineReply(defaultCc ? { to, subject, defaultCc } : { to, subject })
    setComposerOpen(false)
  }

  useEffect(() => {
    setThreadInlineReply(null)
  }, [selectedThreadId, selectedEmailId, folder])

  const toggleBulkThread = (threadId: string) => {
    setSelectedThreadIds((prev) => {
      const next = new Set(prev)
      if (next.has(threadId)) next.delete(threadId)
      else next.add(threadId)
      return next
    })
  }

  const toggleBulkLocalEmail = (emailId: string) => {
    setSelectedLocalEmailIds((prev) => {
      const next = new Set(prev)
      if (next.has(emailId)) next.delete(emailId)
      else next.add(emailId)
      return next
    })
  }

  const selectAllVisibleLocalEmails = () => {
    setSelectedLocalEmailIds(new Set(localFolderVisibleEmails.map((e) => e.id)))
  }

  const clearLocalBulkSelection = () => setSelectedLocalEmailIds(new Set())

  const selectAllVisibleInboxThreads = () => {
    setSelectedThreadIds(new Set(inboxThreadsVisible.map((th) => th.id)))
  }

  const clearThreadBulkSelection = () => setSelectedThreadIds(new Set())

  const applyBulkLocalEmailAction = (
    action: 'mark_read' | 'mark_unread' | 'delete' | 'snooze_1h' | 'snooze_1d' | 'snooze_1w',
  ) => {
    if (!selectedLocalEmailIds.size) return
    const ids = [...selectedLocalEmailIds]
    const store = useEmailStore.getState()
    let applied = 0
    for (const id of ids) {
      const email = mailboxEmails.find((e) => e.id === id)
      if (!email) continue
      if (action === 'delete' && !canDeleteEmails) continue
      applied += 1
      if (action === 'mark_read') {
        store.updateEmail(id, { isRead: true })
      } else if (action === 'mark_unread') {
        store.updateEmail(id, { isRead: false })
      } else if (action === 'delete') {
        deleteEmail(id)
        if (selectedEmailId === id) setSelectedEmailId(null)
      } else {
        const ms =
          action === 'snooze_1h'
            ? 60 * 60 * 1000
            : action === 'snooze_1d'
              ? 24 * 60 * 60 * 1000
              : 7 * 24 * 60 * 60 * 1000
        snoozeEmail(id, new Date(Date.now() + ms).toISOString())
      }
    }
    setSelectedLocalEmailIds(new Set())
    if (!applied) return
    toast.success(t.inbox.appliedToMessages.replace('{n}', String(applied)))
  }

  const applyBulkThreadAction = async (action: 'mark_read' | 'mark_unread' | 'archive' | 'trash') => {
    if (!selectedThreadIds.size) return
    try {
      const ids = [...selectedThreadIds]
      await refreshAndRetry(async (token) => {
        await Promise.all(ids.map((threadId) => {
          if (action === 'mark_read') {
            return modifyGmailThreadLabels(token, threadId, { removeLabelIds: ['UNREAD'] })
          }
          if (action === 'mark_unread') {
            return modifyGmailThreadLabels(token, threadId, { addLabelIds: ['UNREAD'] })
          }
          if (action === 'archive') {
            return modifyGmailThreadLabels(token, threadId, { removeLabelIds: ['INBOX'] })
          }
          return trashGmailThread(token, threadId)
        }))
      })

      setSelectedThreadIds(new Set())
      setSelectedThreadId(null)
      await handleLoadThreads(listQuery)
      toast.success(t.inbox.appliedToThreads.replace('{n}', String(ids.length)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errors.gmailConnectionError)
    }
  }

  const openReplyAll = (thread: GmailThread, messageIndex: number) => {
    const msg = thread.messages[messageIndex]
    if (!msg) return
    const currentMailbox = (gmailAddress ?? '').toLowerCase().trim()
    const recipients = [
      ...parseEmails(msg.from),
      ...parseEmails(msg.to),
      ...parseEmails(msg.cc ?? ''),
    ].filter((email, idx, arr) => email !== currentMailbox && arr.indexOf(email) === idx)
    openInlineReply(recipients.join(', '), buildReplySubject(msg.subject))
  }

  const runThreadAction = async (thread: GmailThread, action: 'mark_read' | 'mark_unread' | 'archive' | 'trash') => {
    try {
      await refreshAndRetry(async (token) => {
        if (action === 'mark_read') {
          await modifyGmailThreadLabels(token, thread.id, { removeLabelIds: ['UNREAD'] })
          return
        }
        if (action === 'mark_unread') {
          await modifyGmailThreadLabels(token, thread.id, { addLabelIds: ['UNREAD'] })
          return
        }
        if (action === 'archive') {
          await modifyGmailThreadLabels(token, thread.id, { removeLabelIds: ['INBOX'] })
          return
        }
        await trashGmailThread(token, thread.id)
      })
      await handleLoadThreads(listQuery)
      toast.success(`${t.inbox.threadUpdated}: ${action}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errors.gmailConnectionError)
    }
  }

  const handleDisconnectGmail = async () => {
    if (!supabase) {
      clearGmailToken()
      disconnectGmail()
      return
    }
    setDisconnecting(true)
    try {
      const { error } = await supabase.functions.invoke('gmail-disconnect')
      if (error) throw error
      clearGmailToken()
      disconnectGmail()
      toast.success(t.settings.gmailDisconnected)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.inbox.disconnectError)
    } finally {
      setDisconnecting(false)
    }
  }

  const createFollowUpFromThread = (thread: GmailThread, match: ThreadMatch | null) => {
    const lastSubject = thread.messages[thread.messages.length - 1]?.subject ?? thread.messages[0]?.subject ?? 'Email follow-up'
    addActivity({
      type: 'task',
      subject: `${t.followUps.title}: ${lastSubject}`,
      description: `Auto-created from Gmail thread ${thread.id}`,
      status: 'pending',
      contactId: match?.contact?.id,
      companyId: match?.companyId,
      dealId: match?.dealId,
      createdBy: '',
    })
    toast.success(t.inbox.followUpCreated)
  }

  const pinThreadLink = (thread: GmailThread, match: ThreadMatch | null) => {
    if (!match || (!match.contact?.id && !match.companyId && !match.dealId)) {
      toast.error(t.inbox.noEntityToPin)
      return
    }

    setThreadLink({
      threadId: thread.id,
      contactId: match.contact?.id,
      companyId: match.companyId,
      dealId: match.dealId,
      source: 'manual',
    })
    toast.success(t.inbox.pinnedLink)
  }

  const unpinThreadLink = (thread: GmailThread) => {
    clearThreadLink(thread.id)
    toast.success(t.inbox.pinnedLinkRemoved)
  }

  const saveManualThreadLink = (thread: GmailThread, contactId?: string, dealId?: string) => {
    const deal = dealId ? deals.find((d) => d.id === dealId) : undefined
    const contact = contactId ? contacts.find((c) => c.id === contactId) : undefined
    setThreadLink({
      threadId: thread.id,
      contactId: contact?.id,
      dealId: deal?.id,
      companyId: deal?.companyId ?? contact?.companyId,
      source: 'manual',
    })
    toast.success(t.inbox.manualLinkSaved)
  }

  const handleDownloadAttachment = async (messageId: string, attachmentId: string, filename: string) => {
    try {
      await refreshAndRetry(async (token) => {
        const { data } = await downloadGmailAttachment(token, messageId, attachmentId)
        const bytes = atob(data.replace(/-/g, '+').replace(/_/g, '/'))
        const arr = new Uint8Array(bytes.length)
        for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i)
        const blob = new Blob([arr])
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename || 'attachment'
        a.click()
        URL.revokeObjectURL(url)
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.inbox.downloadAttachmentError)
    }
  }

  return (
    <div className="crm-page-full flex flex-col h-full min-h-0 overflow-hidden py-2 sm:py-3 lg:py-4 gap-2 lg:gap-3">
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-2 lg:gap-3">
      {/* ── Left: Folders (Gmail-style rail) ─────────────────────────────── */}
      <nav
        className="w-full min-h-0 lg:w-[228px] lg:flex-shrink-0 border border-fg/10 rounded-xl lg:rounded-2xl overflow-hidden flex flex-col bg-surface-2/55 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
        aria-label={t.inbox.foldersNavLabel}
      >
        <div className="p-3 border-b border-fg/10 bg-surface-1/30">
          <PermissionGate permission="email:send">
            <button type="button"
              onClick={() => {
                setSelectedEmailId(null)
                setSelectedThreadId(null)
                setThreadInlineReply(null)
                setComposerOpen(true)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl btn-gradient text-fg text-xs font-semibold"
            >
              <Plus size={13} />
              {t.inbox.compose}
            </button>
          </PermissionGate>
        </div>

        {/* Connection status */}
        <div className="px-3 py-2 border-b border-fg/10">
          {connected ? (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-success/10 border border-success/20">
              <Wifi size={11} className="text-success" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-success truncate">{gmailAddress ?? 'Gmail'}</p>
              </div>
              <button type="button"
                onClick={handleDisconnectGmail}
                disabled={disconnecting}
                className="text-fg-subtle hover:text-danger transition-colors"
                title={t.settings.disconnect}
                aria-label={t.settings.disconnect}
              >
                {disconnecting ? <Loader2 size={10} className="animate-spin" /> : <WifiOff size={10} />}
              </button>
            </div>
          ) : (
            <button type="button"
              onClick={handleConnectGmail}
              disabled={connecting}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-fg/4 hover:bg-accent-600/15 border border-fg/8 hover:border-accent-500/30 text-fg-subtle hover:text-accent-400 transition-colors text-[10px] font-medium"
            >
              {connecting ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
              {t.settings.connect} Gmail
            </button>
          )}
        </div>

        <div className="flex-1 p-2 space-y-0.5 min-h-0 overflow-y-auto">
          {FOLDERS.map((f) => (
            <button type="button"
              key={f.id}
              onClick={() => {
                setFolder(f.id as 'inbox' | 'sent' | 'scheduled' | 'drafts' | 'snoozed')
                setSelectedThreadId(null)
                setSelectedEmailId(null)
                setSelectedThreadIds(new Set())
                setSelectedLocalEmailIds(new Set())
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                folder === f.id
                  ? 'nav-active text-fg font-semibold shadow-sm bg-fg/[0.06]'
                  : 'text-fg-muted hover:text-fg hover:bg-fg/[0.05] font-medium'
              }`}
            >
              {f.icon}
              <span className="flex-1 text-left">{f.label}</span>
              <span className="flex items-center gap-1 shrink-0">
                {f.unread > 0 && (
                  <span
                    className="inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-accent-500/20 border border-accent-500/30 text-[10px] font-semibold text-accent-300"
                    title={t.inbox.folderUnreadTooltip}
                  >
                    {f.unread}
                  </span>
                )}
                <span
                  className="text-[11px] tabular-nums font-medium text-fg-muted min-w-[1.1rem] text-right"
                  title={t.inbox.folderTotalTooltip}
                >
                  {f.total}
                </span>
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── Center: thread / message list ───────────────────────────────── */}
      <section
        className={`w-full min-h-[200px] lg:min-h-0 lg:w-[min(100%,460px)] lg:max-w-lg lg:flex-shrink-0 border border-fg/10 rounded-xl lg:rounded-2xl overflow-hidden flex flex-col bg-surface-1/80 shadow-md ${
          !isWideViewport && hasReadingSelection ? 'hidden' : ''
        } lg:flex`}
        aria-label={t.inbox.threadListLabel}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-fg/10 flex-shrink-0 bg-gradient-to-b from-surface-2/90 to-surface-1/95">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-fg tracking-tight truncate">
              {FOLDERS.find((f) => f.id === folder)?.label}
            </h2>
            {listPaneSubtitle && (
              <p className="text-xs text-fg-subtle mt-0.5 truncate">{listPaneSubtitle}</p>
            )}
            {folder === 'inbox' && threadsLastSyncedAt && (
              <p className="text-[10px] text-fg-subtle mt-0.5 truncate">
                {t.common.updatedAt}: {formatDateTime(threadsLastSyncedAt)}
                {threadsHistoryId ? ` · h:${threadsHistoryId}` : ''}
              </p>
            )}
          </div>
          {connected && folder === 'inbox' && (
            <button type="button"
              onClick={() => handleLoadThreads()}
              disabled={threadsLoading}
              className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-fg/10 border border-transparent hover:border-fg/10 transition-colors shrink-0"
              title={t.inbox.refreshInbox}
              aria-label={t.inbox.refreshInbox}
            >
              <RefreshCw size={15} className={threadsLoading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
        {folder === 'inbox' && connected && selectedThreadIds.size > 0 && (
          <div className="px-3 py-2.5 border-b border-fg/8 bg-surface-2/50 flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
            <span className="text-xs text-fg-muted font-medium shrink-0">
              {t.inbox.selectedCount.replace('{n}', String(selectedThreadIds.size))}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
              <Button
                variant="secondary"
                size="xs"
                leftIcon={<CheckCheck size={14} aria-hidden />}
                onClick={() => applyBulkThreadAction('mark_read')}
              >
                {t.inbox.markRead}
              </Button>
              <Button
                variant="secondary"
                size="xs"
                leftIcon={<Mail size={14} aria-hidden />}
                onClick={() => applyBulkThreadAction('mark_unread')}
              >
                {t.inbox.markUnread}
              </Button>
              <Button
                variant="secondary"
                size="xs"
                leftIcon={<Archive size={14} aria-hidden />}
                onClick={() => applyBulkThreadAction('archive')}
              >
                {t.inbox.archive}
              </Button>
              <Button
                variant="danger"
                size="xs"
                leftIcon={<Trash2 size={14} aria-hidden />}
                onClick={() => applyBulkThreadAction('trash')}
              >
                {t.inbox.trash}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<ListChecks size={14} aria-hidden />}
                onClick={selectAllVisibleInboxThreads}
                disabled={inboxThreadsVisible.length === 0}
              >
                {t.common.selectAll}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<X size={14} aria-hidden />}
                onClick={clearThreadBulkSelection}
              >
                {t.common.clear}
              </Button>
            </div>
          </div>
        )}
        {(folder === 'sent' || folder === 'scheduled' || folder === 'drafts' || folder === 'snoozed') && selectedLocalEmailIds.size > 0 && (
          <div className="px-3 py-2.5 border-b border-fg/8 bg-surface-2/50 flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
            <span className="text-xs text-fg-muted font-medium shrink-0">
              {t.inbox.selectedCount.replace('{n}', String(selectedLocalEmailIds.size))}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
              <Button
                variant="secondary"
                size="xs"
                leftIcon={<CheckCheck size={14} aria-hidden />}
                onClick={() => applyBulkLocalEmailAction('mark_read')}
              >
                {t.inbox.markRead}
              </Button>
              <Button
                variant="secondary"
                size="xs"
                leftIcon={<Mail size={14} aria-hidden />}
                onClick={() => applyBulkLocalEmailAction('mark_unread')}
              >
                {t.inbox.markUnread}
              </Button>
              <Button
                variant="secondary"
                size="xs"
                leftIcon={<Clock size={14} aria-hidden />}
                onClick={() => applyBulkLocalEmailAction('snooze_1h')}
              >
                {t.inbox.snoozeOneHour}
              </Button>
              <Button
                variant="secondary"
                size="xs"
                leftIcon={<Clock size={14} aria-hidden />}
                onClick={() => applyBulkLocalEmailAction('snooze_1d')}
              >
                {t.inbox.snoozeOneDay}
              </Button>
              <Button
                variant="secondary"
                size="xs"
                leftIcon={<Clock size={14} aria-hidden />}
                onClick={() => applyBulkLocalEmailAction('snooze_1w')}
              >
                {t.inbox.snoozeOneWeek}
              </Button>
              {canDeleteEmails && (
                <Button
                  variant="danger"
                  size="xs"
                  leftIcon={<Trash2 size={14} aria-hidden />}
                  onClick={() => applyBulkLocalEmailAction('delete')}
                >
                  {t.common.bulkDelete}
                </Button>
              )}
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<ListChecks size={14} aria-hidden />}
                onClick={selectAllVisibleLocalEmails}
                disabled={localFolderVisibleEmails.length === 0}
              >
                {t.common.selectAll}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<X size={14} aria-hidden />}
                onClick={clearLocalBulkSelection}
              >
                {t.common.clear}
              </Button>
            </div>
          </div>
        )}
        <div className="px-3 py-2 border-b border-fg/10 bg-surface-1/50">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
            <input
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              placeholder={t.inbox.searchPlaceholder}
              className="w-full bg-surface-0/80 border border-fg/12 rounded-lg pl-8 pr-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent-500/45 focus:ring-1 focus:ring-accent-500/20 shadow-sm"
            />
          </div>
          <details className="mt-2 group">
            <summary className="text-xs text-fg-muted cursor-pointer list-none flex items-center gap-1 select-none hover:text-accent-400 [&::-webkit-details-marker]:hidden">
              <span className="border-b border-dotted border-fg-subtle/50 group-open:border-transparent">{t.inbox.searchSyntaxHelp}</span>
            </summary>
            <p className="mt-2 text-[10px] text-fg-subtle leading-relaxed border-l-2 border-accent-500/35 pl-2.5 py-0.5">{t.inbox.searchOperatorsHint}</p>
          </details>
        </div>
        {folder === 'inbox' && (
          <div className="px-3 py-2 border-b border-fg/6 flex flex-wrap gap-1.5">
            {([
              ['all', t.common.all],
              ['unread', t.notifications.unread],
              ['linked', t.inbox.pinnedLink],
              ['mine', t.common.assignedTo],
            ] as const).map(([id, label]) => (
              <button type="button"
                key={id}
                onClick={() => setInboxQuickFilter(id)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                  inboxQuickFilter === id
                    ? 'bg-accent-500/15 text-accent-300 border-accent-500/30'
                    : 'bg-fg/5 text-fg-subtle border-fg/10 hover:text-fg-muted'
                }`}
              >
                {label}
              </button>
            ))}
            <button type="button"
              onClick={() => setAdvancedFilters((prev) => ({ ...prev, hasAttachments: !prev.hasAttachments }))}
              className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                advancedFilters.hasAttachments
                  ? 'bg-accent-500/15 text-accent-300 border-accent-500/30'
                  : 'bg-fg/5 text-fg-subtle border-fg/10 hover:text-fg-muted'
              }`}
            >
              {t.inbox.hasAttachments}
            </button>
            <button type="button"
              onClick={() => setAdvancedFilters((prev) => ({ ...prev, mineOnly: !prev.mineOnly }))}
              className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                advancedFilters.mineOnly
                  ? 'bg-accent-500/15 text-accent-300 border-accent-500/30'
                  : 'bg-fg/5 text-fg-subtle border-fg/10 hover:text-fg-muted'
              }`}
            >
              {t.inbox.onlyMine}
            </button>
          </div>
        )}
        {folder === 'inbox' && (
          <div className="px-3 py-2 border-b border-fg/6 space-y-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex-1 min-w-0">
                <Select
                  ariaLabel={t.inbox.savedViews}
                  value={selectedInboxViewId}
                  onChange={(e) => applyInboxSavedView(e.target.value)}
                  options={[
                    { value: '', label: t.inbox.savedViews },
                    ...inboxViews.map((view) => ({ value: view.id, label: view.name })),
                  ]}
                  listMaxHeightClass="max-h-48"
                  className="[&_button]:text-xs [&_button]:py-1 [&_button]:min-h-0"
                />
              </div>
              {selectedInboxViewId && (
                <button type="button"
                  onClick={() => {
                    deleteInboxView(selectedInboxViewId)
                    setSelectedInboxViewId('')
                  }}
                  className="text-[10px] px-2 py-1 rounded-lg bg-danger/15 text-danger border border-danger/30"
                >
                  {t.common.delete}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={newInboxViewName}
                onChange={(e) => setNewInboxViewName(e.target.value)}
                placeholder={t.inbox.savedViewNamePlaceholder}
                className="flex-1 bg-surface-2 border border-fg/10 rounded-lg px-2 py-1 text-xs text-fg"
              />
              <button type="button"
                onClick={saveCurrentInboxView}
                className="text-[10px] px-2 py-1 rounded-lg bg-accent-500/15 text-accent-300 border border-accent-500/30"
              >
                {t.common.save}
              </button>
            </div>
          </div>
        )}
        {(folder === 'sent' || folder === 'scheduled') && (
          <div className="px-3 py-2 border-b border-fg/6 flex flex-wrap gap-1.5">
            {([
              ['all', t.common.all],
              ['tracked', t.followUps.title],
              ['opened', t.common.view],
              ['clicked', t.inbox.clicks],
            ] as const).map(([id, label]) => (
              <button type="button"
                key={id}
                onClick={() => setEmailQuickFilter(id)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                  emailQuickFilter === id
                    ? 'bg-accent-500/15 text-accent-300 border-accent-500/30'
                    : 'bg-fg/5 text-fg-subtle border-fg/10 hover:text-fg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {folder === 'inbox' && connected && inboxThreadsVisible.length > 0 && (
            <div className="sticky top-0 z-10 hidden sm:flex items-center gap-2 px-3 py-1.5 border-b border-fg/10 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle bg-surface-2/95 backdrop-blur-sm shadow-sm">
              <span className="w-7 flex-shrink-0" aria-hidden />
              <span className="w-9 flex-shrink-0" aria-hidden />
              <span className="flex-1 min-w-0 truncate">{t.common.from}</span>
              <span className="flex-[1.2] min-w-0 truncate">{t.activities.subject}</span>
              <span className="w-16 text-right flex-shrink-0 tabular-nums">{t.common.date}</span>
            </div>
          )}
          {/* Inbox: Gmail threads */}
          {folder === 'inbox' && (
            <>
              {!connected && (
                <PanelEmpty
                  icon={<Mail size={28} />}
                  primary={`${t.settings.disconnected} Gmail`}
                  secondary={`${t.settings.connect} Gmail`}
                  density="compact"
                />
              )}
              {connected && threadsLoading && (
                <div className="py-1" aria-busy="true" aria-label={t.common.loading}>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="px-3 py-2.5 border-b border-fg/[0.06] flex gap-2.5">
                      <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <Skeleton className="h-3 w-3/5" />
                        <Skeleton className="h-3 w-full max-w-md" />
                        <Skeleton className="h-2.5 w-4/5 max-w-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {connected && !threadsLoading && inboxThreadsVisible.length === 0 && (
                <PanelEmpty primary={t.inbox.noMessages} density="compact" />
              )}
              {connected && (
                <div className="mx-3 mt-3 p-2 rounded-lg border border-fg/8 bg-fg/4 text-xs text-fg-muted">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full mr-2 ${
                    syncVisualState === 'healthy'
                      ? 'bg-success/15 text-success'
                      : syncVisualState === 'syncing'
                        ? 'bg-accent-500/15 text-accent-300'
                        : syncVisualState === 'stale'
                          ? 'bg-warning/15 text-warning'
                          : 'bg-danger/15 text-danger'
                  }`}>
                    {syncText}
                  </span>
                  {lastSyncErrorMessage && syncVisualState === 'error' ? `${lastSyncErrorMessage}` : null}
                  {lastSyncErrorAt && syncVisualState === 'error' ? ` · ${formatDateTime(lastSyncErrorAt)}` : null}
                </div>
              )}
              {connected && threadsError && !threadsLoading && (
                <div className="mx-3 my-3 p-2 rounded-lg border border-danger/20 bg-danger/10 text-xs text-danger">
                  {threadsError}
                </div>
              )}
              {connected && inboxThreadsVisible.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  selected={selectedThreadId === thread.id}
                  bulkSelected={selectedThreadIds.has(thread.id)}
                  onClick={() => { setSelectedThreadId(thread.id); setSelectedEmailId(null) }}
                  onToggleBulk={() => toggleBulkThread(thread.id)}
                  contactByEmail={contactByEmail}
                />
              ))}
              {connected && !threadsLoading && !!threadsNextPageToken && (
                <div className="p-3 border-t border-fg/6">
                  <button type="button"
                    onClick={handleLoadMoreThreads}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-fg/6 hover:bg-fg/10 text-fg-muted transition-colors"
                  >
                    {t.inbox.loadMore}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Sent: local emails */}
          {folder === 'sent' && (
            <>
              {sentEmailsVisible.length === 0 && (
                <PanelEmpty icon={<Send size={28} />} primary={t.inbox.noMessages} density="compact" />
              )}
              {sentEmailsVisible.map((email) => (
                <LocalEmailItem
                  key={email.id}
                  email={email}
                  selected={selectedEmailId === email.id}
                  bulkSelected={selectedLocalEmailIds.has(email.id)}
                  onToggleBulk={() => toggleBulkLocalEmail(email.id)}
                  onClick={() => {
                    useEmailStore.getState().updateEmail(email.id, { isRead: true })
                    setSelectedEmailId(email.id)
                    setSelectedThreadId(null)
                  }}
                  contacts={contacts}
                  onTrackOpen={trackEmailOpen}
                  onTrackClick={trackEmailClick}
                />
              ))}
            </>
          )}
          {folder === 'scheduled' && (
            <>
              {scheduledEmailsVisible.length === 0 && (
                <PanelEmpty icon={<Clock size={28} />} primary={t.inbox.noMessages} density="compact" />
              )}
              {scheduledEmailsVisible.map((email) => (
                <LocalEmailItem
                  key={email.id}
                  email={email}
                  selected={selectedEmailId === email.id}
                  bulkSelected={selectedLocalEmailIds.has(email.id)}
                  onToggleBulk={() => toggleBulkLocalEmail(email.id)}
                  onClick={() => {
                    useEmailStore.getState().updateEmail(email.id, { isRead: true })
                    setSelectedEmailId(email.id)
                    setSelectedThreadId(null)
                  }}
                  contacts={contacts}
                  onTrackOpen={trackEmailOpen}
                  onTrackClick={trackEmailClick}
                />
              ))}
            </>
          )}
          {folder === 'drafts' && (
            <>
              {draftEmailsVisible.length === 0 && (
                <PanelEmpty icon={<Mail size={28} />} primary={t.inbox.noMessages} density="compact" />
              )}
              {draftEmailsVisible.map((email) => (
                <LocalEmailItem
                  key={email.id}
                  email={email}
                  selected={selectedEmailId === email.id}
                  bulkSelected={selectedLocalEmailIds.has(email.id)}
                  onToggleBulk={() => toggleBulkLocalEmail(email.id)}
                  onClick={() => {
                    useEmailStore.getState().updateEmail(email.id, { isRead: true })
                    setSelectedEmailId(email.id)
                    setSelectedThreadId(null)
                    setThreadInlineReply(null)
                    setComposerOpen(true)
                  }}
                  contacts={contacts}
                  onTrackOpen={trackEmailOpen}
                  onTrackClick={trackEmailClick}
                />
              ))}
            </>
          )}
          {folder === 'snoozed' && (
            <>
              {snoozedEmailsVisible.length === 0 && (
                <PanelEmpty
                  icon={<Clock size={28} />}
                  title={t.inbox.snoozed}
                  primary={t.inbox.noMessages}
                  secondary={t.inbox.snoozedFolderEmptyHint}
                  density="compact"
                />
              )}
              {snoozedEmailsVisible.map((email) => (
                <LocalEmailItem
                  key={email.id}
                  email={email}
                  selected={selectedEmailId === email.id}
                  bulkSelected={selectedLocalEmailIds.has(email.id)}
                  onToggleBulk={() => toggleBulkLocalEmail(email.id)}
                  onClick={() => {
                    useEmailStore.getState().updateEmail(email.id, { isRead: true })
                    setSelectedEmailId(email.id)
                    setSelectedThreadId(null)
                  }}
                  contacts={contacts}
                  onTrackOpen={trackEmailOpen}
                  onTrackClick={trackEmailClick}
                />
              ))}
            </>
          )}
        </div>
      </section>

      {/* ── Right: reading pane ─────────────────────────────────────────── */}
      <section
        className={`flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col border border-fg/10 rounded-xl lg:rounded-2xl bg-gradient-to-br from-surface-1/95 via-surface-1/80 to-surface-2/40 shadow-md ${
          !isWideViewport && !hasReadingSelection ? 'hidden' : ''
        } lg:flex`}
        aria-label={t.inbox.readingPaneLabel}
      >
        {!isWideViewport && hasReadingSelection && (
          <div className="lg:hidden flex items-center gap-2 px-3 py-2 border-b border-fg/8 bg-surface-1/50 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setSelectedThreadId(null)
                setSelectedEmailId(null)
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-400 hover:text-accent-300"
            >
              <ChevronLeft size={18} aria-hidden />
              {t.inbox.backToMailbox}
            </button>
          </div>
        )}
        {folder === 'inbox' && selectedThread && (
          <div className="px-3 py-2 border-b border-fg/6 flex items-center gap-2 flex-wrap">
            <div className="min-w-[10rem] max-w-[14rem]">
              <Select
                ariaLabel={t.common.assignedTo}
                value={selectedWorkspace?.ownerUserId ?? ''}
                onChange={(e) => setThreadOwner(selectedThread.id, e.target.value || undefined)}
                options={[
                  { value: '', label: t.common.assignedTo },
                  ...orgUsers.map((u) => ({ value: u.id, label: u.name })),
                ]}
                listMaxHeightClass="max-h-48"
                className="[&_button]:text-xs [&_button]:py-1.5 [&_button]:min-h-0"
              />
            </div>
            <input
              value={selectedWorkspace?.internalNote ?? ''}
              onChange={(e) => setThreadNote(selectedThread.id, e.target.value)}
              placeholder={t.common.notes}
              className="flex-1 min-w-[220px] bg-surface-2 border border-fg/10 rounded-lg px-2.5 py-1.5 text-xs text-fg-muted placeholder:text-fg-subtle"
            />
          </div>
        )}
        {folder === 'inbox' ? (
          <div className="flex flex-1 flex-col min-h-0 w-full">
            <div
              className={
                threadInlineReply
                  ? 'max-h-[min(34vh,300px)] shrink-0 min-h-0 overflow-y-auto overscroll-contain'
                  : 'flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col'
              }
            >
              <ThreadView
                thread={selectedThread}
                match={selectedThreadMatch}
                linkSource={selectedThreadLink?.source ?? (selectedThreadMatch ? 'auto' : null)}
                hasPersistedLink={!!selectedThreadLink}
                linkedEmails={selectedThreadLinkedEmails}
                onReply={openInlineReply}
                onReplyAll={openReplyAll}
                onCreateFollowUp={createFollowUpFromThread}
                onThreadAction={runThreadAction}
                onPinLink={pinThreadLink}
                onUnpinLink={unpinThreadLink}
                onManualLinkSave={saveManualThreadLink}
                onDownloadAttachment={handleDownloadAttachment}
                allContacts={contacts}
                allDeals={deals.map((d) => ({ id: d.id, title: d.title }))}
                canEditLinks={canLinkEmails}
                canCreateFollowUp={canCreateActivities}
              />
            </div>
            {threadInlineReply && (
              <div className="flex-1 min-h-0 flex flex-col border-t border-fg/8 pt-2 px-0.5">
                <EmailComposer
                  presentation="inline"
                  isOpen
                  onClose={() => setThreadInlineReply(null)}
                  defaultTo={threadInlineReply.to}
                  defaultSubject={threadInlineReply.subject}
                  defaultCc={threadInlineReply.defaultCc ?? ''}
                  contactId={selectedThreadMatch?.contact?.id}
                  dealId={selectedThreadMatch?.dealId}
                  companyId={selectedThreadMatch?.companyId}
                  onRequestGmailConnect={handleConnectGmail}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col min-h-0 w-full">
            <div
              className={
                threadInlineReply
                  ? 'max-h-[min(34vh,300px)] shrink-0 min-h-0 overflow-y-auto overscroll-contain'
                  : 'flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col'
              }
            >
              <LocalEmailView
                email={selectedEmail}
                contacts={contacts}
                onReply={openInlineReply}
                onTrackOpen={trackEmailOpen}
                onTrackClick={trackEmailClick}
              />
            </div>
            {threadInlineReply && (
              <div className="flex-1 min-h-0 flex flex-col border-t border-fg/8 pt-2 px-0.5">
                <EmailComposer
                  presentation="inline"
                  isOpen
                  onClose={() => setThreadInlineReply(null)}
                  defaultTo={threadInlineReply.to}
                  defaultSubject={threadInlineReply.subject}
                  defaultCc={threadInlineReply.defaultCc ?? ''}
                  contactId={selectedEmail?.contactId}
                  dealId={selectedEmail?.dealId}
                  companyId={selectedEmail?.companyId}
                  onRequestGmailConnect={handleConnectGmail}
                />
              </div>
            )}
            {selectedEmail && folder !== 'snoozed' && !threadInlineReply && (
              <div className="px-3 py-2 border-t border-fg/6">
                {folder === 'scheduled' && selectedEmail.undoableUntil && new Date(selectedEmail.undoableUntil).getTime() > Date.now() && (
                  <button type="button"
                    onClick={() => {
                      deleteEmail(selectedEmail.id)
                      setSelectedEmailId(null)
                      toast.success(t.email.undoSendSuccess)
                    }}
                    className="mr-2 text-xs px-3 py-1.5 rounded-lg border border-warning/40 bg-warning/12 text-warning hover:bg-warning/20 transition-colors"
                  >
                    {t.email.undoSend}
                  </button>
                )}
                <button type="button"
                  onClick={() => {
                    snoozeEmail(selectedEmail.id, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
                    toast.success(t.inbox.snoozed)
                    setFolder('snoozed')
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-fg/6 text-fg-muted hover:bg-fg/10 transition-colors"
                >
                  {t.inbox.snoozeOneDay}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
      </div>

      <EmailComposer
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        defaultTo={folder === 'drafts' && selectedEmail ? selectedEmail.to.join(', ') : ''}
        defaultSubject={folder === 'drafts' && selectedEmail ? selectedEmail.subject : ''}
        defaultBody={folder === 'drafts' && selectedEmail ? selectedEmail.body : ''}
        defaultCc={folder === 'drafts' && selectedEmail ? (selectedEmail.cc ?? []).join(', ') : ''}
        defaultBcc={folder === 'drafts' && selectedEmail ? (selectedEmail.bcc ?? []).join(', ') : ''}
        defaultReplyTo={folder === 'drafts' && selectedEmail ? (selectedEmail.replyTo ?? '') : ''}
        draftId={folder === 'drafts' && selectedEmail ? selectedEmail.id : undefined}
        contactId={folder === 'drafts' ? selectedEmail?.contactId : undefined}
        dealId={folder === 'drafts' ? selectedEmail?.dealId : undefined}
        companyId={folder === 'drafts' ? selectedEmail?.companyId : undefined}
        onRequestGmailConnect={handleConnectGmail}
      />
    </div>
  )
}
