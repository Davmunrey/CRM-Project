import type { Dispatch, RefObject, SetStateAction } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from '../../../i18n'

export interface Attachment {
  name: string
  mimeType: string
  size: number
  dataBase64: string
}

export interface ComposerAttachmentsProps {
  attachments: Attachment[]
  setAttachments: Dispatch<SetStateAction<Attachment[]>>
  fileInputRef: RefObject<HTMLInputElement>
}

export function ComposerAttachments({
  attachments,
  setAttachments,
  fileInputRef,
}: ComposerAttachmentsProps) {
  const t = useTranslations()

  return (
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
  )
}
