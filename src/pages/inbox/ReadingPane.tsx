import { ChevronLeft } from 'lucide-react'
import { useTranslations } from '../../i18n'
import { useEmailStore } from '../../store/emailStore'
import { useAuthStore } from '../../store/authStore'
import { Select } from '../../components/ui/Select'
import { EmailComposer } from '../../components/email/EmailComposer'
import { toast } from '../../store/toastStore'
import { ThreadView } from './ThreadView'
import { LocalEmailView } from './LocalEmailView'
import type { FolderNavFolder } from './FolderNav'
import type { GmailThreadLink, GmailThreadWorkspaceMeta } from '../../store/emailStore'
import type { GmailThread, CRMEmail, Contact } from '../../types'
import type { ThreadMatch } from '../../features/inbox'

export function ReadingPane({
  folder,
  selectedThread,
  selectedEmail,
  selectedThreadMatch,
  selectedThreadLink,
  selectedWorkspace,
  selectedThreadLinkedEmails,
  threadInlineReply,
  isWideViewport,
  hasReadingSelection,
  contacts,
  deals,
  canLinkEmails,
  canCreateActivities,
  onBack,
  onOpenInlineReply,
  onCloseInlineReply,
  onReplyAll,
  onCreateFollowUp,
  onThreadAction,
  onPinLink,
  onUnpinLink,
  onManualLinkSave,
  onDownloadAttachment,
  onRequestGmailConnect,
  onDeleteEmail,
  onSnoozeEmail,
  onSetFolder,
  onSetSelectedEmailId,
  trackEmailOpen,
  trackEmailClick,
}: {
  folder: FolderNavFolder
  selectedThread: GmailThread | null
  selectedEmail: CRMEmail | null
  selectedThreadMatch: ThreadMatch | null
  selectedThreadLink: GmailThreadLink | null
  selectedWorkspace: GmailThreadWorkspaceMeta | null
  selectedThreadLinkedEmails: CRMEmail[]
  threadInlineReply: { to: string; subject: string; defaultCc?: string } | null
  isWideViewport: boolean
  hasReadingSelection: boolean
  contacts: Contact[]
  deals: Array<{ id: string; title: string }>
  canLinkEmails: boolean
  canCreateActivities: boolean
  onBack: () => void
  onOpenInlineReply: (to: string, subject: string, defaultCc?: string) => void
  onCloseInlineReply: () => void
  onReplyAll: (thread: GmailThread, messageIndex: number) => void
  onCreateFollowUp: (thread: GmailThread, match: ThreadMatch | null) => void
  onThreadAction: (thread: GmailThread, action: 'mark_read' | 'mark_unread' | 'archive' | 'trash') => void
  onPinLink: (thread: GmailThread, match: ThreadMatch | null) => void
  onUnpinLink: (thread: GmailThread) => void
  onManualLinkSave: (thread: GmailThread, contactId?: string, dealId?: string) => void
  onDownloadAttachment: (messageId: string, attachmentId: string, filename: string) => void
  onRequestGmailConnect: () => void
  onDeleteEmail: (id: string) => void
  onSnoozeEmail: (id: string, until: string) => void
  onSetFolder: (f: FolderNavFolder) => void
  onSetSelectedEmailId: (id: string | null) => void
  trackEmailOpen: (id: string) => void
  trackEmailClick: (id: string) => void
}) {
  const t = useTranslations()
  const orgUsers = useAuthStore((s) => s.users)

  return (
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
            onClick={onBack}
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
              onChange={(e) => useEmailStore.getState().setThreadOwner(selectedThread.id, e.target.value || undefined)}
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
            onChange={(e) => useEmailStore.getState().setThreadNote(selectedThread.id, e.target.value)}
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
              onReply={onOpenInlineReply}
              onReplyAll={onReplyAll}
              onCreateFollowUp={onCreateFollowUp}
              onThreadAction={onThreadAction}
              onPinLink={onPinLink}
              onUnpinLink={onUnpinLink}
              onManualLinkSave={onManualLinkSave}
              onDownloadAttachment={onDownloadAttachment}
              allContacts={contacts}
              allDeals={deals}
              canEditLinks={canLinkEmails}
              canCreateFollowUp={canCreateActivities}
            />
          </div>
          {threadInlineReply && (
            <div className="flex-1 min-h-0 flex flex-col border-t border-fg/8 pt-2 px-0.5">
              <EmailComposer
                presentation="inline"
                isOpen
                onClose={onCloseInlineReply}
                defaultTo={threadInlineReply.to}
                defaultSubject={threadInlineReply.subject}
                defaultCc={threadInlineReply.defaultCc ?? ''}
                contactId={selectedThreadMatch?.contact?.id}
                dealId={selectedThreadMatch?.dealId}
                companyId={selectedThreadMatch?.companyId}
                onRequestGmailConnect={onRequestGmailConnect}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col min-h-0 w-full">
          {folder === 'drafts' && selectedEmail ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-0.5 pt-0.5">
              <EmailComposer
                key={selectedEmail.id}
                presentation="inline"
                isOpen
                onClose={() => onSetSelectedEmailId(null)}
                defaultTo={selectedEmail.to.join(', ')}
                defaultSubject={selectedEmail.subject}
                defaultBody={selectedEmail.body}
                defaultCc={(selectedEmail.cc ?? []).join(', ')}
                defaultBcc={(selectedEmail.bcc ?? []).join(', ')}
                defaultReplyTo={selectedEmail.replyTo ?? ''}
                draftId={selectedEmail.id}
                contactId={selectedEmail.contactId}
                dealId={selectedEmail.dealId}
                companyId={selectedEmail.companyId}
                onRequestGmailConnect={onRequestGmailConnect}
              />
            </div>
          ) : (
            <>
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
                  onReply={onOpenInlineReply}
                  onTrackOpen={trackEmailOpen}
                  onTrackClick={trackEmailClick}
                />
              </div>
              {threadInlineReply && (
                <div className="flex-1 min-h-0 flex flex-col border-t border-fg/8 pt-2 px-0.5">
                  <EmailComposer
                    presentation="inline"
                    isOpen
                    onClose={onCloseInlineReply}
                    defaultTo={threadInlineReply.to}
                    defaultSubject={threadInlineReply.subject}
                    defaultCc={threadInlineReply.defaultCc ?? ''}
                    contactId={selectedEmail?.contactId}
                    dealId={selectedEmail?.dealId}
                    companyId={selectedEmail?.companyId}
                    onRequestGmailConnect={onRequestGmailConnect}
                  />
                </div>
              )}
              {selectedEmail && folder !== 'snoozed' && folder !== 'drafts' && !threadInlineReply && (
                <div className="px-3 py-2 border-t border-fg/6">
                  {folder === 'scheduled' && selectedEmail.undoableUntil && new Date(selectedEmail.undoableUntil).getTime() > Date.now() && (
                    <button type="button"
                      onClick={() => {
                        onDeleteEmail(selectedEmail.id)
                        onSetSelectedEmailId(null)
                        toast.success(t.email.undoSendSuccess)
                      }}
                      className="mr-2 text-xs px-3 py-1.5 rounded-lg border border-warning/40 bg-warning/12 text-warning hover:bg-warning/20 transition-colors"
                    >
                      {t.email.undoSend}
                    </button>
                  )}
                  <button type="button"
                    onClick={() => {
                      onSnoozeEmail(selectedEmail.id, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
                      toast.success(t.inbox.snoozed)
                      onSetFolder('snoozed')
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-fg/6 text-fg-muted hover:bg-fg/10 transition-colors"
                  >
                    {t.inbox.snoozeOneDay}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
