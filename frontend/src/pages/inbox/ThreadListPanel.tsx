import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Mail, Send, RefreshCw, Clock, Search,
  Archive, Trash2, CheckCheck, ListChecks, X,
} from 'lucide-react'
import { useTranslations } from '../../i18n'
import { useEmailStore } from '../../store/emailStore'
import { useViewsStore } from '../../store/viewsStore'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { PanelEmpty } from '../../components/shared/PanelEmpty'
import { Skeleton } from '../../components/ui/Skeleton'
import { InboxThreadItem } from '../../features/inbox'
import { formatDateTime } from '../../utils/formatters'
import { LocalEmailItem } from './LocalEmailItem'
import type { FolderNavFolder } from './FolderNav'
import type { GmailThread, CRMEmail, Contact, InboxAdvancedFilters } from '../../types'

export function ThreadListPanel({
  folder,
  connected,
  threadsLoading,
  threadsError,
  threadsLastSyncedAt,
  threadsHistoryId,
  threadsNextPageToken,
  syncVisualState,
  syncText,
  lastSyncErrorMessage,
  lastSyncErrorAt,
  inboxThreadsVisible,
  localFolderVisibleEmails,
  sentEmailsVisible,
  scheduledEmailsVisible,
  draftEmailsVisible,
  snoozedEmailsVisible,
  selectedThreadId,
  selectedEmailId,
  selectedThreadIds,
  selectedLocalEmailIds,
  listQuery,
  inboxQuickFilter,
  emailQuickFilter,
  advancedFilters,
  listPaneSubtitle,
  selectedInboxViewId,
  newInboxViewName,
  contacts,
  isWideViewport,
  hasReadingSelection,
  canDeleteEmails,
  contactByEmail,
  onSelectThread,
  onSelectEmail,
  onToggleBulkThread,
  onToggleBulkLocalEmail,
  onApplyBulkThreadAction,
  onApplyBulkLocalEmailAction,
  onSelectAllThreads,
  onClearThreadSelection,
  onSelectAllLocalEmails,
  onClearLocalEmailSelection,
  onSetListQuery,
  onSetInboxQuickFilter,
  onSetEmailQuickFilter,
  onSetAdvancedFilters,
  onApplyInboxSavedView,
  onSaveCurrentInboxView,
  onSetNewInboxViewName,
  onDeleteInboxView,
  onLoadThreads,
  onLoadMoreThreads,
  trackEmailOpen,
  trackEmailClick,
}: {
  folder: FolderNavFolder
  connected: boolean
  threadsLoading: boolean
  threadsError: string | null
  threadsLastSyncedAt: string | null
  threadsHistoryId: string | null
  threadsNextPageToken: string | null
  syncVisualState: 'healthy' | 'syncing' | 'stale' | 'error'
  syncText: string
  lastSyncErrorMessage: string | null
  lastSyncErrorAt: string | null
  inboxThreadsVisible: GmailThread[]
  localFolderVisibleEmails: CRMEmail[]
  sentEmailsVisible: CRMEmail[]
  scheduledEmailsVisible: CRMEmail[]
  draftEmailsVisible: CRMEmail[]
  snoozedEmailsVisible: CRMEmail[]
  selectedThreadId: string | null
  selectedEmailId: string | null
  selectedThreadIds: Set<string>
  selectedLocalEmailIds: Set<string>
  listQuery: string
  inboxQuickFilter: 'all' | 'unread' | 'linked' | 'mine'
  emailQuickFilter: 'all' | 'tracked' | 'opened' | 'clicked'
  advancedFilters: InboxAdvancedFilters
  listPaneSubtitle: string
  selectedInboxViewId: string
  newInboxViewName: string
  contacts: Contact[]
  isWideViewport: boolean
  hasReadingSelection: boolean
  canDeleteEmails: boolean
  contactByEmail: Map<string, { id: string; name: string }>
  onSelectThread: (threadId: string) => void
  onSelectEmail: (emailId: string) => void
  onToggleBulkThread: (threadId: string) => void
  onToggleBulkLocalEmail: (emailId: string) => void
  onApplyBulkThreadAction: (action: 'mark_read' | 'mark_unread' | 'archive' | 'trash') => void
  onApplyBulkLocalEmailAction: (action: 'mark_read' | 'mark_unread' | 'delete' | 'snooze_1h' | 'snooze_1d' | 'snooze_1w') => void
  onSelectAllThreads: () => void
  onClearThreadSelection: () => void
  onSelectAllLocalEmails: () => void
  onClearLocalEmailSelection: () => void
  onSetListQuery: (q: string) => void
  onSetInboxQuickFilter: (f: 'all' | 'unread' | 'linked' | 'mine') => void
  onSetEmailQuickFilter: (f: 'all' | 'tracked' | 'opened' | 'clicked') => void
  onSetAdvancedFilters: (updater: (prev: InboxAdvancedFilters) => InboxAdvancedFilters) => void
  onApplyInboxSavedView: (viewId: string) => void
  onSaveCurrentInboxView: () => void
  onSetNewInboxViewName: (name: string) => void
  onDeleteInboxView: (viewId: string) => void
  onLoadThreads: () => void
  onLoadMoreThreads: () => void
  trackEmailOpen: (id: string) => void
  trackEmailClick: (id: string) => void
}) {
  const t = useTranslations()
  const { inboxViews } = useViewsStore()

  const threadListScrollRef = useRef<HTMLDivElement>(null)
  // TanStack Virtual returns non-memoizable functions by design; the React
  // Compiler correctly skips memoizing this hook. Safe here — its output is
  // consumed locally, not passed into other memoized components.
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is intentionally not compiler-memoizable
  const inboxThreadVirtualizer = useVirtualizer({
    count: folder === 'inbox' ? inboxThreadsVisible.length : 0,
    getScrollElement: () => threadListScrollRef.current,
    estimateSize: () => 78,
    overscan: 10,
  })

  const folderLabel = (() => {
    if (folder === 'inbox') return t.inbox.title
    if (folder === 'sent') return t.inbox.sent
    if (folder === 'scheduled') return t.email.sendLater
    if (folder === 'drafts') return t.inbox.drafts
    return t.inbox.snoozed
  })()

  return (
    <section
      className={`w-full min-h-[200px] lg:min-h-0 lg:w-[min(100%,460px)] lg:max-w-lg lg:flex-shrink-0 border border-fg/10 rounded-xl lg:rounded-2xl overflow-hidden flex flex-col bg-surface-1/80 shadow-md ${
        !isWideViewport && hasReadingSelection ? 'hidden' : ''
      } lg:flex`}
      aria-label={t.inbox.threadListLabel}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-fg/10 flex-shrink-0 bg-gradient-to-b from-surface-2/90 to-surface-1/95">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-fg tracking-tight truncate">
            {folderLabel}
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
            onClick={onLoadThreads}
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
            <Button variant="secondary" size="xs" leftIcon={<CheckCheck size={14} aria-hidden />} onClick={() => onApplyBulkThreadAction('mark_read')}>
              {t.inbox.markRead}
            </Button>
            <Button variant="secondary" size="xs" leftIcon={<Mail size={14} aria-hidden />} onClick={() => onApplyBulkThreadAction('mark_unread')}>
              {t.inbox.markUnread}
            </Button>
            <Button variant="secondary" size="xs" leftIcon={<Archive size={14} aria-hidden />} onClick={() => onApplyBulkThreadAction('archive')}>
              {t.inbox.archive}
            </Button>
            <Button variant="danger" size="xs" leftIcon={<Trash2 size={14} aria-hidden />} onClick={() => onApplyBulkThreadAction('trash')}>
              {t.inbox.trash}
            </Button>
            <Button variant="ghost" size="xs" leftIcon={<ListChecks size={14} aria-hidden />} onClick={onSelectAllThreads} disabled={inboxThreadsVisible.length === 0}>
              {t.common.selectAll}
            </Button>
            <Button variant="ghost" size="xs" leftIcon={<X size={14} aria-hidden />} onClick={onClearThreadSelection}>
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
            <Button variant="secondary" size="xs" leftIcon={<CheckCheck size={14} aria-hidden />} onClick={() => onApplyBulkLocalEmailAction('mark_read')}>
              {t.inbox.markRead}
            </Button>
            <Button variant="secondary" size="xs" leftIcon={<Mail size={14} aria-hidden />} onClick={() => onApplyBulkLocalEmailAction('mark_unread')}>
              {t.inbox.markUnread}
            </Button>
            <Button variant="secondary" size="xs" leftIcon={<Clock size={14} aria-hidden />} onClick={() => onApplyBulkLocalEmailAction('snooze_1h')}>
              {t.inbox.snoozeOneHour}
            </Button>
            <Button variant="secondary" size="xs" leftIcon={<Clock size={14} aria-hidden />} onClick={() => onApplyBulkLocalEmailAction('snooze_1d')}>
              {t.inbox.snoozeOneDay}
            </Button>
            <Button variant="secondary" size="xs" leftIcon={<Clock size={14} aria-hidden />} onClick={() => onApplyBulkLocalEmailAction('snooze_1w')}>
              {t.inbox.snoozeOneWeek}
            </Button>
            {canDeleteEmails && (
              <Button variant="danger" size="xs" leftIcon={<Trash2 size={14} aria-hidden />} onClick={() => onApplyBulkLocalEmailAction('delete')}>
                {t.common.bulkDelete}
              </Button>
            )}
            <Button variant="ghost" size="xs" leftIcon={<ListChecks size={14} aria-hidden />} onClick={onSelectAllLocalEmails} disabled={localFolderVisibleEmails.length === 0}>
              {t.common.selectAll}
            </Button>
            <Button variant="ghost" size="xs" leftIcon={<X size={14} aria-hidden />} onClick={onClearLocalEmailSelection}>
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
            onChange={(e) => onSetListQuery(e.target.value)}
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
              onClick={() => onSetInboxQuickFilter(id)}
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
            onClick={() => onSetAdvancedFilters((prev) => ({ ...prev, hasAttachments: !prev.hasAttachments }))}
            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
              advancedFilters.hasAttachments
                ? 'bg-accent-500/15 text-accent-300 border-accent-500/30'
                : 'bg-fg/5 text-fg-subtle border-fg/10 hover:text-fg-muted'
            }`}
          >
            {t.inbox.hasAttachments}
          </button>
          <button type="button"
            onClick={() => onSetAdvancedFilters((prev) => ({ ...prev, mineOnly: !prev.mineOnly }))}
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
                onChange={(e) => onApplyInboxSavedView(e.target.value)}
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
                  onDeleteInboxView(selectedInboxViewId)
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
              onChange={(e) => onSetNewInboxViewName(e.target.value)}
              placeholder={t.inbox.savedViewNamePlaceholder}
              className="flex-1 bg-surface-2 border border-fg/10 rounded-lg px-2 py-1 text-xs text-fg"
            />
            <button type="button"
              onClick={onSaveCurrentInboxView}
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
              onClick={() => onSetEmailQuickFilter(id)}
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

      <div ref={threadListScrollRef} className="flex-1 overflow-y-auto min-h-0">
        {folder === 'inbox' && connected && inboxThreadsVisible.length > 0 && (
          <div className="sticky top-0 z-10 hidden sm:flex items-center gap-2 px-3 py-1.5 border-b border-fg/10 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle bg-surface-2/95 backdrop-blur-sm shadow-sm">
            <span className="w-7 flex-shrink-0" aria-hidden />
            <span className="w-9 flex-shrink-0" aria-hidden />
            <span className="flex-1 min-w-0 truncate">{t.common.from}</span>
            <span className="flex-[1.2] min-w-0 truncate">{t.activities.subject}</span>
            <span className="w-16 text-right flex-shrink-0 tabular-nums">{t.common.date}</span>
          </div>
        )}

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
            {connected && !threadsLoading && inboxThreadsVisible.length > 0 && (
              <div
                className="relative w-full"
                style={{ height: inboxThreadVirtualizer.getTotalSize() }}
              >
                {inboxThreadVirtualizer.getVirtualItems().map((vi) => {
                  const thread = inboxThreadsVisible[vi.index]
                  return (
                    <div
                      key={thread.id}
                      className="absolute top-0 left-0 w-full"
                      data-index={vi.index}
                      ref={inboxThreadVirtualizer.measureElement}
                      style={{ transform: `translateY(${vi.start}px)` }}
                    >
                      <InboxThreadItem
                        thread={thread}
                        selected={selectedThreadId === thread.id}
                        bulkSelected={selectedThreadIds.has(thread.id)}
                        onClick={() => onSelectThread(thread.id)}
                        onToggleBulk={() => onToggleBulkThread(thread.id)}
                        contactByEmail={contactByEmail}
                      />
                    </div>
                  )
                })}
              </div>
            )}
            {connected && !threadsLoading && !!threadsNextPageToken && (
              <div className="p-3 border-t border-fg/6">
                <button type="button"
                  onClick={onLoadMoreThreads}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-fg/6 hover:bg-fg/10 text-fg-muted transition-colors"
                >
                  {t.inbox.loadMore}
                </button>
              </div>
            )}
          </>
        )}

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
                onToggleBulk={() => onToggleBulkLocalEmail(email.id)}
                onClick={() => {
                  useEmailStore.getState().updateEmail(email.id, { isRead: true })
                  onSelectEmail(email.id)
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
                onToggleBulk={() => onToggleBulkLocalEmail(email.id)}
                onClick={() => {
                  useEmailStore.getState().updateEmail(email.id, { isRead: true })
                  onSelectEmail(email.id)
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
                onToggleBulk={() => onToggleBulkLocalEmail(email.id)}
                onClick={() => {
                  useEmailStore.getState().updateEmail(email.id, { isRead: true })
                  onSelectEmail(email.id)
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
                onToggleBulk={() => onToggleBulkLocalEmail(email.id)}
                onClick={() => {
                  useEmailStore.getState().updateEmail(email.id, { isRead: true })
                  onSelectEmail(email.id)
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
  )
}
