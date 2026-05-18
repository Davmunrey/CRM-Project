import { useState, useEffect, useMemo } from 'react'
import {
  Mail, User, Clock, Reply, Plus, Paperclip, Download,
  ChevronRight, Archive, Trash2, CheckCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslations } from '../../i18n'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { PanelEmpty } from '../../components/shared/PanelEmpty'
import { buildReplySubject, type ThreadMatch } from '../../features/inbox'
import { formatDateTime, formatRelativeDate } from '../../utils/formatters'
import type { GmailThread, GmailMessage, CRMEmail, Contact } from '../../types'

export function ThreadView({
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- thread?.id and thread?.messages.length are sufficient to detect thread changes without including the full array reference
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
