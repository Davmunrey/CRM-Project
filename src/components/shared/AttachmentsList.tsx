import { useState, useEffect, useRef } from 'react'
import { Paperclip, Upload, Trash2, FileText, Image, File, Download } from 'lucide-react'
import { useAttachmentsStore } from '../../store/attachmentsStore'
import { toast } from '../../store/toastStore'
import { useTranslations } from '../../i18n'
import { useAuthStore } from '../../store/authStore'
import type { Attachment } from '../../types'
import { formatDateShort } from '../../utils/formatters'

interface AttachmentsListProps {
  entityType: 'contact' | 'company' | 'deal'
  entityId: string
}

function formatFileSize(bytes: number, t: ReturnType<typeof useTranslations>): string {
  if (bytes < 1024) return t.attachments.fileSizeB.replace('{size}', String(bytes))
  if (bytes < 1024 * 1024) return t.attachments.fileSizeKb.replace('{size}', `${(bytes / 1024).toFixed(1)}`)
  return t.attachments.fileSizeMb.replace('{size}', `${(bytes / (1024 * 1024)).toFixed(1)}`)
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image size={16} className="text-accent-400" />
  if (mimeType.includes('pdf')) return <FileText size={16} className="text-danger" />
  return <File size={16} className="text-fg-muted" />
}

export function AttachmentsList({ entityType, entityId }: AttachmentsListProps) {
  const t = useTranslations()
  const uploadedByName = useAuthStore((s) => s.currentUser?.name ?? '')
  // Manual subscription for persisted store
  const [allAttachments, setAllAttachments] = useState(() => useAttachmentsStore.getState().attachments)
  useEffect(() => useAttachmentsStore.subscribe((s) => setAllAttachments(s.attachments)), [])

  const attachments = allAttachments.filter(a => a.entityType === entityType && a.entityId === entityId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB limit for base64-in-row attachments

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t.attachments.fileTooLarge.replace('{fileName}', file.name))
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        useAttachmentsStore.getState().addAttachment({
          entityType,
          entityId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          data: base64,
          uploadedBy: uploadedByName || t.common.notAvailable,
        })
        toast.success(t.attachments.fileAttached.replace('{fileName}', file.name))
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDownload = (attachment: Attachment) => {
    const byteString = atob(attachment.data)
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
    const blob = new Blob([ab], { type: attachment.mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = attachment.fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = (id: string, fileName: string) => {
    useAttachmentsStore.getState().deleteAttachment(id)
    toast.success(t.attachments.fileRemoved.replace('{fileName}', fileName))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={14} className="text-fg-subtle" />
          <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide">
            {t.inbox.attachments} {attachments.length > 0 && `(${attachments.length})`}
          </p>
        </div>
        <button type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-2 border border-fg/8 text-fg-muted hover:text-fg hover:border-fg/15 transition-colors"
        >
          <Upload size={12} />
          {t.email.addFile}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          title={t.email.addFile}
          aria-label={t.email.addFile}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
          dragOver
            ? 'border-accent-500/50 bg-accent-500/5'
            : attachments.length === 0
              ? 'border-fg/8 hover:border-fg/15'
              : 'border-transparent p-0'
        }`}
      >
        {attachments.length === 0 && !dragOver && (
          <p className="text-xs text-fg-subtle">{t.email.attachHint}</p>
        )}
        {dragOver && (
          <p className="text-xs text-accent-400">{t.email.addFile}</p>
        )}

        {/* File list */}
        {attachments.length > 0 && (
          <div className="space-y-1.5">
            {attachments
              .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
              .map(att => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-fg/3 border border-fg/6 hover:border-fg/10 group transition-colors"
                >
                  {getFileIcon(att.mimeType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg truncate">{att.fileName}</p>
                    <p className="text-[10px] text-fg-subtle">
                      {formatFileSize(att.fileSize, t)} · {formatDateShort(att.uploadedAt)} · {att.uploadedBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button"
                      onClick={() => handleDownload(att)}
                      className="p-1 rounded text-fg-subtle hover:text-accent-400 transition-colors"
                      title={t.common.export}
                    >
                      <Download size={13} />
                    </button>
                    <button type="button"
                      onClick={() => handleDelete(att.id, att.fileName)}
                      className="p-1 rounded text-fg-subtle hover:text-danger transition-colors"
                      title={t.common.delete}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
