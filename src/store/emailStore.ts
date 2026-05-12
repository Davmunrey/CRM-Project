import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CRMEmail, GmailThread } from '../types'
import { getGmailProfile, listGmailThreads } from '../services/gmailService'
import { getEmailProvider, resolveEmailProviderName } from '../services/emailProviders'
import { useAuditStore } from './auditStore'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { getOrgId, runSupabaseWrite } from '../lib/supabaseHelpers'
import { useAuthStore } from './authStore'
import { useLeadsStore } from './leadsStore'
import { getTranslations } from '../i18n'
import type { Database } from '../lib/database.types'
import { injectOpenPixel, normalizeBodyToHtml, rewriteLinksForTracking } from '../lib/emailTracking'
import { buildCrmFromLabel } from '../utils/outboundEmailIdentity'
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

type GmailThreadLinkRow = Database['public']['Tables']['gmail_thread_links']['Row']

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
        if (params.trackingEnabled && isSupabaseConfigured && supabase && currentUserId) {
          const supabaseBase = import.meta.env.VITE_SUPABASE_URL as string | undefined
          if (supabaseBase) {
            const openToken = crypto.randomUUID()
            const openUrl = `${supabaseBase}/functions/v1/track-open?token=${openToken}`
            const clickBaseUrl = `${supabaseBase}/functions/v1/track-click`
            const bodyHtml = params.htmlBody ?? normalizeBodyToHtml(params.body)
            const rewritten = rewriteLinksForTracking(bodyHtml, clickBaseUrl)
            trackedHtmlBody = injectOpenPixel(rewritten.htmlBody, openUrl)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
            const { data: trackingMessage, error: trackingMessageError } = await (supabase as any)
              .from('email_tracking_messages')
              .insert({
                email_id: emailId,
                organization_id: getOrgId(),
                user_id: currentUserId,
                contact_id: params.contactId ?? null,
                company_id: params.companyId ?? null,
                deal_id: params.dealId ?? null,
                open_token: openToken,
              })
              .select('id')
              .single()
            if (!trackingMessageError && trackingMessage?.id && rewritten.links.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
              await (supabase as any)
                .from('email_tracking_links')
                .insert(rewritten.links.map((link) => ({
                  tracking_message_id: trackingMessage.id,
                  email_id: emailId,
                  organization_id: getOrgId(),
                  user_id: currentUserId,
                  contact_id: params.contactId ?? null,
                  original_url: link.original_url,
                  click_token: link.click_token,
                })))
            }
          }
        }

        let sendSucceeded = false
        let sendError: string | undefined
        const mockRuntime = !isSupabaseConfigured

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
          } else if (mockRuntime || params.allowLocalFallbackWhenNoToken) {
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
            if (job.payload.trackingEnabled && isSupabaseConfigured && supabase && job.payload.ownerUserId) {
              const supabaseBase = import.meta.env.VITE_SUPABASE_URL as string | undefined
              if (supabaseBase) {
                const openToken = crypto.randomUUID()
                const openUrl = `${supabaseBase}/functions/v1/track-open?token=${openToken}`
                const clickBaseUrl = `${supabaseBase}/functions/v1/track-click`
                const bodyHtml = job.payload.htmlBody ?? normalizeBodyToHtml(job.payload.body)
                const rewritten = rewriteLinksForTracking(bodyHtml, clickBaseUrl)
                trackedHtmlBody = injectOpenPixel(rewritten.htmlBody, openUrl)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
                const { data: trackingMessage, error: trackingInsertError } = await (supabase as any)
                  .from('email_tracking_messages')
                  .insert({
                    email_id: job.emailId,
                    organization_id: getOrgId(),
                    user_id: job.payload.ownerUserId,
                    contact_id: job.payload.contactId ?? null,
                    company_id: job.payload.companyId ?? null,
                    deal_id: job.payload.dealId ?? null,
                    open_token: openToken,
                  })
                  .select('id')
                  .single()
                if (trackingInsertError) {
                  console.error('[emailStore] tracking_messages insert failed', trackingInsertError.message)
                  // No insertar tracking_links para evitar phantom opens — continuar sin tracking
                } else if (trackingMessage?.id && rewritten.links.length > 0) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
                  const { error: linksInsertError } = await (supabase as any)
                    .from('email_tracking_links')
                    .insert(rewritten.links.map((link) => ({
                      tracking_message_id: trackingMessage.id,
                      email_id: job.emailId,
                      organization_id: getOrgId(),
                      user_id: job.payload.ownerUserId,
                      contact_id: job.payload.contactId ?? null,
                      original_url: link.original_url,
                      click_token: link.click_token,
                    })))
                  if (linksInsertError) {
                    console.error('[emailStore] tracking_links insert failed', linksInsertError.message)
                  }
                }
              }
            }
            const shouldUseProvider = providerName !== 'gmail' || get().isGmailConnected()
            const mockRuntime = !isSupabaseConfigured
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
              } else if (mockRuntime) {
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
        if (!isSupabaseConfigured || !supabase) return
        try {
          const { data, error } = await supabase
            .from('gmail_thread_links')
            .select('thread_id, contact_id, company_id, deal_id, source, updated_at')

          if (error) return

          const links: Record<string, GmailThreadLink> = {}
          for (const row of (data ?? []) as Pick<GmailThreadLinkRow, 'thread_id' | 'contact_id' | 'company_id' | 'deal_id' | 'source' | 'updated_at'>[]) {
            links[row.thread_id] = {
              threadId: row.thread_id,
              contactId: row.contact_id ?? undefined,
              companyId: row.company_id ?? undefined,
              dealId: row.deal_id ?? undefined,
              source: row.source === 'manual' ? 'manual' : 'auto',
              updatedAt: row.updated_at ?? new Date().toISOString(),
            }
          }
          set({ threadLinks: links })
        } catch (err) {
          // Non-critical: link hydration failure does not block Inbox
          console.error('[emailStore] fetchThreadLinks failed', err instanceof Error ? err.message : err)
        }
      },

      fetchThreadWorkspace: async () => {
        if (!isSupabaseConfigured || !supabase) return
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
          const { data, error } = await (supabase as any)
            .from('gmail_thread_workspace')
            .select('thread_id, owner_user_id, internal_note, updated_at')

          if (error) return

          const workspace: Record<string, GmailThreadWorkspaceMeta> = {}
          for (const row of (data ?? []) as Array<{
            thread_id: string
            owner_user_id?: string | null
            internal_note?: string | null
            updated_at?: string | null
          }>) {
            workspace[row.thread_id] = {
              threadId: row.thread_id,
              ownerUserId: row.owner_user_id ?? undefined,
              internalNote: row.internal_note ?? undefined,
              updatedAt: row.updated_at ?? new Date().toISOString(),
            }
          }
          set({ threadWorkspace: workspace })
        } catch (err) {
          // Non-critical: local state is still available
          console.error('[emailStore] fetchThreadWorkspace failed', err instanceof Error ? err.message : err)
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

        if (isSupabaseConfigured && supabase) {
          const currentUserId = useAuthStore.getState().currentUser?.id
          if (!currentUserId) return
          runSupabaseWrite(
            'emailStore:setThreadLink',
            supabase.from('gmail_thread_links').upsert({
              thread_id: link.threadId,
              user_id: currentUserId,
              contact_id: link.contactId ?? null,
              company_id: link.companyId ?? null,
              deal_id: link.dealId ?? null,
              source: link.source,
              organization_id: getOrgId(),
            } as never, { onConflict: 'thread_id,user_id,organization_id' }),
          )
        }
      },

      clearThreadLink: (threadId) => {
        set((s) => {
          const next = { ...s.threadLinks }
          delete next[threadId]
          return { threadLinks: next }
        })

        if (isSupabaseConfigured && supabase) {
          runSupabaseWrite(
            'emailStore:clearThreadLink',
            supabase.from('gmail_thread_links').delete().eq('thread_id', threadId),
          )
        }
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
          threadWorkspace: {
            ...s.threadWorkspace,
            [threadId]: next,
          },
        }))

        if (isSupabaseConfigured && supabase) {
          const currentUserId = useAuthStore.getState().currentUser?.id
          if (!currentUserId) return
          runSupabaseWrite(
            'emailStore:setThreadOwner',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
            (supabase as any).from('gmail_thread_workspace').upsert({
              thread_id: threadId,
              user_id: currentUserId,
              owner_user_id: next.ownerUserId ?? null,
              internal_note: next.internalNote ?? null,
              organization_id: getOrgId(),
              updated_at: next.updatedAt,
            }, { onConflict: 'thread_id,user_id,organization_id' }),
          )
        }
      },

      setThreadNote: (threadId, internalNote) => {
        const current = get().threadWorkspace[threadId]
        const next = {
          threadId,
          ownerUserId: current?.ownerUserId,
          internalNote: internalNote?.trim() || undefined,
          updatedAt: new Date().toISOString(),
        }
        set((s) => ({
          threadWorkspace: {
            ...s.threadWorkspace,
            [threadId]: next,
          },
        }))

        if (isSupabaseConfigured && supabase) {
          const currentUserId = useAuthStore.getState().currentUser?.id
          if (!currentUserId) return
          runSupabaseWrite(
            'emailStore:setThreadNote',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
            (supabase as any).from('gmail_thread_workspace').upsert({
              thread_id: threadId,
              user_id: currentUserId,
              owner_user_id: next.ownerUserId ?? null,
              internal_note: next.internalNote ?? null,
              organization_id: getOrgId(),
              updated_at: next.updatedAt,
            }, { onConflict: 'thread_id,user_id,organization_id' }),
          )
        }
      },

      getEmailsByContact: (contactId) => get().emails.filter((e) => e.contactId === contactId),
      getEmailsByDeal: (dealId) => get().emails.filter((e) => e.dealId === dealId),
      refreshTrackingMetrics: async () => {
        if (!isSupabaseConfigured || !supabase) return
        const currentUserId = useAuthStore.getState().currentUser?.id
        const legacyOwnedCandidates = get().emails
          .filter((e) => !e.ownerUserId && e.trackingEnabled)
          .map((e) => e.id)
        if (currentUserId && legacyOwnedCandidates.length > 0) {
          await supabase.functions.invoke('backfill-email-tracking-user', {
            body: { emailIds: legacyOwnedCandidates },
          })
          set((s) => ({
            emails: s.emails.map((email) => (
              legacyOwnedCandidates.includes(email.id)
                ? { ...email, ownerUserId: currentUserId }
                : email
            )),
          }))
        }
        const effectiveScopedEmails = get().emails.filter((e) => e.ownerUserId && e.ownerUserId === currentUserId)
        const trackedIds = effectiveScopedEmails.filter((e) => e.trackingEnabled).map((e) => e.id)
        if (trackedIds.length === 0) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
        const { data, error } = await (supabase as any)
          .from('email_tracking_events')
          .select('id,email_id,event_type,created_at')
          .in('email_id', trackedIds)
          .order('created_at', { ascending: false })
        if (error) return
        const grouped = new Map<string, { opens: string[]; clicks: string[] }>()
        for (const row of (data ?? []) as Array<{ email_id: string; event_type: 'open' | 'click'; created_at: string }>) {
          const curr = grouped.get(row.email_id) ?? { opens: [], clicks: [] }
          if (row.event_type === 'open') curr.opens.push(row.created_at)
          if (row.event_type === 'click') curr.clicks.push(row.created_at)
          grouped.set(row.email_id, curr)
        }
        set((s) => ({
          emails: s.emails.map((email) => {
            const stat = grouped.get(email.id)
            if (!stat) return email
            const newestOpen = stat.opens[0]
            const oldestOpen = stat.opens[stat.opens.length - 1]
            const newestClick = stat.clicks[0]
            return {
              ...email,
              openCount: stat.opens.length,
              clickCount: stat.clicks.length,
              openedAt: oldestOpen ?? email.openedAt,
              lastOpenedAt: newestOpen ?? email.lastOpenedAt,
              lastClickedAt: newestClick ?? email.lastClickedAt,
            }
          }),
        }))

        // Feed Leads scoring engine from tracking telemetry (HubSpot-like behavior).
        const emailById = new Map(effectiveScopedEmails.map((email) => [email.id, email]))
        const recipientEmails = new Set<string>()
        const leadsToRecompute = new Set<string>()
        for (const row of (data ?? []) as Array<{ id: string; email_id: string; event_type: 'open' | 'click'; created_at: string }>) {
          const crmEmail = emailById.get(row.email_id)
          const recipient = crmEmail?.to?.[0]?.trim().toLowerCase()
          if (recipient) recipientEmails.add(recipient)
        }
        if (recipientEmails.size === 0) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
        const { data: leadsRows } = await (supabase as any)
          .from('leads')
          .select('id,email')
          .limit(2000)
        const leadIdByEmail = new Map<string, string>(
          ((leadsRows ?? []) as Array<{ id: string; email: string }>)
            .map((row) => [row.email.trim().toLowerCase(), row.id]),
        )

        for (const row of (data ?? []) as Array<{ id: string; email_id: string; event_type: 'open' | 'click'; created_at: string }>) {
          const crmEmail = emailById.get(row.email_id)
          const recipient = crmEmail?.to?.[0]?.trim().toLowerCase()
          if (!recipient) continue
          const leadId = leadIdByEmail.get(recipient)
          if (!leadId) continue

          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
          const { data: existing } = await (supabase as any)
            .from('lead_events')
            .select('id')
            .eq('lead_id', leadId)
            .eq('metadata->>tracking_event_id', row.id)
            .limit(1)
            .maybeSingle()
          if (existing?.id) continue

          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
          await (supabase as any)
            .from('lead_events')
            .insert({
              organization_id: getOrgId(),
              lead_id: leadId,
              event_type: row.event_type === 'open' ? 'email_open' : 'email_click',
              metadata: {
                tracking_event_id: row.id,
                email_id: row.email_id,
                tracked_at: row.created_at,
              },
            })
          leadsToRecompute.add(leadId)
        }
        for (const leadId of leadsToRecompute) {
          await useLeadsStore.getState().recomputeLeadScore(leadId, { reason: 'tracking_event_ingested' })
        }
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
