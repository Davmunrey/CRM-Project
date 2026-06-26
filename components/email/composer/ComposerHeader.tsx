import { ArrowLeft, ChevronDown, X } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import { useTranslations } from '../../../i18n'

export interface ComposerHeaderProps {
  embeddedSequenceStep: boolean
  isInline: boolean
  connected: boolean
  gmailAddress: string | null | undefined
  to: string
  setTo: Dispatch<SetStateAction<string>>
  cc: string
  setCc: Dispatch<SetStateAction<string>>
  bcc: string
  setBcc: Dispatch<SetStateAction<string>>
  replyTo: string
  setReplyTo: Dispatch<SetStateAction<string>>
  subject: string
  setSubject: Dispatch<SetStateAction<string>>
  showCc: boolean
  setShowCc: Dispatch<SetStateAction<boolean>>
  showBcc: boolean
  setShowBcc: Dispatch<SetStateAction<boolean>>
  showReplyTo: boolean
  setShowReplyTo: Dispatch<SetStateAction<boolean>>
  subjectPresets: string[]
  onRequestClose: () => void
  onRequestGmailConnect?: () => void
  gmailRequiredDisconnected: boolean
}

export function ComposerHeader({
  embeddedSequenceStep,
  isInline,
  connected,
  gmailAddress,
  to,
  setTo,
  cc,
  setCc,
  bcc,
  setBcc,
  replyTo,
  setReplyTo,
  subject,
  setSubject,
  showCc,
  setShowCc,
  showBcc,
  setShowBcc,
  showReplyTo,
  setShowReplyTo,
  subjectPresets,
  onRequestClose,
  onRequestGmailConnect,
  gmailRequiredDisconnected,
}: ComposerHeaderProps) {
  const t = useTranslations()

  return (
    <>
      {embeddedSequenceStep ? (
        <div className="flex-shrink-0 border-b border-fg/8 bg-surface-1/60 px-3 py-2 sm:px-4">
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
            <h2 id="email-composer-title" className="text-xs font-semibold text-fg leading-snug min-w-0 flex-1 basis-[min(100%,16rem)] sm:text-sm">
              {t.sequences.flow.sequenceMailboxEditorTitle}
            </h2>
            {connected ? (
              <span className="text-2xs px-2 py-0.5 rounded-full bg-success/15 text-success shrink-0">Gmail</span>
            ) : (
              <span className="text-2xs px-2 py-0.5 rounded-full bg-fg/8 text-fg-subtle shrink-0">{t.settings.disconnected}</span>
            )}
          </div>
          {!connected ? (
            <p className="mt-1.5 text-[10px] text-fg-subtle leading-snug">{t.sequences.flow.sequenceStepDraftWithoutGmailHint}</p>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-fg/8 flex-shrink-0 bg-surface-1/60">
          <button
            type="button"
            onClick={onRequestClose}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-fg-muted hover:text-fg hover:bg-fg/8 transition-colors shrink-0"
          >
            <ArrowLeft size={16} className="shrink-0" aria-hidden />
            <span>{isInline ? t.common.cancel : t.common.back}</span>
          </button>
          <h2 id="email-composer-title" className="text-sm font-semibold text-fg truncate flex-1 min-w-0 sm:text-center">
            {isInline ? t.inbox.reply : t.inbox.compose}
          </h2>
          {connected ? (
            <span className="text-2xs px-2 py-0.5 rounded-full bg-success/15 text-success shrink-0">Gmail</span>
          ) : (
            <span className="text-2xs px-2 py-0.5 rounded-full bg-fg/8 text-fg-subtle shrink-0">{t.settings.disconnected}</span>
          )}
          <button
            type="button"
            onClick={onRequestClose}
            title={t.email.closeComposer}
            aria-label={t.email.closeComposer}
            className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-fg/8 transition-colors shrink-0"
          >
            <span className="sr-only">{t.email.closeComposer}</span>
            <X size={18} />
          </button>
        </div>
      )}

      {gmailRequiredDisconnected && !embeddedSequenceStep && (
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

      <div className="space-y-1 border-b border-fg/8 px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-fg-subtle w-14 shrink-0">{t.email.composerFrom}</span>
          <span className="text-sm text-fg truncate" title={gmailAddress ?? undefined}>
            {gmailAddress ?? t.common.notAvailable}
          </span>
        </div>
        {gmailAddress ? (
          <p className="text-[10px] text-fg-subtle leading-snug pl-[3.25rem]">{t.email.outboundFromMailboxHint}</p>
        ) : null}
      </div>

      {embeddedSequenceStep && (
        <div className="space-y-2 border-b border-fg/8 px-5 pb-3 pt-2" onPointerDown={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-fg-subtle w-14 shrink-0">{t.email.ccLabel}</span>
            <input
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder={t.sequences.flow.sequenceStepCcPlaceholder}
              className="flex-1 min-w-0 rounded-lg border border-fg/10 bg-surface-1/60 px-2 py-1 text-xs text-fg placeholder:text-fg-subtle outline-none focus:border-accent-500/40"
            />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-fg-subtle w-14 shrink-0">{t.email.bccLabel}</span>
            <input
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder={t.sequences.flow.sequenceStepBccPlaceholder}
              className="flex-1 min-w-0 rounded-lg border border-fg/10 bg-surface-1/60 px-2 py-1 text-xs text-fg placeholder:text-fg-subtle outline-none focus:border-accent-500/40"
            />
          </div>
        </div>
      )}

      {!embeddedSequenceStep && (
        <div className="px-5 space-y-0">
          <div className="flex items-center gap-3 border-b border-fg/6 pb-3 pt-3">
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

          <div className="flex items-center gap-3 border-b border-fg/6 pb-3 pt-3">
            <span className="text-xs text-fg-subtle w-14 flex-shrink-0">{t.activities.subject}</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={`${t.activities.subject}...`}
              className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none font-medium"
            />
          </div>
          {subjectPresets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
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
        </div>
      )}

      {embeddedSequenceStep && (
        <div className="flex items-center gap-3 border-b border-fg/6 px-5 pb-3 pt-3">
          <span className="text-xs text-fg-subtle w-14 flex-shrink-0">{t.activities.subject}</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={`${t.activities.subject}...`}
            className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none font-medium"
          />
        </div>
      )}
    </>
  )
}
