import type { Dispatch, RefObject, SetStateAction } from 'react'
import { FileText } from 'lucide-react'
import { useTranslations } from '../../../i18n'
import { Select } from '../../ui/Select'
import { ComposerToolbar } from './ComposerToolbar'
import type { ComposerToolbarProps } from './ComposerToolbar'

export type ComposerBodyToolbarProps = ComposerToolbarProps

export interface ComposerBodyProps {
  body: string
  setBody: Dispatch<SetStateAction<string>>
  bodyRef: RefObject<HTMLTextAreaElement>
  embeddedSequenceStep: boolean
  isInline: boolean
  senderName: string
  setSenderName: Dispatch<SetStateAction<string>>
  useSignature: boolean
  setUseSignature: Dispatch<SetStateAction<boolean>>
  signature: string
  setSignature: Dispatch<SetStateAction<string>>
  activeSignatureId: string
  setActiveSignatureId: Dispatch<SetStateAction<string>>
  showSignatureSection: boolean
  savedSignatures: Array<{ id: string; name: string; html: string }>
  quickReplies: Array<{ id: string; title: string; body: string }>
  toolbarProps: ComposerBodyToolbarProps
}

export function ComposerBody({
  body,
  setBody,
  bodyRef,
  embeddedSequenceStep,
  isInline,
  senderName,
  setSenderName,
  useSignature,
  setUseSignature,
  signature,
  setSignature,
  activeSignatureId,
  setActiveSignatureId,
  showSignatureSection,
  savedSignatures,
  quickReplies,
  toolbarProps,
}: ComposerBodyProps) {
  const t = useTranslations()

  return (
    <>
      {/* Templates / merge-field row — sits above the border box, matching original layout */}
      <div className="flex flex-wrap items-center gap-2 py-1 border-b border-fg/6">
        <button type="button"
          onClick={toolbarProps.onToggleTemplates}
          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
            toolbarProps.showTemplates ? 'bg-warning/15 text-warning border-warning/25' : 'bg-fg/5 text-fg-muted border-fg/10 hover:bg-fg/8'
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
              if (v) toolbarProps.onInsertMergeField(v)
              e.target.selectedIndex = 0
            }}
          >
            <option value="">{t.email.composerInsertField}…</option>
            {toolbarProps.mergeFieldOptions.map((o) => (
              <option key={o.token} value={o.token}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Formatting toolbar + textarea share a single rounded border box */}
      <div
        className="rounded-xl border border-fg/8 bg-surface-2/25 overflow-hidden focus-within:ring-1 focus-within:ring-accent-500/30"
        role="group"
        aria-label={t.email.formatToolbarLabel}
      >
        <ComposerToolbar {...toolbarProps} />
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`${t.common.description}...`}
          rows={embeddedSequenceStep ? 14 : isInline ? 7 : 14}
          className={`w-full min-w-0 border-0 rounded-none rounded-b-xl bg-transparent px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none resize-y leading-relaxed focus:ring-0 ${
            embeddedSequenceStep ? 'min-h-[min(12rem,28svh)] sm:min-h-[220px]' : isInline ? 'min-h-[140px]' : 'min-h-[220px]'
          }`}
        />
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${embeddedSequenceStep ? 'gap-1.5' : ''}`}>
        <input
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          placeholder={t.email.senderNamePlaceholder}
          className={`bg-surface-2/45 border border-fg/8 rounded-xl text-xs text-fg placeholder:text-fg-subtle outline-none ${
            embeddedSequenceStep ? 'px-2.5 py-1.5' : 'px-3 py-2'
          }`}
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
              listMaxHeightClass={embeddedSequenceStep ? 'max-h-32' : 'max-h-48'}
            />
          )}
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder={t.email.signaturePlaceholder}
            rows={embeddedSequenceStep ? 2 : 3}
            className={`w-full bg-surface-2/45 border border-fg/8 rounded-xl text-xs text-fg placeholder:text-fg-subtle outline-none resize-y leading-relaxed ${
              embeddedSequenceStep ? 'px-2.5 py-1.5' : 'px-3 py-2'
            }`}
          />
        </>
      )}

      {!embeddedSequenceStep && (
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
      )}
    </>
  )
}
