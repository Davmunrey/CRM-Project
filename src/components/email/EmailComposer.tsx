import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Send,
  ChevronDown,
  FileText,
  Eye,
  Loader2,
  ArrowLeft,
  Paperclip,
  PenLine,
  Calendar,
  Bold,
  Italic,
  List,
} from 'lucide-react'
import { useEmailStore } from '../../store/emailStore'
import { useActivitiesStore } from '../../store/activitiesStore'
import { useContactsStore } from '../../store/contactsStore'
import { useDealsStore } from '../../store/dealsStore'
import { useCompaniesStore } from '../../store/companiesStore'
import { useTemplateStore } from '../../store/templateStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency } from '../../utils/formatters'
import { toast } from '../../store/toastStore'
import { useTranslations } from '../../i18n'
import { Select } from '../ui/Select'
import { resolveSendContextFromTo } from '../../features/inbox'
import { resolveEmailProviderName } from '../../services/emailProviders'

function escapeHtmlForBody(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

/** Lightweight body → HTML: `**bold**`, `*italic*`, newlines → `<br/>`. */
function formatPlainToHtml(plain: string): string {
  return plain
    .split('\n')
    .map((line) => {
      let s = escapeHtmlForBody(line)
      s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      s = s.replace(/\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>')
      return s
    })
    .join('<br/>')
}

interface EmailComposerProps {
  isOpen: boolean
  onClose: () => void
  defaultTo?: string
  defaultSubject?: string
  defaultBody?: string
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
}

export function EmailComposer({
  isOpen,
  onClose,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  defaultAttachments = [],
  contactId,
  dealId,
  companyId,
  draftId,
  onRequestGmailConnect,
}: EmailComposerProps) {
  const t = useTranslations()
  const sendHintId = useId()
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
  const [draftCreatedForOpen, setDraftCreatedForOpen] = useState(false)
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
  const currentIdentity = currentUser?.id ? settings.emailIdentities?.[currentUser.id] : undefined
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

  useEffect(() => {
    if (!isOpen) return
    setLinkContactId(contactId)
    setLinkDealId(dealId)
    setLinkCompanyId(companyId)
    setActiveDraftId(draftId)
    setDraftCreatedForOpen(false)
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
      applyEmptyCcBcc()
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
  }, [defaultAttachments, defaultBody, defaultSubject, defaultTo, draftId, draftKey, isOpen])

  useEffect(() => {
    if (!isOpen || draftCreatedForOpen) return
    const created = useEmailStore.getState().saveDraft({
      draftId: activeDraftId,
      to: to.split(',').map((s) => s.trim()).filter(Boolean),
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
    setDraftCreatedForOpen(true)
  }, [
    activeDraftId,
    activityContext.companyId,
    activityContext.contactId,
    activityContext.dealId,
    bcc,
    body,
    cc,
    draftCreatedForOpen,
    isOpen,
    replyTo,
    subject,
    to,
  ])

  useEffect(() => {
    if (!isOpen) return
    const payload = JSON.stringify({ to, cc, bcc, replyTo, subject, body, attachments })
    localStorage.setItem(draftKey, payload)
  }, [attachments, bcc, body, cc, draftKey, isOpen, replyTo, subject, to])

  useEffect(() => {
    if (!isOpen) return
    fetchQuickReplies().catch(() => {
      // keep fallback quick replies in local store
    })
  }, [fetchQuickReplies, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const nextDefault = currentIdentity?.defaultSignatureId ?? currentIdentity?.signatures?.[0]?.id ?? ''
    const nextSignature = currentIdentity?.signatures?.find((s) => s.id === nextDefault)?.html
    setSenderName(currentIdentity?.senderName ?? '')
    setActiveSignatureId(nextDefault)
    setSignature(nextSignature ?? currentIdentity?.signature ?? '')
    setUseSignature(currentIdentity?.useSignature ?? true)
  }, [currentIdentity?.senderName, currentIdentity?.signature, currentIdentity?.useSignature, isOpen])

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
    setBody((prev) => prev.slice(0, start) + text + prev.slice(end))
    requestAnimationFrame(() => {
      const node = bodyRef.current
      if (!node) return
      node.focus()
      const pos = start + text.length
      node.setSelectionRange(pos, pos)
    })
  }, [])

  const applyBodyBold = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const sel = body.slice(start, end)
    const wrapped = sel ? `**${sel}**` : '****'
    const next = body.slice(0, start) + wrapped + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      const node = bodyRef.current
      if (!node) return
      node.focus()
      if (sel) {
        const pos = start + wrapped.length
        node.setSelectionRange(pos, pos)
      } else {
        node.setSelectionRange(start + 2, start + 2)
      }
    })
  }, [body])

  const applyBodyItalic = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const sel = body.slice(start, end)
    const wrapped = sel ? `*${sel}*` : '*text*'
    const next = body.slice(0, start) + wrapped + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      const node = bodyRef.current
      if (!node) return
      node.focus()
      if (sel) {
        const pos = start + wrapped.length
        node.setSelectionRange(pos, pos)
      } else {
        node.setSelectionRange(start + 1, start + 5)
      }
    })
  }, [body])

  const applyBodyBullet = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const chunk = body.slice(start, end)
    if (chunk) {
      const lines = chunk.split('\n').map((l) => (l.startsWith('- ') ? l : `- ${l}`))
      const rep = lines.join('\n')
      const next = body.slice(0, start) + rep + body.slice(end)
      setBody(next)
      requestAnimationFrame(() => {
        const node = bodyRef.current
        if (!node) return
        node.focus()
        const pos = start + rep.length
        node.setSelectionRange(pos, pos)
      })
    } else {
      insertAtCursor('- ')
    }
  }, [body, insertAtCursor])

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
      const signatureText = signature.replace(/<[^>]+>/g, '').trim()
      const signatureBlock = useSignature && signatureText ? `\n\n--\n${signatureText}` : ''
      const finalBody = `${body}${signatureBlock}`
      const htmlMain = formatPlainToHtml(body)
      const signatureHtmlBlock = useSignature && signature.trim() ? `<br/><br/>${signature.trim()}` : ''
      const payload = {
        to: toList,
        cc: ccList.length ? ccList : undefined,
        bcc: bccList.length ? bccList : undefined,
        replyTo: replyToValue || undefined,
        attachments,
        subject,
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
        subject,
        description: sendLater && scheduledAt
          ? `Email scheduled to ${toList.join(', ')} (${scheduledAt}): ${subject}`
          : `Email sent to ${toList.join(', ')}: ${subject}`,
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
          useSignature,
          defaultSignatureId: activeSignatureId || undefined,
        })
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.noResults)
    } finally {
      setSending(false)
    }
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

  const mergeFieldOptions = useMemo(
    () => [
      { token: '{{firstName}}', label: `${t.contacts.firstName} · {{firstName}}` },
      { token: '{{lastName}}', label: `${t.contacts.lastName} · {{lastName}}` },
      { token: '{{company}}', label: `${t.contacts.company} · {{company}}` },
      { token: '{{dealTitle}}', label: `${t.nav.deals} · {{dealTitle}}` },
      { token: '{{dealValue}}', label: `${t.common.value} · {{dealValue}}` },
      { token: '{{email}}', label: `${t.common.email} · {{email}}` },
      { token: '{{jobTitle}}', label: `${t.contacts.jobTitle} · {{jobTitle}}` },
    ],
    [t],
  )

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
      { value: '', label: '—' },
      ...contacts.map((c) => ({
        value: c.id,
        label: [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.email || c.id,
      })),
    ],
    [contacts],
  )
  const crmDealOptions = useMemo(
    () => [
      { value: '', label: '—' },
      ...deals.map((d) => ({ value: d.id, label: d.title })),
    ],
    [deals],
  )
  const crmCompanyOptions = useMemo(
    () => [
      { value: '', label: '—' },
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
    const vars: Record<string, string> = {
      '{{firstName}}': contact?.firstName ?? '',
      '{{lastName}}': contact?.lastName ?? '',
      '{{company}}': company?.name ?? '',
      '{{dealTitle}}': deal?.title ?? '',
      '{{dealValue}}': deal ? formatCurrency(deal.value, deal.currency) : '',
      '{{email}}': contact?.email ?? '',
      '{{jobTitle}}': contact?.jobTitle ?? '',
    }
    for (const [key, value] of Object.entries(vars)) {
      subj = subj.replaceAll(key, value)
      bod = bod.replaceAll(key, value)
    }
    setSubject(subj)
    setBody(bod)
    incrementUsage(template.id)
    setShowTemplates(false)
    toast.success(`${t.emailTemplates.title} — "${template.name}"`)
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

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-surface-0/70 backdrop-blur-md"
        onClick={requestClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-composer-title"
        className="relative w-full max-w-6xl max-h-[min(92vh,920px)] mx-0 sm:mx-4 mb-0 sm:mb-0 glass rounded-t-2xl sm:rounded-2xl shadow-float border-fg/10 overflow-hidden animate-slide-up flex flex-col min-h-0"
      >
        {/* Header — product-style back + title + status */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-fg/8 flex-shrink-0 bg-surface-1/60">
          <button
            type="button"
            onClick={requestClose}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-fg-muted hover:text-fg hover:bg-fg/8 transition-colors shrink-0"
          >
            <ArrowLeft size={16} className="shrink-0" aria-hidden />
            <span>{t.common.back}</span>
          </button>
          <h2 id="email-composer-title" className="text-sm font-semibold text-fg truncate flex-1 min-w-0 sm:text-center">
            {t.inbox.compose}
          </h2>
          {connected
            ? <span className="text-2xs px-2 py-0.5 rounded-full bg-success/15 text-success shrink-0">Gmail</span>
            : <span className="text-2xs px-2 py-0.5 rounded-full bg-fg/8 text-fg-subtle shrink-0">{t.settings.disconnected}</span>}
          <button
            type="button"
            onClick={requestClose}
            title={t.email.closeComposer}
            aria-label={t.email.closeComposer}
            className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-fg/8 transition-colors shrink-0"
          >
            <span className="sr-only">{t.email.closeComposer}</span>
            <X size={18} />
          </button>
        </div>

        {gmailRequiredDisconnected && (
          <div className="px-4 py-2.5 border-b border-fg/8 bg-warning/10 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-fg-muted">{t.email.connectGmailToSend}</p>
            {onRequestGmailConnect && (
              <button
                type="button"
                onClick={onRequestGmailConnect}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-accent-500/20 text-accent-300 border border-accent-500/35 hover:bg-accent-500/30 transition-colors"
              >
                {t.settings.connect} Gmail
              </button>
            )}
          </div>
        )}

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

        <div className="flex flex-1 flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Main column */}
          <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-y-auto p-5 space-y-3">
          <div className="flex items-center gap-3 border-b border-fg/8 pb-3">
            <span className="text-xs text-fg-subtle w-14 shrink-0">{t.email.composerFrom}</span>
            <span className="text-sm text-fg truncate" title={gmailAddress ?? undefined}>
              {gmailAddress ?? t.common.notAvailable}
            </span>
          </div>

          <div className="flex items-center gap-3 border-b border-fg/6 pb-3">
            <span className="text-xs text-fg-subtle w-14 flex-shrink-0">{t.common.to}</span>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder={t.common.searchPlaceholder}
                className="flex-1 min-w-0 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
              />
              <button type="button"
                onClick={() => setShowCc((v) => !v)}
                className="text-xs text-fg-subtle hover:text-fg-muted flex items-center gap-1 transition-colors shrink-0"
              >
                {t.email.ccLabel} <ChevronDown size={14} className={showCc ? 'rotate-180' : ''} />
              </button>
              <button type="button"
                onClick={() => setShowBcc((v) => !v)}
                className="text-xs text-fg-subtle hover:text-fg-muted flex items-center gap-1 transition-colors shrink-0"
              >
                {t.email.bccLabel} <ChevronDown size={14} className={showBcc ? 'rotate-180' : ''} />
              </button>
              <button type="button"
                onClick={() => setShowReplyTo((v) => !v)}
                className="text-xs text-fg-subtle hover:text-fg-muted flex items-center gap-1 transition-colors shrink-0"
              >
                {t.email.replyToLabel} <ChevronDown size={14} className={showReplyTo ? 'rotate-180' : ''} />
              </button>
            </div>
          </div>

          {showCc && (
            <div className="flex items-center gap-3 border-b border-fg/6 pb-3">
              <span className="text-xs text-fg-subtle w-14 flex-shrink-0">{t.email.ccLabel}</span>
              <input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder={t.common.email}
                className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
              />
            </div>
          )}
          {showBcc && (
            <div className="flex items-center gap-3 border-b border-fg/6 pb-3">
              <span className="text-xs text-fg-subtle w-14 flex-shrink-0">{t.email.bccLabel}</span>
              <input
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder={t.common.email}
                className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
              />
            </div>
          )}
          {showReplyTo && (
            <div className="flex items-center gap-3 border-b border-fg/6 pb-3">
              <span className="text-xs text-fg-subtle w-14 flex-shrink-0">{t.email.replyToLabel}</span>
              <input
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder={t.common.email}
                className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
              />
            </div>
          )}

          <div className="flex items-center gap-3 border-b border-fg/6 pb-3">
            <span className="text-xs text-fg-subtle w-14 flex-shrink-0">{t.activities.subject}</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={`${t.activities.subject}...`}
              className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none font-medium"
            />
          </div>
          {subjectPresets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {subjectPresets.map((preset) => (
                <button type="button"
                  key={preset}
                  onClick={() => setSubject(preset)}
                  className="text-2xs px-2 py-1 rounded-full bg-fg/6 border border-fg/10 text-fg-muted hover:text-fg hover:bg-fg/10 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 py-1 border-b border-fg/6">
            <button type="button"
              onClick={() => setShowTemplates((v) => !v)}
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                showTemplates ? 'bg-warning/15 text-warning border-warning/25' : 'bg-fg/5 text-fg-muted border-fg/10 hover:bg-fg/8'
              }`}
            >
              <FileText size={14} />
              {t.email.composerTemplatesToolbar}
            </button>
            <label className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
              <span className="sr-only">{t.email.composerInsertField}</span>
              <select
                className="max-w-[11rem] rounded-lg border border-fg/10 bg-surface-2/50 px-2 py-1.5 text-xs text-fg outline-none"
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value
                  if (v) insertAtCursor(v)
                  e.target.selectedIndex = 0
                }}
              >
                <option value="">{t.email.composerInsertField}…</option>
                {mergeFieldOptions.map((o) => (
                  <option key={o.token} value={o.token}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-fg/8 bg-fg/5 px-2 py-1.5">
            <button type="button"
              onClick={applyBodyBold}
              className="rounded p-1.5 text-fg-muted hover:bg-fg/10 hover:text-fg"
              title={t.email.formatBold}
              aria-label={t.email.formatBold}
            >
              <Bold size={16} />
            </button>
            <button type="button"
              onClick={applyBodyItalic}
              className="rounded p-1.5 text-fg-muted hover:bg-fg/10 hover:text-fg"
              title={t.email.formatItalic}
              aria-label={t.email.formatItalic}
            >
              <Italic size={16} />
            </button>
            <button type="button"
              onClick={applyBodyBullet}
              className="rounded p-1.5 text-fg-muted hover:bg-fg/10 hover:text-fg"
              title={t.email.formatBulletList}
              aria-label={t.email.formatBulletList}
            >
              <List size={16} />
            </button>
          </div>

          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`${t.common.description}...`}
            rows={14}
            className="w-full min-h-[220px] bg-surface-2/45 border border-fg/8 rounded-xl px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none resize-y leading-relaxed"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder={t.email.senderNamePlaceholder}
              className="bg-surface-2/45 border border-fg/8 rounded-xl px-3 py-2 text-xs text-fg placeholder:text-fg-subtle outline-none"
            />
            <label className="inline-flex items-center gap-2 text-xs text-fg-muted">
              <input
                type="checkbox"
                checked={useSignature}
                onChange={(e) => setUseSignature(e.target.checked)}
                className="rounded border-fg/20 bg-fg/5 text-accent-500 focus:ring-accent-500"
              />
              {t.email.useSignature}
            </label>
          </div>
          {showSignatureSection && (
            <>
              {savedSignatures.length > 0 && (
                <Select
                  ariaLabel={t.email.signatureSelectLabel}
                  value={activeSignatureId}
                  onChange={(e) => {
                    const nextId = e.target.value
                    setActiveSignatureId(nextId)
                    const next = savedSignatures.find((s) => s.id === nextId)
                    setSignature(next?.html ?? '')
                  }}
                  options={savedSignatures.map((sig) => ({ value: sig.id, label: sig.name }))}
                  listMaxHeightClass="max-h-48"
                />
              )}
              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder={t.email.signaturePlaceholder}
                rows={3}
                className="w-full bg-surface-2/45 border border-fg/8 rounded-xl px-3 py-2 text-xs text-fg placeholder:text-fg-subtle outline-none resize-y leading-relaxed"
              />
            </>
          )}
          <div className="flex flex-wrap gap-1.5">
            {quickReplies.map((snippet) => (
              <button type="button"
                key={snippet.id}
                onClick={() => setBody((prev) => (prev.trim() ? `${prev}\n\n${snippet.body}` : snippet.body))}
                className="text-2xs px-2 py-1 rounded-full bg-fg/6 border border-fg/10 text-fg-muted hover:text-fg hover:bg-fg/10 transition-colors"
                title={snippet.title}
              >
                {snippet.title}
              </button>
            ))}
          </div>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleAttachmentFiles} />
          <div className="border-t border-fg/6 pt-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-fg-subtle">{t.inbox.attachments}</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-2 py-1 rounded-full bg-fg/6 text-fg-muted hover:bg-fg/10"
              >
                {t.email.addFile}
              </button>
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((file, idx) => (
                  <span key={`${file.name}-${idx}`} className="inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-fg/8 text-fg-muted border border-fg/10">
                    {file.name} ({Math.ceil(file.size / 1024)} KB)
                    <button type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-fg-subtle hover:text-danger"
                      title={t.common.remove}
                      aria-label={t.common.remove}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-2xs text-fg-subtle">{t.email.attachHint}</p>
          </div>
          </div>

          {/* CRM link — Pipedrive-style sidebar */}
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
        </div>

        {/* Footer — icon row + primary actions */}
        <div className="px-4 py-2.5 border-t border-fg/8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-shrink-0 bg-surface-1/90">
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg p-2 text-fg-muted hover:bg-fg/8 hover:text-fg"
              title={t.email.addFile}
              aria-label={t.email.addFile}
            >
              <Paperclip size={18} />
            </button>
            <button
              type="button"
              onClick={() => setShowSignatureSection((v) => !v)}
              className={`rounded-lg p-2 ${showSignatureSection ? 'bg-fg/10 text-fg' : 'text-fg-muted hover:bg-fg/8 hover:text-fg'}`}
              title={t.email.useSignature}
              aria-label={t.email.useSignature}
              aria-pressed={showSignatureSection}
            >
              <PenLine size={18} />
            </button>
            <button
              type="button"
              onClick={() => setTrackingEnabled((v) => !v)}
              className={`rounded-lg p-2 ${
                trackingEnabled ? 'text-success bg-success/15' : 'text-fg-muted hover:bg-fg/8 hover:text-fg'
              }`}
              title={t.email.openEmailTracking}
              aria-label={t.email.openEmailTracking}
              aria-pressed={trackingEnabled}
            >
              <Eye size={18} />
            </button>
            <button
              type="button"
              onClick={() => setSendLater((v) => !v)}
              className={`rounded-lg p-2 ${
                sendLater ? 'text-indigo-200 bg-accent-500/15' : 'text-fg-muted hover:bg-fg/8 hover:text-fg'
              }`}
              title={t.email.sendLater}
              aria-label={t.email.sendLater}
              aria-pressed={sendLater}
            >
              <Calendar size={18} />
            </button>
            {sendLater && (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                title={t.email.scheduleSendTime}
                aria-label={t.email.scheduleSendTime}
                className="bg-surface-2 border border-fg/10 rounded-lg px-2 py-1.5 text-xs text-fg min-w-0"
              />
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end flex-1 min-w-0">
            {sendDisabledHint && (
              <p id={sendHintId} className="text-2xs text-fg-subtle sm:max-w-[18rem] sm:text-right">
                {sendDisabledHint}
              </p>
            )}
            <div className="flex items-center gap-2 justify-end flex-wrap">
              <button
                type="button"
                onClick={requestClose}
                className="text-xs font-medium text-fg-muted hover:text-fg px-3 py-2 rounded-lg hover:bg-fg/6 transition-colors"
              >
                {t.email.discardComposer}
              </button>
              <button
                type="button"
                onClick={() => {
                  const toList = to.split(',').map((s) => s.trim()).filter(Boolean)
                  useEmailStore.getState().saveDraft({
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
                  toast.success(t.email.draftSaved)
                  onClose()
                }}
                className="text-xs font-medium text-fg-muted hover:text-fg px-3 py-2 rounded-lg hover:bg-fg/6 transition-colors"
              >
                {t.common.save}
              </button>
              <button type="button"
                onClick={() => { void handleSend() }}
                disabled={sendDisabled}
                title={sendDisabled ? (sendDisabledHint ?? undefined) : t.email.send}
                aria-describedby={sendDisabledHint ? sendHintId : undefined}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-gradient text-fg text-sm font-semibold disabled:opacity-40 disabled:pointer-events-none"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {t.email.send}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
