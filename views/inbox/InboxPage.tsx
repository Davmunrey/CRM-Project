import { useState, useEffect, useMemo } from 'react'
import { useEmailStore } from '../../store/emailStore'
import { useContactsStore } from '../../store/contactsStore'
import { useDealsStore } from '../../store/dealsStore'
import { useCompaniesStore } from '../../store/companiesStore'
import { useActivitiesStore } from '../../store/activitiesStore'
import { useAuthStore } from '../../store/authStore'
import { useViewsStore } from '../../store/viewsStore'
import { downloadGmailAttachment, modifyGmailThreadLabels, trashGmailThread } from '../../services/gmailService'
import { withGmailToken } from '../../services/gmailTokenRefresh'
import { fetchGoogleOAuthStartUrl, disconnectGoogleIntegration } from '../../services/googleIntegrationService'
import { useGmailToken } from '../../contexts/GmailTokenContext'
import { EmailComposer } from '../../components/email/EmailComposer'
import { toast } from '../../store/toastStore'
import { hasPermission } from '../../utils/permissions'
import { useTranslations } from '../../i18n'
import { trackUxAction } from '../../lib/uxMetrics'
import { buildInboxQueryMatcher } from '../../utils/inboxQuery'
import { toGmailThreadsListQuery } from '../../utils/inboxGmailQuery'
import {
  parseEmails,
  buildAutoThreadMatchMap,
  buildPersistedThreadMatchMap,
  buildReplySubject,
  type ThreadMatch,
} from '../../features/inbox'
import type { GmailThread, InboxAdvancedFilters } from '../../types'
import { FolderNav, type FolderNavFolder } from './FolderNav'
import { ThreadListPanel } from './ThreadListPanel'
import { ReadingPane } from './ReadingPane'

export function InboxPage() {
  const t = useTranslations()
  const currentUser = useAuthStore((s) => s.currentUser)
  const {
    emails, threads, threadsLoading,
    gmailAddress, threadLinks, threadWorkspace, threadsError, threadsLastSyncedAt, threadsNextPageToken, threadsHistoryId, syncState, lastSyncErrorAt, lastSyncErrorMessage,
    fetchThreadLinks, fetchThreadWorkspace, setThreadLink, clearThreadLink, deleteEmail, disconnectGmail,
    trackEmailOpen, trackEmailClick, processScheduledEmails, refreshTrackingMetrics, wakeDueSnoozedEmails, snoozeEmail,
  } = useEmailStore()
  const { addInboxView, deleteInboxView } = useViewsStore()
  const { accessToken, setGmailToken, clearGmailToken } = useGmailToken()
  const contacts = useContactsStore((s) => s.contacts)
  const deals = useDealsStore((s) => s.deals)
  const companies = useCompaniesStore((s) => s.companies)
  const addActivity = useActivitiesStore((s) => s.addActivity)

  const [folder, setFolder] = useState<FolderNavFolder>('inbox')
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
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

  const handleLoadThreads = async (query = '', options: { silent?: boolean } = {}) => {
    try {
      const gmailQuery = toGmailThreadsListQuery(query)
      await withGmailToken(accessToken, setGmailToken, (token) => useEmailStore.getState().loadThreads(token, gmailQuery))
      if (query.trim()) trackUxAction('inbox_search', { queryLength: query.trim().length })
    } catch (err) {
      if (!options.silent) toast.error(err instanceof Error ? err.message : t.errors.generic)
    }
  }

  const handleLoadMoreThreads = async () => {
    if (!threadsNextPageToken) return
    try {
      await withGmailToken(accessToken, setGmailToken, (token) =>
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

  useEffect(() => {
    if (connected && folder === 'inbox') {
      handleLoadThreads('', { silent: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handleLoadThreads is intentionally excluded: it's a stable useCallback but we only want to reload when connection state or folder changes
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handleLoadThreads is intentionally excluded: listQuery/connected/folder are the only triggers needed
  }, [listQuery, connected, folder])

  const handleConnectGmail = async () => {
    setConnecting(true)
    try {
      const url = await fetchGoogleOAuthStartUrl('primary')
      window.location.assign(url)
    } catch (err) {
      setConnecting(false)
      toast.error(err instanceof Error ? err.message : t.errors.googleIntegrationStartFailed)
    }
  }

  useEffect(() => {
    if (!connected) return
    const run = async () => {
      try {
        await withGmailToken(accessToken, setGmailToken, async (token) => processScheduledEmails(token))
      } catch {
        // ignore periodic scheduler errors
      }
    }
    run()
    const id = window.setInterval(run, 15000)
    return () => window.clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setGmailToken is from context and stable; including it would cause spurious re-runs on context re-renders
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

  const hasReadingSelection =
    (folder === 'inbox' && selectedThreadId !== null) ||
    (folder !== 'inbox' && selectedEmailId !== null)

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

  const applyEmailQuickFilter = (items: typeof mailboxEmails) => items.filter((email) => {
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
        setComposerOpen(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [folder, inboxThreadsVisible, selectedThreadId])

  const applyInboxSavedView = (viewId: string) => {
    setSelectedInboxViewId(viewId)
    const { inboxViews } = useViewsStore.getState()
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
      await withGmailToken(accessToken, setGmailToken, async (token) => {
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
      await withGmailToken(accessToken, setGmailToken, async (token) => {
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
    setDisconnecting(true)
    try {
      await disconnectGoogleIntegration()
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
      await withGmailToken(accessToken, setGmailToken, async (token) => {
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

  const handleSelectFolder = (f: FolderNavFolder) => {
    setFolder(f)
    setSelectedThreadId(null)
    setSelectedEmailId(null)
    setComposerOpen(false)
    setSelectedThreadIds(new Set())
    setSelectedLocalEmailIds(new Set())
  }

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId)
    setSelectedEmailId(null)
    setComposerOpen(false)
  }

  const handleSelectEmail = (emailId: string) => {
    setSelectedEmailId(emailId)
    setSelectedThreadId(null)
    setComposerOpen(false)
  }

  const handleDeleteInboxView = (viewId: string) => {
    deleteInboxView(viewId)
    setSelectedInboxViewId('')
  }

  return (
    <div className="crm-page-full flex flex-col h-full min-h-0 overflow-hidden py-2 sm:py-3 lg:py-4 gap-2 lg:gap-3">
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-2 lg:gap-3">
        <FolderNav
          folder={folder}
          folderNav={folderNav}
          gmailAddress={gmailAddress}
          connected={connected}
          connecting={connecting}
          disconnecting={disconnecting}
          onSelectFolder={handleSelectFolder}
          onCompose={() => {
            setSelectedEmailId(null)
            setSelectedThreadId(null)
            setThreadInlineReply(null)
            setComposerOpen(true)
          }}
          onConnect={handleConnectGmail}
          onDisconnect={handleDisconnectGmail}
        />

        <ThreadListPanel
          folder={folder}
          connected={connected}
          threadsLoading={threadsLoading}
          threadsError={threadsError}
          threadsLastSyncedAt={threadsLastSyncedAt}
          threadsHistoryId={threadsHistoryId}
          threadsNextPageToken={threadsNextPageToken}
          syncVisualState={syncVisualState}
          syncText={syncText}
          lastSyncErrorMessage={lastSyncErrorMessage}
          lastSyncErrorAt={lastSyncErrorAt}
          inboxThreadsVisible={inboxThreadsVisible}
          localFolderVisibleEmails={localFolderVisibleEmails}
          sentEmailsVisible={sentEmailsVisible}
          scheduledEmailsVisible={scheduledEmailsVisible}
          draftEmailsVisible={draftEmailsVisible}
          snoozedEmailsVisible={snoozedEmailsVisible}
          selectedThreadId={selectedThreadId}
          selectedEmailId={selectedEmailId}
          selectedThreadIds={selectedThreadIds}
          selectedLocalEmailIds={selectedLocalEmailIds}
          listQuery={listQuery}
          inboxQuickFilter={inboxQuickFilter}
          emailQuickFilter={emailQuickFilter}
          advancedFilters={advancedFilters}
          listPaneSubtitle={listPaneSubtitle}
          selectedInboxViewId={selectedInboxViewId}
          newInboxViewName={newInboxViewName}
          contacts={contacts}
          isWideViewport={isWideViewport}
          hasReadingSelection={hasReadingSelection}
          canDeleteEmails={canDeleteEmails}
          contactByEmail={contactByEmail}
          onSelectThread={handleSelectThread}
          onSelectEmail={handleSelectEmail}
          onToggleBulkThread={toggleBulkThread}
          onToggleBulkLocalEmail={toggleBulkLocalEmail}
          onApplyBulkThreadAction={applyBulkThreadAction}
          onApplyBulkLocalEmailAction={applyBulkLocalEmailAction}
          onSelectAllThreads={selectAllVisibleInboxThreads}
          onClearThreadSelection={clearThreadBulkSelection}
          onSelectAllLocalEmails={selectAllVisibleLocalEmails}
          onClearLocalEmailSelection={clearLocalBulkSelection}
          onSetListQuery={setListQuery}
          onSetInboxQuickFilter={setInboxQuickFilter}
          onSetEmailQuickFilter={setEmailQuickFilter}
          onSetAdvancedFilters={setAdvancedFilters}
          onApplyInboxSavedView={applyInboxSavedView}
          onSaveCurrentInboxView={saveCurrentInboxView}
          onSetNewInboxViewName={setNewInboxViewName}
          onDeleteInboxView={handleDeleteInboxView}
          onLoadThreads={() => handleLoadThreads()}
          onLoadMoreThreads={handleLoadMoreThreads}
          trackEmailOpen={trackEmailOpen}
          trackEmailClick={trackEmailClick}
        />

        <ReadingPane
          folder={folder}
          selectedThread={selectedThread}
          selectedEmail={selectedEmail}
          selectedThreadMatch={selectedThreadMatch}
          selectedThreadLink={selectedThreadLink}
          selectedWorkspace={selectedWorkspace}
          selectedThreadLinkedEmails={selectedThreadLinkedEmails}
          threadInlineReply={threadInlineReply}
          isWideViewport={isWideViewport}
          hasReadingSelection={hasReadingSelection}
          contacts={contacts}
          deals={deals.map((d) => ({ id: d.id, title: d.title }))}
          canLinkEmails={canLinkEmails}
          canCreateActivities={canCreateActivities}
          onBack={() => {
            setSelectedThreadId(null)
            setSelectedEmailId(null)
            setComposerOpen(false)
          }}
          onOpenInlineReply={openInlineReply}
          onCloseInlineReply={() => setThreadInlineReply(null)}
          onReplyAll={openReplyAll}
          onCreateFollowUp={createFollowUpFromThread}
          onThreadAction={runThreadAction}
          onPinLink={pinThreadLink}
          onUnpinLink={unpinThreadLink}
          onManualLinkSave={saveManualThreadLink}
          onDownloadAttachment={handleDownloadAttachment}
          onRequestGmailConnect={handleConnectGmail}
          onDeleteEmail={deleteEmail}
          onSnoozeEmail={snoozeEmail}
          onSetFolder={setFolder}
          onSetSelectedEmailId={setSelectedEmailId}
          trackEmailOpen={trackEmailOpen}
          trackEmailClick={trackEmailClick}
        />
      </div>

      <EmailComposer
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onRequestGmailConnect={handleConnectGmail}
      />
    </div>
  )
}

export default InboxPage
