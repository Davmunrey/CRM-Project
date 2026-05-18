import type { Dispatch, RefObject, SetStateAction } from 'react'
import { Paperclip, PenLine, Eye, Calendar, Send } from 'lucide-react'
import { useTranslations } from '../../../i18n'
import { Button } from '../../ui/Button'

export interface ComposerFooterProps {
  sending: boolean
  sendDisabled: boolean
  sendDisabledHint: string | null
  sendHintId: string
  showSignatureSection: boolean
  setShowSignatureSection: Dispatch<SetStateAction<boolean>>
  trackingEnabled: boolean
  setTrackingEnabled: Dispatch<SetStateAction<boolean>>
  sendLater: boolean
  setSendLater: Dispatch<SetStateAction<boolean>>
  scheduledAt: string
  setScheduledAt: Dispatch<SetStateAction<string>>
  fileInputRef: RefObject<HTMLInputElement>
  onSend: () => void
  onDiscard: () => void
  onSaveDraft: () => void
}

export function ComposerFooter({
  sending,
  sendDisabled,
  sendDisabledHint,
  sendHintId,
  showSignatureSection,
  setShowSignatureSection,
  trackingEnabled,
  setTrackingEnabled,
  sendLater,
  setSendLater,
  scheduledAt,
  setScheduledAt,
  fileInputRef,
  onSend,
  onDiscard,
  onSaveDraft,
}: ComposerFooterProps) {
  const t = useTranslations()

  return (
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
            sendLater ? 'text-accent-300 bg-accent-500/15' : 'text-fg-muted hover:bg-fg/8 hover:text-fg'
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
          <Button variant="ghost" size="sm" onClick={onDiscard}>
            {t.email.discardComposer}
          </Button>
          <Button variant="secondary" size="sm" onClick={onSaveDraft}>
            {t.common.save}
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={sending}
            leftIcon={!sending ? <Send size={16} aria-hidden /> : undefined}
            onClick={onSend}
            disabled={sendDisabled}
            title={sendDisabled ? (sendDisabledHint ?? undefined) : t.email.send}
            aria-describedby={sendDisabledHint ? sendHintId : undefined}
          >
            {t.email.send}
          </Button>
        </div>
      </div>
    </div>
  )
}
