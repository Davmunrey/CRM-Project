import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CRMEmail, GmailThread } from '../types'
import { getGmailProfile, listGmailThreads } from '../services/gmailService'
import { getEmailProvider, resolveEmailProviderName } from '../services/emailProviders'
import { useAuditStore } from './auditStore'
import { api } from '../lib/api'
import { useAuthStore } from './authStore'
import { getTranslations } from '../i18n'
import { injectOpenPixel, normalizeBodyToHtml, rewriteLinksForTracking } from '../lib/emailTracking'
import { buildCrmFromLabel } from '../utils/outboundEmailIdentity'
import { devConsole } from '../lib/devConsole'
import { syncSequenceEnrollmentsAfterGmailSync } from '../features/sequences-flow/syncEnrollmentRepliesFromGmailThreads'

export interface GmailThreadLink {
  threadId: string
  contactId?: string
  companyId?: string
  dealId?: string
  source: 'auto' | 'manual'
  updatedAt: string
}

export interface GmailThreadWorkspaceMeta {
  threadId: string
  ownerUserId?: string
  internalNote?: string
  updatedAt: string
}

interface ScheduledEmailJob {
  id: string
  emailId: string
  runAt: string
  attempts: number
  nextAttemptAt: string
  payload: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    replyTo?: string
    attachments?: Array<{
      name: string
      mimeType: string
      size: number
      dataBase64?: string
    }>
    subject: string
    body: string
      htmlBody?: string
    contactId?: string
    dealId?: string
    companyId?: string
    senderName?: string
    ownerUserId?: string
      trackingEnabled?: boolean
  }
}

export interface EmailStore {
  emails: CRMEmail[]
  gmailAddress: string | null
  threads: GmailThread[]
  threadLinks: Record<string, GmailThreadLink>
  threadsLoading: boolean
  threadsError: string | null
  threadsLastSyncedAt: string | null
  threadsNextPageToken: string | null
  threadsHistoryId: string | null
  syncState: 'idle' | 'syncing' | 'healthy' | 'stale' | 'error'
  lastSyncErrorAt: string | null
  lastSyncErrorMessage: string | null
  scheduledQueue: ScheduledEmailJob[]
  threadWorkspace: Record<string, GmailThreadWorkspaceMeta>

  // Local email actions
  addEmail: (email: Omit<CRMEmail, 'id' | 'createdAt'>) => CRMEmail
  deleteEmail: (id: string) => void
  updateEmail: (id: string, patch: Partial<CRMEmail>) => void

  // Tracking actions
  trackEmailOpen: (emailId: string) => void
  trackEmailClick: (emailId: string) => void
  enableTracking: (emailId: string) => void

  // Gmail auth
  setGmailAddress: (addr: string | null) => void
  disconnectGmail: () => void
  isGmailConnected: () => boolean

  // Gmail send (also saves locally)
  sendEmail: (params: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    replyTo?: string
    attachments?: Array<{
      name: string
      mimeType: string
      size: number
      dataBase64?: string
    }>
    subject: string
    body: string
    htmlBody?: string
    contactId?: string
    dealId?: string
    companyId?: string
    /** Display name only; the mailbox in `from` is always `gmailAddress` for CRM records / Gmail sends. */
    senderName?: string
    trackingEnabled?: boolean
    accessToken?: string
    allowLocalFallbackWhenNoToken?: boolean
  }) => Promise<CRMEmail>
  scheduleEmail: (params: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    replyTo?: string
    attachments?: Array<{
      name: string
      mimeType: string
      size: number
      dataBase64?: string
    }>
    subject: string
    body: string
    htmlBody?: string
    contactId?: string
    dealId?: string
    companyId?: string
    /** Display name only; the mailbox in `from` is always `gmailAddress` for CRM records / Gmail sends. */
    senderName?: string
    trackingEnabled?: boolean
    runAt: string
    undoableUntil?: string
  }) => CRMEmail
  processScheduledEmails: (accessToken?: string) => Promise<void>
  saveDraft: (params: {
    draftId?: string
    to: string[]
    cc?: string[]
    bcc?: string[]
    replyTo?: string
    subject: string
    body: string
    contactId?: string
    dealId?: string
    companyId?: string
  }) => CRMEmail
  snoozeEmail: (emailId: string, untilIso: string) => void
  wakeDueSnoozedEmails: () => void
  refreshTrackingMetrics: () => Promise<void>

  // Load Gmail threads
  loadThreads: (accessToken: string, query?: string, opts?: { append?: boolean; pageToken?: string }) => Promise<void>
  fetchThreadLinks: () => Promise<void>
  fetchThreadWorkspace: () => Promise<void>
  setThreadLink: (link: Omit<GmailThreadLink, 'updatedAt'>) => void
  clearThreadLink: (threadId: string) => void
  setThreadOwner: (threadId: string, ownerUserId?: string) => void
  setThreadNote: (threadId: string, internalNote?: string) => void

  // Helpers
  getEmailsByContact: (contactId: string) => CRMEmail[]
  getEmailsByDeal: (dealId: string) => CRMEmail[]
}


export const useEmailStore = create<EmailStore>()(
  persist(
    (set, get) => ({
      emails: [],
      gmailAddress: null,
      threads: [],
      threadLinks: {},
      threadsLoading: false,
      threadsError: null,
      threadsLastSyncedAt: null,
      threadsNextPageToken: null,
      threadsHistoryId: null,
      syncState: 'idle',
      lastSyncErrorAt: null,
      lastSyncErrorMessage: null,
      scheduledQueue: [],
      threadWorkspace: {},

      addEmail: (data) => {
        const email: CRMEmail = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
        set((s) => ({ emails: [email, ...s.emails] }))
        return email
      },

      deleteEmail: (id) => set((s) => ({
        emails: s.emails.filter((e) => e.id !== id),
        scheduledQueue: s.scheduledQueue.filter((job) => job.emailId !== id),
      })),

      updateEmail: (id, patch) =>
        set((s) => ({
          emails: s.emails.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      trackEmailOpen: (emailId) =>
        set((s) => ({
          emails: s.emails.map((e) => {
            if (e.id !== emailId) return e
            const now = new Date().toISOString()
            return {
              ...e,
              openedAt: e.openedAt ?? now,
              openCount: (e.openCount ?? 0) + 1,
              lastOpenedAt: now,
            }
          }),
        })),

      trackEmailClick: (emailId) =>
        set((s) => ({
          emails: s.emails.map((e) => {
            if (e.id !== emailId) return e
            const now = new Date().toISOString()
            return {
              ...e,
              clickCount: (e.clickCount ?? 0) + 1,
              lastClickedAt: now,
            }
          }),
        })),

      enableTracking: (emailId) =>
        set((s) => ({
          emails: s.emails.map((e) => (e.id === emailId ? { ...e, trackingEnabled: true } : e)),
        })),

      setGmailAddress: (addr) => set({ gmailAddress: addr }),

      disconnectGmail: () => {
        set({ gmailAddress: null, threads: [] })
      },

      isGmailConnected: () => {
        return !!get().gmailAddress
      },

      sendEmail: async (params) => {
        const currentUserId = useAuthStore.getState().currentUser?.id
        const { accessToken } = params
        const providerName = resolveEmailProviderName()
        const emailProvider = getEmailProvider()
        let gmailMessageId: string | undefined
        let gmailThreadId: string | undefined
        let providerMessageId: string | undefined
        const emailId = crypto.randomUUID()

        const shouldUseProvider = providerName !== 'gmail' || get().isGmailConnected()
        if (
          providerName === 'gmail'
          && get().isGmailConnected()
          && !accessToken
          && !params.allowLocalFallbackWhenNoToken
        ) {
          throw new Error('Gmail connected but no active access token. Reconnect and retry.')
        }

        let trackedHtmlBody = params.htmlBody
        if (params.trackingEnabled && currentUserId) {
          try {
            const apiBase = (process.env.NEXT_PUBLIC_API_URL as string | undefined) ?? '/api'
            const openToken = crypto.randomUUID()
            const openUrl = `${apiBase}/email-tracking/open?token=${openToken}`
            const clickBaseUrl = `${apiBase}/email-tracking/click`
            const bodyHtml = params.htmlBody ?? normalizeBodyToHtml(params.body)
            const rewritten = rewriteLinksForTracking(bodyHtml, clickBaseUrl)
            trackedHtmlBody = injectOpenPixel(rewritten.htmlBody, openUrl)

            const tmRes = await api.post<{ id: string }>('/email-tracking/messages', {
              email_id: emailId,
              open_token: openToken,
              contact_id: params.contactId ?? null,
              company_id: params.companyId ?? null,
              deal_id: params.dealId ?? null,
            }).catch(() => null)
            if (tmRes?.id && rewritten.links.length > 0) {
              await api.post('/email-tracking/links', {
                links: rewritten.links.map((link) => ({
                  tracking_message_id: tmRes.id,
                  email_id: emailId,
                  original_url: link.original_url,
                  click_token: link.click_token,
                  contact_id: params.contactId ?? null,
                })),
              }).catch(() => null)
            }
          } catch {
            // tracking failure must not block send
          }
        }

        let sendSucceeded = false
        let sendError: string | undefined

        try {
          if (shouldUseProvider) {
            const sent = await emailProvider.send({
              to: params.to,
              cc: params.cc,
              bcc: params.bcc,
              replyTo: params.replyTo,
              attachments: (params.attachments ?? [])
                .filter((a) => !!a.dataBase64)
                .map((a) => ({
                  name: a.name,
                  mimeType: a.mimeType,
                  dataBase64: a.dataBase64 as string,
                })),
              subject: params.subject,
              body: params.body,
              htmlBody: trackedHtmlBody,
              accessToken,
            })
            providerMessageId = sent.providerMessageId
            if (sent.provider === 'gmail') {
              gmailMessageId = sent.providerMessageId
              gmailThreadId = sent.providerThreadId
            }
            sendSucceeded = true
          } else if (params.allowLocalFallbackWhenNoToken) {
            sendSucceeded = true
          } else {
            sendError =
              providerName === 'gmail'
                ? 'Connect Gmail to send email, or switch outbound provider in settings.'
                : 'Outbound email provider is not available.'
          }
        } catch (err) {
          sendError = err instanceof Error ? err.message : 'Send failed'
        }

        const baseFrom = get().gmailAddress ?? 'me@crm.local'
        const from = buildCrmFromLabel(baseFrom, params.senderName)
        const email: CRMEmail = {
          id: emailId,
          ownerUserId: currentUserId,
          from,
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
          replyTo: params.replyTo,
          attachments: params.attachments?.map((a) => ({
            name: a.name,
            mimeType: a.mimeType,
            size: a.size,
          })),
          subject: params.subject,
          body: params.body,
          htmlBody: trackedHtmlBody,
          status: sendSucceeded ? 'sent' : 'failed',
          sendError: sendSucceeded ? undefined : sendError,
          isRead: true,
          contactId: params.contactId,
          dealId: params.dealId,
          companyId: params.companyId,
          provider: providerName,
          providerMessageId,
          gmailMessageId,
          gmailThreadId,
          sentAt: sendSucceeded ? new Date().toISOString() : undefined,
          trackingEnabled: params.trackingEnabled ?? false,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ emails: [email, ...s.emails] }))

        // Deduplicate local sent records when Gmail returns same message id across retries.
        if (gmailMessageId) {
          const duplicates = get().emails.filter((e) => e.gmailMessageId === gmailMessageId)
          if (duplicates.length > 1) {
            const keepId = duplicates[0].id
            set((s) => ({
              emails: s.emails.filter((e) => e.gmailMessageId !== gmailMessageId || e.id === keepId),
            }))
          }
        }

        if (sendSucceeded) {
          useAuditStore.getState().logAction('email_sent', 'email', email.id, params.subject, getTranslations().auditMessages.emailSent)
        } else {
          useAuditStore.getState().logAction(
            'email_send_failed',
            'email',
            email.id,
            params.subject,
            sendError ?? getTranslations().errors.unknownError,
          )
        }
        return email
      },

      scheduleEmail: (params) => {
        const currentUserId = useAuthStore.getState().currentUser?.id
        const baseFrom = get().gmailAddress ?? 'me@crm.local'
        const from = buildCrmFromLabel(baseFrom, params.senderName)
        const email = get().addEmail({
          ownerUserId: currentUserId,
          from,
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
          replyTo: params.replyTo,
          attachments: params.attachments?.map((a) => ({
            name: a.name,
            mimeType: a.mimeType,
            size: a.size,
          })),
          subject: params.subject,
          body: params.body,
          htmlBody: params.htmlBody,
          status: 'scheduled',
          scheduledFor: params.runAt,
          undoableUntil: params.undoableUntil,
          contactId: params.contactId,
          dealId: params.dealId,
          companyId: params.companyId,
          trackingEnabled: params.trackingEnabled ?? false,
        })

        const job: ScheduledEmailJob = {
          id: crypto.randomUUID(),
          emailId: email.id,
          runAt: params.runAt,
          attempts: 0,
          nextAttemptAt: params.runAt,
          payload: {
            to: params.to,
            cc: params.cc,
            bcc: params.bcc,
            replyTo: params.replyTo,
            attachments: params.attachments,
            subject: params.subject,
            body: params.body,
            htmlBody: params.htmlBody,
            contactId: params.contactId,
            dealId: params.dealId,
            companyId: params.companyId,
            senderName: params.senderName,
            ownerUserId: currentUserId,
            trackingEnabled: params.trackingEnabled,
          },
        }
        set((s) => ({ scheduledQueue: [...s.scheduledQueue, job] }))
        return email
      },

      saveDraft: (params) => {
        const currentUserId = useAuthStore.getState().currentUser?.id
        const baseFrom = get().gmailAddress ?? 'me@crm.local'
        const targetDraftId = params.draftId ?? crypto.randomUUID()
        const existing = get().emails.find((e) => e.id === targetDraftId)
        const draft: CRMEmail = {
          id: targetDraftId,
          ownerUserId: currentUserId,
          from: baseFrom,
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
          replyTo: params.replyTo,
          subject: params.subject,
          body: params.body,
          status: 'draft',
          isRead: true,
          contactId: params.contactId,
          dealId: params.dealId,
          companyId: params.companyId,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
        }
        set((s) => ({
          emails: [draft, ...s.emails.filter((e) => e.id !== targetDraftId)],
        }))
        return draft
      },

      snoozeEmail: (emailId, untilIso) =>
        set((s) => ({
          emails: s.emails.map((e) => (
            e.id === emailId
              ? { ...e, status: 'snoozed', scheduledFor: untilIso }
              : e
          )),
        })),

      wakeDueSnoozedEmails: () =>
        set((s) => {
          const now = Date.now()
          return {
            emails: s.emails.map((e) => {
              if (e.status !== 'snoozed' || !e.scheduledFor) return e
              if (new Date(e.scheduledFor).getTime() > now) return e
              return {
                ...e,
                status: 'received',
                scheduledFor: undefined,
              }
            }),
          }
        }),

      processScheduledEmails: async (accessToken) => {
        const now = Date.now()
        const dueJobs = get().scheduledQueue.filter(
          (j) => new Date(j.nextAttemptAt ?? j.runAt).getTime() <= now
        )
        if (!dueJobs.length) return

        for (const job of dueJobs) {
          try {
            let gmailMessageId: string | undefined
            let gmailThreadId: string | undefined
            let providerMessageId: string | undefined
            const providerName = resolveEmailProviderName()
            const emailProvider = getEmailProvider()
            let trackedHtmlBody = job.payload.htmlBody
            if (job.payload.trackingEnabled && job.payload.ownerUserId) {
              try {
                const apiBase = (process.env.NEXT_PUBLIC_API_URL as string | undefined) ?? '/api'
                const openToken = crypto.randomUUID()
                const openUrl = `${apiBase}/email-tracking/open?token=${openToken}`
                const clickBaseUrl = `${apiBase}/email-tracking/click`
                const bodyHtml = job.payload.htmlBody ?? normalizeBodyToHtml(job.payload.body)
                const rewritten = rewriteLinksForTracking(bodyHtml, clickBaseUrl)
                trackedHtmlBody = injectOpenPixel(rewritten.htmlBody, openUrl)
                const tmRes = await api.post<{ id: string }>('/email-tracking/messages', {
                  email_id: job.emailId,
                  open_token: openToken,
                  contact_id: job.payload.contactId ?? null,
                  company_id: job.payload.companyId ?? null,
                  deal_id: job.payload.dealId ?? null,
                }).catch(() => null)
                if (tmRes?.id && rewritten.links.length > 0) {
                  await api.post('/email-tracking/links', {
                    links: rewritten.links.map((link) => ({
                      tracking_message_id: tmRes.id,
                      email_id: job.emailId,
                      original_url: link.original_url,
                      click_token: link.click_token,
                      contact_id: job.payload.contactId ?? null,
                    })),
                  }).catch(() => null)
                }
              } catch {
                // tracking failure must not block send
              }
            }
            const shouldUseProvider = providerName !== 'gmail' || get().isGmailConnected()
            let sendSucceeded = false
            let sendError: string | undefined

            try {
              if (shouldUseProvider) {
                const sent = await emailProvider.send({
                  to: job.payload.to,
                  cc: job.payload.cc,
                  bcc: job.payload.bcc,
                  replyTo: job.payload.replyTo,
                  attachments: (job.payload.attachments ?? [])
                    .filter((a) => !!a.dataBase64)
                    .map((a) => ({
                      name: a.name,
                      mimeType: a.mimeType,
                      dataBase64: a.dataBase64 as string,
                    })),
                  subject: job.payload.subject,
                  body: job.payload.body,
                  htmlBody: trackedHtmlBody,
                  accessToken,
                })
                providerMessageId = sent.providerMessageId
                if (sent.provider === 'gmail') {
                  gmailMessageId = sent.providerMessageId
                  gmailThreadId = sent.providerThreadId
                }
                sendSucceeded = true
              } else {
                sendError =
                  providerName === 'gmail'
                    ? 'Connect Gmail to send scheduled email.'
                    : 'Outbound email provider is not available.'
              }
            } catch (err) {
              sendError = err instanceof Error ? err.message : 'Send failed'
            }

            get().updateEmail(job.emailId, {
              status: sendSucceeded ? 'sent' : 'failed',
              sendError: sendSucceeded ? undefined : sendError,
              sentAt: sendSucceeded ? new Date().toISOString() : undefined,
              scheduledFor: undefined,
              provider: providerName,
              providerMessageId,
              gmailMessageId,
              gmailThreadId,
              htmlBody: trackedHtmlBody,
            })
            set((s) => ({ scheduledQueue: s.scheduledQueue.filter((q) => q.id !== job.id) }))
          } catch (err) {
            const MAX_ATTEMPTS = 5
            const BACKOFF_MINUTES = [1, 5, 30, 120, 720] // 1m, 5m, 30m, 2h, 12h
            set((s) => ({
              scheduledQueue: s.scheduledQueue.map((q) => {
                if (q.id !== job.id) return q
                const newAttempts = (q.attempts ?? 0) + 1
                if (newAttempts >= MAX_ATTEMPTS) {
                  get().updateEmail(job.emailId, { status: 'failed', sendError: err instanceof Error ? err.message : 'Max retries exceeded' })
                  return null
                }
                const delayMs = (BACKOFF_MINUTES[newAttempts - 1] ?? 720) * 60_000
                return {
                  ...q,
                  attempts: newAttempts,
                  nextAttemptAt: new Date(Date.now() + delayMs).toISOString(),
                }
              }).filter((q): q is ScheduledEmailJob => q !== null),
            }))
          }
        }
      },

      loadThreads: async (accessToken: string, query = '', opts = {}) => {
        set({ threadsLoading: true, threadsError: null, syncState: 'syncing' })
        try {
          if (!get().gmailAddress) {
            const profile = await getGmailProfile(accessToken)
            set({ gmailAddress: profile.emailAddress })
          }
          const result = await listGmailThreads(accessToken, query, 30, opts.pageToken)
          const threads = opts.append
            ? [...get().threads, ...result.threads.filter((th) => !get().threads.some((existing) => existing.id === th.id))]
            : result.threads
          set({
            threads,
            threadsLoading: false,
            threadsLastSyncedAt: new Date().toISOString(),
            threadsNextPageToken: result.nextPageToken,
            threadsHistoryId: result.historyId,
            syncState: 'healthy',
            lastSyncErrorAt: null,
            lastSyncErrorMessage: null,
          })
          syncSequenceEnrollmentsAfterGmailSync(threads, get().gmailAddress)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : getTranslations().errors.gmailThreadsLoadError
          set({
            threadsLoading: false,
            threadsError: errorMessage,
            threadsLastSyncedAt: new Date().toISOString(),
            syncState: 'error',
            lastSyncErrorAt: new Date().toISOString(),
            lastSyncErrorMessage: errorMessage,
          })
        }
      },

      fetchThreadLinks: async () => {
        try {
          const rows = await api.get<Array<{
            threadId: string; contactId?: string; companyId?: string; dealId?: string; source: string; updatedAt?: string
          }>>('/gmail/thread-links')
          const links: Record<string, GmailThreadLink> = {}
          for (const row of (rows ?? [])) {
            links[row.threadId] = {
              threadId: row.threadId,
              contactId: row.contactId ?? undefined,
              companyId: row.companyId ?? undefined,
              dealId: row.dealId ?? undefined,
              source: row.source === 'manual' ? 'manual' : 'auto',
              updatedAt: row.updatedAt ?? new Date().toISOString(),
            }
          }
          set({ threadLinks: links })
        } catch (err) {
          devConsole.error('[emailStore] fetchThreadLinks failed', err instanceof Error ? err.message : err)
        }
      },

      fetchThreadWorkspace: async () => {
        try {
          const rows = await api.get<Array<{ threadId: string; ownerUserId: string | null; internalNote: string | null; updatedAt: string }>>(
            '/gmail/thread-workspace',
          )
          const map: Record<string, GmailThreadWorkspaceMeta> = {}
          for (const r of rows ?? []) {
            map[r.threadId] = {
              threadId: r.threadId,
              ownerUserId: r.ownerUserId ?? undefined,
              internalNote: r.internalNote ?? undefined,
              updatedAt: r.updatedAt,
            }
          }
          set({ threadWorkspace: map })
        } catch {
          // Non-critical — local state remains
        }
      },

      setThreadLink: (link) => {
        const next: GmailThreadLink = {
          ...link,
          updatedAt: new Date().toISOString(),
        }
        set((s) => ({
          threadLinks: { ...s.threadLinks, [link.threadId]: next },
        }))

        api.post('/gmail/thread-links', {
          thread_id: link.threadId,
          contact_id: link.contactId ?? null,
          company_id: link.companyId ?? null,
          deal_id: link.dealId ?? null,
          source: link.source,
        }).catch(() => null)
      },

      clearThreadLink: (threadId) => {
        set((s) => {
          const next = { ...s.threadLinks }
          delete next[threadId]
          return { threadLinks: next }
        })

        api.delete(`/gmail/thread-links/${encodeURIComponent(threadId)}`).catch(() => null)
      },

      setThreadOwner: (threadId, ownerUserId) => {
        const current = get().threadWorkspace[threadId]
        const next = {
          threadId,
          ownerUserId,
          internalNote: current?.internalNote,
          updatedAt: new Date().toISOString(),
        }
        set((s) => ({
          threadWorkspace: { ...s.threadWorkspace, [threadId]: next },
        }))
        api.put(`/gmail/thread-workspace/${encodeURIComponent(threadId)}`, { ownerUserId }).catch(() => null)
      },

      setThreadNote: (threadId, internalNote) => {
        const current = get().threadWorkspace[threadId]
        const note = internalNote?.trim() || null
        const next = {
          threadId,
          ownerUserId: current?.ownerUserId,
          internalNote: note ?? undefined,
          updatedAt: new Date().toISOString(),
        }
        set((s) => ({
          threadWorkspace: { ...s.threadWorkspace, [threadId]: next },
        }))
        api.put(`/gmail/thread-workspace/${encodeURIComponent(threadId)}`, { internalNote: note }).catch(() => null)
      },

      getEmailsByContact: (contactId) => get().emails.filter((e) => e.contactId === contactId),
      getEmailsByDeal: (dealId) => get().emails.filter((e) => e.dealId === dealId),
      refreshTrackingMetrics: async () => {
        const tracked = get().emails.filter((e) => e.trackingEnabled)
        if (tracked.length === 0) return
        await Promise.allSettled(
          tracked.map(async (email) => {
            const res = await api.get<{ opens: number; clicks: number }>(
              `/email-tracking/messages/${encodeURIComponent(email.id)}/stats`,
            )
            set((s) => ({
              emails: s.emails.map((e) =>
                e.id === email.id
                  ? { ...e, openCount: res.opens, clickCount: res.clicks }
                  : e,
              ),
            }))
          }),
        )
      },
    }),
    {
      name: 'crm_emails_v2',
      version: 6,
      migrate: (persistedState: unknown, version: number) => {
        if (version < 2) {
          const s = persistedState as Record<string, unknown>
          delete s.gmailTokens
          if (!Array.isArray(s.emails)) {
            s.emails = []
          }
          return s
        }
        const s = persistedState as Record<string, unknown>
        if (version < 3) {
          if (!Array.isArray(s.emails)) {
            s.emails = []
          }
        }
        if (version < 4) {
          s.scheduledQueue = []
        }
        if (version < 5) {
          s.threadWorkspace = {}
          s.threadsNextPageToken = null
          s.threadsHistoryId = null
        }
        if (version < 6) {
          const currentUserId = useAuthStore.getState().currentUser?.id
          if (Array.isArray(s.emails) && currentUserId) {
            s.emails = (s.emails as CRMEmail[]).map((email) => ({
              ...email,
              ownerUserId: email.ownerUserId ?? currentUserId,
            }))
          }
        }
        return s as unknown as EmailStore
      },
      partialize: (s) => ({
        /** Persist metadata only - large bodies are re-fetched from provider when needed. */
        emails: s.emails.map((e) => ({ ...e, body: '', htmlBody: undefined })),
        gmailAddress: s.gmailAddress,
        threadLinks: s.threadLinks,
        threadWorkspace: s.threadWorkspace,
        threadsLastSyncedAt: s.threadsLastSyncedAt,
        threadsNextPageToken: s.threadsNextPageToken,
        threadsHistoryId: s.threadsHistoryId,
        syncState: s.syncState,
        lastSyncErrorAt: s.lastSyncErrorAt,
        lastSyncErrorMessage: s.lastSyncErrorMessage,
        scheduledQueue: s.scheduledQueue,
      }),
    },
  ),
)
