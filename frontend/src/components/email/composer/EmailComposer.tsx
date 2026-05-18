import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { useEmailStore } from '../../../store/emailStore'
import { useActivitiesStore } from '../../../store/activitiesStore'
import { useContactsStore } from '../../../store/contactsStore'
import { useDealsStore } from '../../../store/dealsStore'
import { useCompaniesStore } from '../../../store/companiesStore'
import { useTemplateStore } from '../../../store/templateStore'
import { useSettingsStore } from '../../../store/settingsStore'
import { useAuthStore } from '../../../store/authStore'
import { toast } from '../../../store/toastStore'
import { useTranslations } from '../../../i18n'
import { Select } from '../../ui/Select'
import { resolveSendContextFromTo } from '../../../features/inbox'
import { resolveEmailProviderName } from '../../../services/emailProviders'
import { applyEmailMergeTokens, buildEmailMergeVariableMap, getEmailMergeFieldOptions } from '../../../utils/emailMergeFields'
import {
  type BodyEditResult,
  applyEditToTextarea,
  clearFormattingInSelection,
  expandSelectionToLineRange,
  formatPlainToHtml,
  indentSelection,
  numberLinesInSelection,
  outdentSelection,
  prefixLinesInSelection,
  wrapSelectionMarkers,
} from '../../../utils/emailPlainFormatting'
import { ComposerHeader } from './ComposerHeader'
import { ComposerBody } from './ComposerBody'
import { ComposerAttachments } from './ComposerAttachments'
import { ComposerFooter } from './ComposerFooter'

type EmailIdentityLike = {
  useSignature?: boolean
  composerSignatureDefault?: 'include_default' | 'none_by_default'
}

/** New compose / sequence steps (without explicit per-step override) use this for "Include signature". */
function resolveComposerIncludeSignature(identity: EmailIdentityLike | undefined): boolean {
  if (!identity) return true
  if (identity.composerSignatureDefault === 'none_by_default') return false
  if (identity.composerSignatureDefault === 'include_default') return true
  return identity.useSignature !== false
}

export interface EmailComposerProps {
  isOpen: boolean
  onClose: () => void
  defaultTo?: string
  defaultSubject?: string
  defaultBody?: string
  /** Comma-separated; used when editing an existing draft (`draftId`). */
  defaultCc?: string
  defaultBcc?: string
  defaultReplyTo?: string
  defaultAttachments?: Array<{
    name: string
    mimeType: string
    size: number
    dataBase64?: string
  }>
  contactId?: string
  dealId?: string
  companyId?: string
  draftId?: string
  /** Shown when Gmail is required but disconnected (e.g. OAuth from Inbox). */
  onRequestGmailConnect?: () => void
  /** `inline`: embedded panel (e.g. thread reply). `modal`: full-screen portal (new mail, drafts). */
  presentation?: 'modal' | 'inline'
  /**
   * Mailbox-style editor for sequence steps: same subject/body/template/formatting column as inbox,
   * without recipients, CRM sidebar, attachments, or send footer. Signature + sender name are shown in a compact layout and persisted via `onSequenceStepDraftChange`.
   * Pair with `presentation="inline"`, `isOpen`, and `sequenceEmbedResetKey` (e.g. node id) to reload when switching nodes.
   */
  embeddedSequenceStep?: boolean
  sequenceEmbedResetKey?: string
  /** Debounced (~400ms) updates while editing a sequence email node */
  onSequenceStepDraftChange?: (draft: {
    subject: string
    body: string
    useEmailSignature: boolean
    emailSignatureHtml: string
    emailSenderName: string
    cc: string
    bcc: string
  }) => void
  /** Initial signature/sender state when `embeddedSequenceStep` (read on `sequenceEmbedResetKey` change). */
  sequenceStepEmailExtras?: {
    useEmailSignature?: boolean
    emailSignatureHtml?: string
    emailSenderName?: string
    cc?: string
    bcc?: string
  }
}

/** Stable default - a fresh `[]` each render was in the seed effect deps and reset the body on every keystroke. */
const EMPTY_EMAIL_ATTACHMENTS: NonNullable<EmailComposerProps['defaultAttachments']> = []

export function EmailComposer({
  isOpen,
  onClose,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  defaultCc = '',
  defaultBcc = '',
  defaultReplyTo = '',
  defaultAttachments = EMPTY_EMAIL_ATTACHMENTS,
  contactId,
  dealId,
  companyId,
  draftId,
  onRequestGmailConnect,
  presentation = 'modal',
  embeddedSequenceStep = false,
  sequenceEmbedResetKey,
  onSequenceStepDraftChange,
  sequenceStepEmailExtras,
}: EmailComposerProps) {
  const t = useTranslations()
  const sendHintId = useId()
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formatUndoPast = useRef<string[]>([])
  const formatUndoFuture = useRef<string[]>([])
  const [undoDepth, setUndoDepth] = useState(0)
  const [redoDepth, setRedoDepth] = useState(0)
  const [to, setTo] = useState(defaultTo)
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [showReplyTo, setShowReplyTo] = useState(false)
  const [sending, setSending] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const [sendLater, setSendLater] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [attachments, setAttachments] = useState<Array<{
    name: string
    mimeType: string
    size: number
    dataBase64: string
  }>>([])
  const [activeDraftId, setActiveDraftId] = useState<string | undefined>(draftId)
  const [linkContactId, setLinkContactId] = useState<string | undefined>(undefined)
  const [linkDealId, setLinkDealId] = useState<string | undefined>(undefined)
  const [linkCompanyId, setLinkCompanyId] = useState<string | undefined>(undefined)
  const [showSignatureSection, setShowSignatureSection] = useState(true)

  const { scheduleEmail, isGmailConnected, enableTracking, gmailAddress } = useEmailStore()
  const currentUser = useAuthStore((s) => s.currentUser)
  const settings = useSettingsStore((s) => s.settings)
  const updateEmailIdentity = useSettingsStore((s) => s.updateEmailIdentity)
  const contacts = useContactsStore((s) => s.contacts)
  const deals = useDealsStore((s) => s.deals)
  const companies = useCompaniesStore((s) => s.companies)
  const templates = useTemplateStore((s) => s.templates)
  const quickReplies = useTemplateStore((s) => s.quickReplies)
  const fetchQuickReplies = useTemplateStore((s) => s.fetchQuickReplies)
  const incrementUsage = useTemplateStore((s) => s.incrementUsage)
  /** Single object dep so signature + signatures[] updates always re-sync (Zustand persist / Settings). */
  const emailIdentityForUser = useMemo(
    () => (currentUser?.id ? settings.emailIdentities?.[currentUser.id] : undefined),
    [currentUser?.id, settings.emailIdentities],
  )
  const currentIdentity = emailIdentityForUser
  const savedSignatures = currentIdentity?.signatures ?? []
  const defaultSignatureId = currentIdentity?.defaultSignatureId ?? savedSignatures[0]?.id
  const [senderName, setSenderName] = useState(currentIdentity?.senderName ?? '')
  const [activeSignatureId, setActiveSignatureId] = useState(defaultSignatureId ?? '')
  const [signature, setSignature] = useState(currentIdentity?.signature ?? savedSignatures[0]?.html ?? '')
  const [useSignature, setUseSignature] = useState(currentIdentity?.useSignature ?? true)

  const draftKey = useMemo(
    () => `crm_email_draft:${contactId ?? 'na'}:${dealId ?? 'na'}:${companyId ?? 'na'}:${defaultTo}`,
    [companyId, contactId, dealId, defaultTo],
  )

  const inferredSend = useMemo(
    () =>
      contactId || dealId || companyId
        ? { contactId, dealId, companyId }
        : resolveSendContextFromTo(to, contacts, deals),
    [contactId, dealId, companyId, to, contacts, deals],
  )

  const activityContext = useMemo(
    () => ({
      contactId: linkContactId ?? contactId ?? inferredSend.contactId,
      dealId: linkDealId ?? dealId ?? inferredSend.dealId,
      companyId: linkCompanyId ?? companyId ?? inferredSend.companyId,
    }),
    [
      linkContactId,
      linkDealId,
      linkCompanyId,
      contactId,
      dealId,
      companyId,
      inferredSend.contactId,
      inferredSend.dealId,
      inferredSend.companyId,
    ],
  )

  const defaultAttachmentsKey = useMemo(() => {
    if (!defaultAttachments.length) return ''
    return defaultAttachments
      .map((a) => `${a.name}\0${a.size}\0${a.dataBase64?.length ?? 0}`)
      .join('\n')
  }, [defaultAttachments])

  useEffect(() => {
    if (!isOpen) return
    if (embeddedSequenceStep) return
    setLinkContactId(contactId)
    setLinkDealId(dealId)
    setLinkCompanyId(companyId)
    setActiveDraftId(draftId)
    setShowTemplates(false)

    const seedFromParent =
      Boolean(draftId) ||
      Boolean(defaultTo?.trim()) ||
      Boolean(defaultSubject?.trim()) ||
      Boolean(defaultBody?.trim())

    const applyDefaultAttachments = () => {
      if (defaultAttachments.length > 0) {
        setAttachments(defaultAttachments.filter((a) => !!a.dataBase64).map((a) => ({
          name: a.name,
          mimeType: a.mimeType,
          size: a.size,
          dataBase64: a.dataBase64 as string,
        })))
      } else {
        setAttachments([])
      }
    }

    const applyEmptyCcBcc = () => {
      setCc('')
      setBcc('')
      setReplyTo('')
      setShowCc(false)
      setShowBcc(false)
      setShowReplyTo(false)
    }

    if (seedFromParent) {
      setTo(defaultTo)
      setSubject(defaultSubject)
      setBody(defaultBody)
      if (draftId) {
        setCc(defaultCc)
        setBcc(defaultBcc)
        setReplyTo(defaultReplyTo)
        setShowCc(defaultCc.trim().length > 0)
        setShowBcc(defaultBcc.trim().length > 0)
        setShowReplyTo(defaultReplyTo.trim().length > 0)
      } else {
        applyEmptyCcBcc()
      }
      applyDefaultAttachments()
      return
    }

    const raw = localStorage.getItem(draftKey)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          to?: string
          cc?: string
          bcc?: string
          replyTo?: string
          subject?: string
          body?: string
          attachments?: Array<{ name: string; mimeType: string; size: number; dataBase64: string }>
        }
        setTo(parsed.to ?? defaultTo)
        setCc(parsed.cc ?? '')
        setBcc(parsed.bcc ?? '')
        setReplyTo(parsed.replyTo ?? '')
        setSubject(parsed.subject ?? defaultSubject)
        setBody(parsed.body ?? defaultBody)
        setAttachments(parsed.attachments ?? [])
        setShowCc(!!parsed.cc)
        setShowBcc(!!parsed.bcc)
        setShowReplyTo(!!parsed.replyTo)
        if (defaultAttachments.length > 0) applyDefaultAttachments()
      } catch {
        localStorage.removeItem(draftKey)
        setTo(defaultTo)
        setSubject(defaultSubject)
        setBody(defaultBody)
        applyEmptyCcBcc()
        applyDefaultAttachments()
      }
      return
    }

    setTo(defaultTo)
    setSubject(defaultSubject)
    setBody(defaultBody)
    applyEmptyCcBcc()
    applyDefaultAttachments()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- companyId, contactId, dealId and defaultAttachments are intentionally excluded: they are seeded once on open via setLinkContactId/setLinkDealId/setLinkCompanyId and applyDefaultAttachments; including them would reset the composer on every prop change mid-session
  }, [
    defaultAttachmentsKey,
    defaultBcc,
    defaultBody,
    defaultCc,
    defaultReplyTo,
    defaultSubject,
    defaultTo,
    draftId,
    draftKey,
    isOpen,
    embeddedSequenceStep,
  ])

  useEffect(() => {
    if (!isOpen || !embeddedSequenceStep) return
    setLinkContactId(contactId)
    setLinkDealId(dealId)
    setLinkCompanyId(companyId)
    setActiveDraftId(draftId)
    setShowTemplates(false)
    setTo('')
    setReplyTo('')
    setShowReplyTo(false)
    setAttachments([])
    setSubject(defaultSubject)
    setBody(defaultBody)

    const ex = sequenceStepEmailExtras
    const ccVal = (ex?.cc ?? defaultCc).trim()
    const bccVal = (ex?.bcc ?? defaultBcc).trim()
    setCc(ccVal)
    setBcc(bccVal)
    setShowCc(ccVal.length > 0)
    setShowBcc(bccVal.length > 0)
    setSenderName(ex?.emailSenderName ?? currentIdentity?.senderName ?? '')
    const prefInclude = resolveComposerIncludeSignature(currentIdentity)
    if (ex?.useEmailSignature === true || ex?.useEmailSignature === false) {
      setUseSignature(ex.useEmailSignature)
    } else if (ex?.emailSignatureHtml?.trim()) {
      setUseSignature(true)
    } else {
      setUseSignature(prefInclude)
    }

    const stepSig = ex?.emailSignatureHtml?.trim()
    if (stepSig) {
      setSignature(stepSig)
      const match = savedSignatures.find((s) => s.html === stepSig)
      setActiveSignatureId(match?.id ?? defaultSignatureId ?? '')
    } else {
      const nextDefault = defaultSignatureId ?? savedSignatures[0]?.id ?? ''
      const nextHtml = savedSignatures.find((s) => s.id === nextDefault)?.html
      setActiveSignatureId(nextDefault)
      setSignature(nextHtml ?? currentIdentity?.signature ?? '')
    }
    /* Reload when switching nodes or when default signature id hydrates (read latest extras + identity from closure). */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sequenceEmbedResetKey,
    embeddedSequenceStep,
    isOpen,
    defaultSubject,
    defaultBody,
    defaultSignatureId,
    defaultCc,
    defaultBcc,
    currentIdentity?.composerSignatureDefault,
    currentIdentity?.useSignature,
  ])

  useEffect(() => {
    if (!isOpen) return
    if (embeddedSequenceStep) return
    const payload = JSON.stringify({ to, cc, bcc, replyTo, subject, body, attachments })
    localStorage.setItem(draftKey, payload)
  }, [attachments, bcc, body, cc, draftKey, embeddedSequenceStep, isOpen, replyTo, subject, to])

  useEffect(() => {
    if (!isOpen) return
    fetchQuickReplies().catch(() => {
      // keep fallback quick replies in local store
    })
  }, [fetchQuickReplies, isOpen])

  useEffect(() => {
    if (!embeddedSequenceStep || !isOpen || !onSequenceStepDraftChange) return
    const id = window.setTimeout(() => {
      onSequenceStepDraftChange({
        subject,
        body,
        useEmailSignature: useSignature,
        emailSignatureHtml: signature,
        emailSenderName: senderName,
        cc: cc.trim(),
        bcc: bcc.trim(),
      })
    }, 400)
    return () => window.clearTimeout(id)
  }, [
    body,
    embeddedSequenceStep,
    isOpen,
    onSequenceStepDraftChange,
    senderName,
    signature,
    subject,
    useSignature,
    cc,
    bcc,
  ])

  useEffect(() => {
    if (!isOpen) return
    formatUndoPast.current = []
    formatUndoFuture.current = []
    setUndoDepth(0)
    setRedoDepth(0)
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen) return
    if (embeddedSequenceStep) return
    const id = emailIdentityForUser
    if (!id) {
      setSenderName('')
      setSignature('')
      setActiveSignatureId('')
      setUseSignature(resolveComposerIncludeSignature(undefined))
      return
    }
    const sigs = id.signatures ?? []
    const nextDefault = id.defaultSignatureId ?? sigs[0]?.id ?? ''
    const nextSignature = sigs.find((s) => s.id === nextDefault)?.html
    setSenderName(id.senderName ?? '')
    setActiveSignatureId(nextDefault)
    setSignature(nextSignature ?? id.signature ?? '')
    setUseSignature(resolveComposerIncludeSignature(id))
  }, [isOpen, embeddedSequenceStep, emailIdentityForUser])

  const normalizeEmail = (value: string) => value.trim().toLowerCase()
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  const parseEmailList = (value: string) =>
    value
      .split(',')
      .map((e) => normalizeEmail(e))
      .filter(Boolean)

  const insertAtCursor = useCallback((text: string) => {
    const el = bodyRef.current
    if (!el) {
      setBody((prev) => prev + text)
      return
    }
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    formatUndoPast.current.push(body)
    while (formatUndoPast.current.length > 40) formatUndoPast.current.shift()
    formatUndoFuture.current = []
    setUndoDepth(formatUndoPast.current.length)
    setRedoDepth(0)
    const next = body.slice(0, start) + text + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      const node = bodyRef.current
      if (!node) return
      node.focus()
      const pos = start + text.length
      node.setSelectionRange(pos, pos)
    })
  }, [body])

  const runBodyEdit = useCallback(
    (compute: (b: string, start: number, end: number) => BodyEditResult) => {
      const el = bodyRef.current
      if (!el) return
      const start = el.selectionStart ?? 0
      const end = el.selectionEnd ?? 0
      formatUndoPast.current.push(body)
      while (formatUndoPast.current.length > 40) formatUndoPast.current.shift()
      formatUndoFuture.current = []
      const edit = compute(body, start, end)
      setUndoDepth(formatUndoPast.current.length)
      setRedoDepth(0)
      applyEditToTextarea(el, edit, setBody)
    },
    [body],
  )

  const runLineBodyEdit = useCallback(
    (compute: (b: string, lineStart: number, lineEnd: number) => BodyEditResult) => {
      const el = bodyRef.current
      if (!el) return
      const cs = el.selectionStart ?? 0
      const ce = el.selectionEnd ?? 0
      const [ls, le] = expandSelectionToLineRange(body, cs, ce)
      formatUndoPast.current.push(body)
      while (formatUndoPast.current.length > 40) formatUndoPast.current.shift()
      formatUndoFuture.current = []
      const edit = compute(body, ls, le)
      setUndoDepth(formatUndoPast.current.length)
      setRedoDepth(0)
      applyEditToTextarea(el, edit, setBody)
    },
    [body],
  )

  const handleFormatUndo = useCallback(() => {
    setBody((prev) => {
      const snap = formatUndoPast.current.pop()
      if (snap === undefined) return prev
      formatUndoFuture.current.push(prev)
      queueMicrotask(() => {
        setUndoDepth(formatUndoPast.current.length)
        setRedoDepth(formatUndoFuture.current.length)
      })
      return snap
    })
  }, [])

  const handleFormatRedo = useCallback(() => {
    setBody((prev) => {
      const snap = formatUndoFuture.current.pop()
      if (snap === undefined) return prev
      formatUndoPast.current.push(prev)
      queueMicrotask(() => {
        setUndoDepth(formatUndoPast.current.length)
        setRedoDepth(formatUndoFuture.current.length)
      })
      return snap
    })
  }, [])

  const applyBodyBold = useCallback(() => {
    runBodyEdit((b, s, e) => wrapSelectionMarkers(b, s, e, '**', '**', ''))
  }, [runBodyEdit])

  const applyBodyItalic = useCallback(() => {
    runBodyEdit((b, s, e) => wrapSelectionMarkers(b, s, e, '*', '*', 'text'))
  }, [runBodyEdit])

  const applyBodyUnderline = useCallback(() => {
    runBodyEdit((b, s, e) => wrapSelectionMarkers(b, s, e, '++', '++', 'text'))
  }, [runBodyEdit])

  const applyBodyStrike = useCallback(() => {
    runBodyEdit((b, s, e) => wrapSelectionMarkers(b, s, e, '~~', '~~', 'text'))
  }, [runBodyEdit])

  const applyBodyBullet = useCallback(() => {
    runBodyEdit((b, s, e) => prefixLinesInSelection(b, s, e, '- ', /^-\s+/))
  }, [runBodyEdit])

  const applyBodyNumbered = useCallback(() => {
    runBodyEdit(numberLinesInSelection)
  }, [runBodyEdit])

  const applyBodyQuote = useCallback(() => {
    runBodyEdit((b, s, e) => prefixLinesInSelection(b, s, e, '> ', /^>/))
  }, [runBodyEdit])

  const applyBodyIndent = useCallback(() => {
    runLineBodyEdit((b, ls, le) => indentSelection(b, ls, le))
  }, [runLineBodyEdit])

  const applyBodyOutdent = useCallback(() => {
    runLineBodyEdit((b, ls, le) => outdentSelection(b, ls, le))
  }, [runLineBodyEdit])

  const applyBodyClearFormat = useCallback(() => {
    runBodyEdit(clearFormattingInSelection)
  }, [runBodyEdit])

  const applyInsertLink = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const sel = body.slice(start, end)
    const rawUrl = window.prompt(t.email.promptLinkUrl, 'https://')
    if (!rawUrl?.trim()) return
    let url = rawUrl.trim()
    if (!/^https?:\/\/|mailto:/i.test(url)) {
      url = `https://${url.replace(/^\/+/, '')}`
    }
    let label = sel.trim()
    if (!label) {
      const extra = window.prompt(t.email.promptLinkText, 'Link')
      if (extra === null) return
      label = extra.trim() || 'Link'
    }
    const md = `[${label}](${url})`
    formatUndoPast.current.push(body)
    while (formatUndoPast.current.length > 40) formatUndoPast.current.shift()
    formatUndoFuture.current = []
    const next = body.slice(0, start) + md + body.slice(end)
    setBody(next)
    setUndoDepth(formatUndoPast.current.length)
    setRedoDepth(0)
    const pos = start + md.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }, [body, t])

  const applyInsertImage = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const sel = body.slice(start, end)
    const rawUrl = window.prompt(t.email.promptImageUrl, 'https://')
    if (!rawUrl?.trim()) return
    let url = rawUrl.trim()
    if (!/^https?:\/\//i.test(url)) url = `https://${url.replace(/^\/+/, '')}`
    let alt = sel.trim()
    if (!alt) {
      const extra = window.prompt(t.email.promptImageAlt, '')
      if (extra === null) return
      alt = extra.trim()
    }
    const md = `![${alt}](${url})`
    formatUndoPast.current.push(body)
    while (formatUndoPast.current.length > 40) formatUndoPast.current.shift()
    formatUndoFuture.current = []
    const next = body.slice(0, start) + md + body.slice(end)
    setBody(next)
    setUndoDepth(formatUndoPast.current.length)
    setRedoDepth(0)
    const pos = start + md.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }, [body, t])

  const handleSend = useCallback(async () => {
    if (!to.trim() || !subject.trim()) {
      toast.error(`${t.common.email} & ${t.activities.subject}`)
      return
    }
    const providerName = resolveEmailProviderName()
    if (providerName === 'gmail' && !useEmailStore.getState().isGmailConnected()) {
      toast.error(t.email.connectGmailToSend)
      return
    }
    const toList = parseEmailList(to)
    const ccList = parseEmailList(cc)
    const bccList = parseEmailList(bcc)
    const replyToValue = normalizeEmail(replyTo)

    const allRecipients = [...toList, ...ccList, ...bccList]
    if (allRecipients.some((email) => !isValidEmail(email))) {
      toast.error(t.errors.invalidRecipientEmail)
      return
    }
    if (replyToValue && !isValidEmail(replyToValue)) {
      toast.error(t.errors.invalidReplyToEmail)
      return
    }

    setSending(true)
    try {
      const contact = activityContext.contactId
        ? useContactsStore.getState().contacts.find((c) => c.id === activityContext.contactId)
        : undefined
      const deal = activityContext.dealId
        ? useDealsStore.getState().deals.find((d) => d.id === activityContext.dealId)
        : undefined
      const company = activityContext.companyId
        ? useCompaniesStore.getState().companies.find((c) => c.id === activityContext.companyId)
        : contact?.companyId
          ? useCompaniesStore.getState().companies.find((c) => c.id === contact.companyId)
          : undefined
      const mergeVars = buildEmailMergeVariableMap({ contact, company, deal })
      const mergedSubject = applyEmailMergeTokens(subject, mergeVars)
      const mergedBody = applyEmailMergeTokens(body, mergeVars)
      const mergedSignature = applyEmailMergeTokens(signature, mergeVars)

      const signatureText = mergedSignature.replace(/<[^>]+>/g, '').trim()
      const signatureBlock = useSignature && signatureText ? `\n\n--\n${signatureText}` : ''
      const finalBody = `${mergedBody}${signatureBlock}`
      const htmlMain = formatPlainToHtml(mergedBody)
      const signatureHtmlBlock = useSignature && mergedSignature.trim() ? `<br/><br/>${mergedSignature.trim()}` : ''
      const payload = {
        to: toList,
        cc: ccList.length ? ccList : undefined,
        bcc: bccList.length ? bccList : undefined,
        replyTo: replyToValue || undefined,
        attachments,
        subject: mergedSubject,
        body: finalBody,
        htmlBody: `${htmlMain}${signatureHtmlBlock}`,
        contactId: activityContext.contactId,
        dealId: activityContext.dealId,
        companyId: activityContext.companyId,
        senderName: senderName.trim() || undefined,
        trackingEnabled,
      }

      const sent = sendLater && scheduledAt
        ? scheduleEmail({ ...payload, runAt: new Date(scheduledAt).toISOString() })
        : scheduleEmail({
            ...payload,
            runAt: new Date(Date.now() + 10_000).toISOString(),
            undoableUntil: new Date(Date.now() + 10_000).toISOString(),
          })
      localStorage.removeItem(draftKey)
      if (trackingEnabled) enableTracking(sent.id)
      useActivitiesStore.getState().addActivity({
        type: 'email',
        subject: mergedSubject,
        description: sendLater && scheduledAt
          ? `Email scheduled to ${toList.join(', ')} (${scheduledAt}): ${mergedSubject}`
          : `Email sent to ${toList.join(', ')}: ${mergedSubject}`,
        status: 'completed',
        contactId: activityContext.contactId,
        dealId: activityContext.dealId,
        createdBy: '',
      })
      if (!sendLater) {
        toast.info(t.email.undoSendHint)
      } else {
        toast.success(sendLater && scheduledAt ? t.email.emailScheduled : `${t.common.email} ✓`)
      }
      if (currentUser?.id) {
        updateEmailIdentity(currentUser.id, {
          senderName: senderName.trim() || undefined,
          signature: signature.trim() || undefined,
          defaultSignatureId: activeSignatureId || undefined,
        })
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.noResults)
    } finally {
      setSending(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- parseEmailList is a plain inline function recreated each render; adding it would cause useCallback to invalidate on every render defeating its purpose
  }, [
    activeSignatureId,
    activityContext.contactId,
    activityContext.dealId,
    activityContext.companyId,
    attachments,
    bcc,
    body,
    cc,
    currentUser?.id,
    draftKey,
    onClose,
    replyTo,
    scheduleEmail,
    scheduledAt,
    sendLater,
    senderName,
    signature,
    subject,
    t,
    to,
    trackingEnabled,
    updateEmailIdentity,
    useSignature,
    enableTracking,
  ])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        if (!sending) {
          void handleSend()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, sending, handleSend])

  const mergeFieldOptions = useMemo(() => getEmailMergeFieldOptions(t), [t])

  const handleAttachmentFiles = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      const next = await Promise.all(
        files.map(async (file) => {
          const dataBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const result = String(reader.result ?? '')
              const b64 = result.split(',')[1] ?? ''
              resolve(b64)
            }
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
          })
          return {
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            dataBase64,
          }
        }),
      )
      setAttachments((prev) => [...prev, ...next])
      e.currentTarget.value = ''
    },
    [],
  )

  const crmContactOptions = useMemo(
    () => [
      { value: '', label: '-' },
      ...contacts.map((c) => ({
        value: c.id,
        label: [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.email || c.id,
      })),
    ],
    [contacts],
  )
  const crmDealOptions = useMemo(
    () => [
      { value: '', label: '-' },
      ...deals.map((d) => ({ value: d.id, label: d.title })),
    ],
    [deals],
  )
  const crmCompanyOptions = useMemo(
    () => [
      { value: '', label: '-' },
      ...companies.map((c) => ({ value: c.id, label: c.name })),
    ],
    [companies],
  )

  if (!isOpen) return null

  const contact = activityContext.contactId
    ? contacts.find((c) => c.id === activityContext.contactId)
    : undefined
  const deal = activityContext.dealId
    ? deals.find((d) => d.id === activityContext.dealId)
    : undefined
  const company = activityContext.companyId
    ? companies.find((c) => c.id === activityContext.companyId)
    : contact?.companyId
      ? companies.find((c) => c.id === contact.companyId)
      : undefined

  const hasUnsavedDraft = !!(to.trim() || cc.trim() || bcc.trim() || replyTo.trim() || subject.trim() || body.trim())
  const requestClose = () => {
    if (!hasUnsavedDraft || window.confirm(t.email.discardDraftConfirm)) {
      onClose()
    }
  }

  const applyTemplate = (template: typeof templates[0]) => {
    let subj = template.subject
    let bod = template.body
    const vars = buildEmailMergeVariableMap({ contact, company, deal })
    subj = applyEmailMergeTokens(subj, vars)
    bod = applyEmailMergeTokens(bod, vars)
    setSubject(subj)
    setBody(bod)
    incrementUsage(template.id)
    setShowTemplates(false)
    toast.success(`${t.emailTemplates.title} - "${template.name}"`)
  }

  const CATEGORY_LABELS: Record<string, string> = {
    intro: t.emailTemplates.categoryLabels.intro,
    follow_up: t.emailTemplates.categoryLabels.follow_up,
    proposal: t.emailTemplates.categoryLabels.proposal,
    closing: t.emailTemplates.categoryLabels.closing,
    nurture: t.emailTemplates.categoryLabels.nurture,
    custom: t.emailTemplates.categoryLabels.custom,
  }

  const subjectPresets = [
    contact
      ? t.email.subjectPresetFollowUp
        .replace('{firstName}', contact.firstName)
        .replace('{lastName}', contact.lastName)
      : '',
    company ? t.email.subjectPresetNextSteps.replace('{companyName}', company.name) : '',
    deal ? t.email.subjectPresetProposal.replace('{dealTitle}', deal.title) : '',
  ].filter(Boolean)

  const connected = isGmailConnected()
  const providerName = resolveEmailProviderName()
  const gmailRequiredDisconnected = providerName === 'gmail' && !connected

  const sendDisabled =
    sending ||
    !to.trim() ||
    !subject.trim() ||
    (sendLater && !scheduledAt) ||
    gmailRequiredDisconnected

  const sendDisabledHint = gmailRequiredDisconnected
    ? t.email.connectGmailToSend
    : !to.trim() || !subject.trim()
      ? t.email.sendDisabledHint
      : sendLater && !scheduledAt
        ? t.email.scheduleSendDisabledHint
        : null

  const isInline = presentation === 'inline'

  const composerSurface = (
    <div
      role={isInline ? 'region' : 'dialog'}
      {...(isInline ? {} : { 'aria-modal': true as const })}
      aria-labelledby="email-composer-title"
      className={
        isInline
          ? 'relative z-10 w-full h-full min-h-0 glass rounded-2xl shadow-md border border-fg/10 overflow-hidden flex flex-col'
          : 'relative z-10 w-full max-w-6xl max-h-[min(92vh,920px)] mx-0 sm:mx-4 mb-0 sm:mb-0 glass rounded-t-2xl sm:rounded-2xl shadow-float border-fg/10 overflow-hidden animate-slide-up flex flex-col min-h-0'
      }
    >
      <ComposerHeader
        embeddedSequenceStep={embeddedSequenceStep}
        isInline={isInline}
        connected={connected}
        gmailAddress={gmailAddress}
        to={to}
        setTo={setTo}
        cc={cc}
        setCc={setCc}
        bcc={bcc}
        setBcc={setBcc}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        subject={subject}
        setSubject={setSubject}
        showCc={showCc}
        setShowCc={setShowCc}
        showBcc={showBcc}
        setShowBcc={setShowBcc}
        showReplyTo={showReplyTo}
        setShowReplyTo={setShowReplyTo}
        subjectPresets={subjectPresets}
        onRequestClose={requestClose}
        onRequestGmailConnect={onRequestGmailConnect}
        gmailRequiredDisconnected={gmailRequiredDisconnected}
      />

      {/* Template picker */}
      {showTemplates && (
        <div className="border-b border-fg/8 max-h-56 overflow-y-auto flex-shrink-0">
          <div className="px-4 py-2 border-b border-fg/6 sticky top-0 bg-surface-1">
            <p className="text-xs font-medium text-warning">{t.emailTemplates.title}</p>
          </div>
          {templates.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-fg-subtle">
              {t.common.noResults}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {templates.map((tpl) => (
                <button type="button"
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl)}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-fg/6 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-fg font-medium group-hover:text-accent-400 transition-colors">{tpl.name}</span>
                    <span className="text-2xs px-2 py-0.5 rounded-full bg-fg/6 text-fg-subtle">{CATEGORY_LABELS[tpl.category]}</span>
                  </div>
                  <p className="text-xs text-fg-subtle mt-0.5 truncate">{tpl.subject}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        className={
          isInline
            ? 'flex flex-1 min-h-0 flex-col overflow-hidden'
            : 'flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden'
        }
      >
        {/* Main column */}
        <div
          className={
            isInline
              ? embeddedSequenceStep
                ? 'flex flex-col flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-2.5'
                : 'flex flex-col flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain p-4 space-y-2.5'
              : 'flex flex-1 flex-col min-h-0 min-w-0 overflow-y-auto overscroll-contain p-5 space-y-3'
          }
        >
          <ComposerBody
            body={body}
            setBody={setBody}
            bodyRef={bodyRef}
            embeddedSequenceStep={embeddedSequenceStep}
            isInline={isInline}
            senderName={senderName}
            setSenderName={setSenderName}
            useSignature={useSignature}
            setUseSignature={setUseSignature}
            signature={signature}
            setSignature={setSignature}
            activeSignatureId={activeSignatureId}
            setActiveSignatureId={setActiveSignatureId}
            showSignatureSection={showSignatureSection}
            savedSignatures={savedSignatures}
            quickReplies={quickReplies}
            toolbarProps={{
              undoDepth,
              redoDepth,
              showTemplates,
              mergeFieldOptions,
              onUndo: handleFormatUndo,
              onRedo: handleFormatRedo,
              onBold: applyBodyBold,
              onItalic: applyBodyItalic,
              onUnderline: applyBodyUnderline,
              onStrike: applyBodyStrike,
              onBullet: applyBodyBullet,
              onNumbered: applyBodyNumbered,
              onQuote: applyBodyQuote,
              onOutdent: applyBodyOutdent,
              onIndent: applyBodyIndent,
              onInsertLink: applyInsertLink,
              onInsertImage: applyInsertImage,
              onClearFormat: applyBodyClearFormat,
              onToggleTemplates: () => setShowTemplates((v) => !v),
              onInsertMergeField: insertAtCursor,
            }}
          />

          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleAttachmentFiles} />

          {!embeddedSequenceStep && (
            <ComposerAttachments
              attachments={attachments}
              setAttachments={setAttachments}
              fileInputRef={fileInputRef}
            />
          )}
        </div>

        {/* CRM link - modal: fixed sidebar; inline: collapsible so the compose area stays calm */}
        {embeddedSequenceStep ? null : isInline ? (
          <details className="group shrink-0 border-t border-fg/8 bg-surface-1/40">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-medium text-fg-muted hover:text-fg hover:bg-fg/5 [&::-webkit-details-marker]:hidden">
              <span>{t.email.crmLinkTitle}</span>
              <ChevronDown size={14} className="text-fg-subtle shrink-0 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="px-3 pb-3 space-y-2.5 border-t border-fg/6" aria-label={t.email.crmLinkTitle}>
              <p className="text-2xs text-fg-subtle leading-snug pt-2">{t.email.crmLinkHint}</p>
              <div className="space-y-2">
                <span className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">{t.nav.contacts}</span>
                <Select
                  ariaLabel={t.nav.contacts}
                  value={linkContactId ?? ''}
                  onChange={(e) => setLinkContactId(e.target.value || undefined)}
                  options={crmContactOptions}
                  listMaxHeightClass="max-h-40"
                />
              </div>
              <div className="space-y-2">
                <span className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">{t.nav.deals}</span>
                <Select
                  ariaLabel={t.nav.deals}
                  value={linkDealId ?? ''}
                  onChange={(e) => setLinkDealId(e.target.value || undefined)}
                  options={crmDealOptions}
                  listMaxHeightClass="max-h-40"
                />
              </div>
              <div className="space-y-2">
                <span className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">{t.nav.companies}</span>
                <Select
                  ariaLabel={t.nav.companies}
                  value={linkCompanyId ?? ''}
                  onChange={(e) => setLinkCompanyId(e.target.value || undefined)}
                  options={crmCompanyOptions}
                  listMaxHeightClass="max-h-40"
                />
              </div>
            </div>
          </details>
        ) : (
          <aside
            className="lg:w-[288px] shrink-0 border-t lg:border-t-0 lg:border-l border-fg/8 bg-surface-1/35 p-4 space-y-4 overflow-y-auto max-h-[min(40vh,320px)] lg:max-h-none"
            aria-label={t.email.crmLinkTitle}
          >
            <div>
              <p className="text-xs font-semibold text-fg">{t.email.crmLinkTitle}</p>
              <p className="text-xs text-fg-subtle mt-1 leading-snug">{t.email.crmLinkHint}</p>
            </div>
            <div className="space-y-2">
              <span className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">{t.nav.contacts}</span>
              <Select
                ariaLabel={t.nav.contacts}
                value={linkContactId ?? ''}
                onChange={(e) => setLinkContactId(e.target.value || undefined)}
                options={crmContactOptions}
                listMaxHeightClass="max-h-40"
              />
            </div>
            <div className="space-y-2">
              <span className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">{t.nav.deals}</span>
              <Select
                ariaLabel={t.nav.deals}
                value={linkDealId ?? ''}
                onChange={(e) => setLinkDealId(e.target.value || undefined)}
                options={crmDealOptions}
                listMaxHeightClass="max-h-40"
              />
            </div>
            <div className="space-y-2">
              <span className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">{t.nav.companies}</span>
              <Select
                ariaLabel={t.nav.companies}
                value={linkCompanyId ?? ''}
                onChange={(e) => setLinkCompanyId(e.target.value || undefined)}
                options={crmCompanyOptions}
                listMaxHeightClass="max-h-40"
              />
            </div>
          </aside>
        )}
      </div>

      {!embeddedSequenceStep && (
        <ComposerFooter
          sending={sending}
          sendDisabled={sendDisabled}
          sendDisabledHint={sendDisabledHint}
          sendHintId={sendHintId}
          showSignatureSection={showSignatureSection}
          setShowSignatureSection={setShowSignatureSection}
          trackingEnabled={trackingEnabled}
          setTrackingEnabled={setTrackingEnabled}
          sendLater={sendLater}
          setSendLater={setSendLater}
          scheduledAt={scheduledAt}
          setScheduledAt={setScheduledAt}
          fileInputRef={fileInputRef}
          onSend={() => { void handleSend() }}
          onDiscard={requestClose}
          onSaveDraft={() => {
            const toList = to.split(',').map((s) => s.trim()).filter(Boolean)
            const created = useEmailStore.getState().saveDraft({
              draftId: activeDraftId,
              to: toList,
              cc: cc.split(',').map((s) => s.trim()).filter(Boolean),
              bcc: bcc.split(',').map((s) => s.trim()).filter(Boolean),
              replyTo: replyTo.trim() || undefined,
              subject,
              body,
              contactId: activityContext.contactId,
              dealId: activityContext.dealId,
              companyId: activityContext.companyId,
            })
            setActiveDraftId(created.id)
            toast.success(t.email.draftSaved)
            onClose()
          }}
        />
      )}
    </div>
  )

  if (isInline) {
    return composerSurface
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-surface-0/70 backdrop-blur-md"
        onClick={requestClose}
        aria-hidden
      />
      {composerSurface}
    </div>,
    document.body,
  )
}
