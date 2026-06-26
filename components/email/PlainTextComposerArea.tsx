import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Bold,
  Eraser,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  TextQuote,
  Underline,
  Undo2,
} from 'lucide-react'
import { useTranslations } from '../../i18n'
import { getEmailMergeFieldOptions } from '../../utils/emailMergeFields'
import {
  type BodyEditResult,
  applyEditToTextarea,
  clearFormattingInSelection,
  expandSelectionToLineRange,
  indentSelection,
  numberLinesInSelection,
  outdentSelection,
  prefixLinesInSelection,
  wrapSelectionMarkers,
} from '../../utils/emailPlainFormatting'

function FormatToolBtn({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  title: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-fg/12 hover:text-fg disabled:pointer-events-none disabled:opacity-35 transition-colors"
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <span className="hidden sm:block w-px h-6 shrink-0 self-center bg-fg/15 mx-0.5" aria-hidden />
}

export interface PlainTextComposerAreaProps {
  value: string
  onChange: (next: string) => void
  /** When this changes (e.g. selected template id), format undo stacks reset */
  resetKey?: string
  placeholder?: string
  minRows?: number
  id?: string
  /** Shown between merge-field row and the toolbar */
  hint?: string
}

export function PlainTextComposerArea({
  value,
  onChange,
  resetKey,
  placeholder,
  minRows = 12,
  id,
  hint,
}: PlainTextComposerAreaProps) {
  const t = useTranslations()
  const stableHintSuffix = useId()
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)
  const formatUndoPast = useRef<string[]>([])
  const formatUndoFuture = useRef<string[]>([])
  const [undoDepth, setUndoDepth] = useState(0)
  const [redoDepth, setRedoDepth] = useState(0)

  const mergeFieldOptions = useMemo(() => getEmailMergeFieldOptions(t), [t])

  useEffect(() => {
    formatUndoPast.current = []
    formatUndoFuture.current = []
    
    setUndoDepth(0)
    setRedoDepth(0)
  }, [resetKey])

  const insertAtCursor = useCallback(
    (text: string) => {
      const el = bodyRef.current
      if (!el) {
        formatUndoPast.current.push(value)
        while (formatUndoPast.current.length > 40) formatUndoPast.current.shift()
        formatUndoFuture.current = []
        setUndoDepth(formatUndoPast.current.length)
        setRedoDepth(0)
        onChange(value + text)
        return
      }
      const start = el.selectionStart ?? 0
      const end = el.selectionEnd ?? 0
      formatUndoPast.current.push(value)
      while (formatUndoPast.current.length > 40) formatUndoPast.current.shift()
      formatUndoFuture.current = []
      setUndoDepth(formatUndoPast.current.length)
      setRedoDepth(0)
      const next = value.slice(0, start) + text + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        const node = bodyRef.current
        if (!node) return
        node.focus()
        const pos = start + text.length
        node.setSelectionRange(pos, pos)
      })
    },
    [onChange, value],
  )

  const runBodyEdit = useCallback(
    (compute: (b: string, start: number, end: number) => BodyEditResult) => {
      const el = bodyRef.current
      if (!el) return
      const start = el.selectionStart ?? 0
      const end = el.selectionEnd ?? 0
      formatUndoPast.current.push(value)
      while (formatUndoPast.current.length > 40) formatUndoPast.current.shift()
      formatUndoFuture.current = []
      const edit = compute(value, start, end)
      setUndoDepth(formatUndoPast.current.length)
      setRedoDepth(0)
      applyEditToTextarea(el, edit, onChange)
    },
    [onChange, value],
  )

  const runLineBodyEdit = useCallback(
    (compute: (b: string, lineStart: number, lineEnd: number) => BodyEditResult) => {
      const el = bodyRef.current
      if (!el) return
      const cs = el.selectionStart ?? 0
      const ce = el.selectionEnd ?? 0
      const [ls, le] = expandSelectionToLineRange(value, cs, ce)
      formatUndoPast.current.push(value)
      while (formatUndoPast.current.length > 40) formatUndoPast.current.shift()
      formatUndoFuture.current = []
      const edit = compute(value, ls, le)
      setUndoDepth(formatUndoPast.current.length)
      setRedoDepth(0)
      applyEditToTextarea(el, edit, onChange)
    },
    [onChange, value],
  )

  const handleFormatUndo = useCallback(() => {
    const snap = formatUndoPast.current.pop()
    if (snap === undefined) return
    formatUndoFuture.current.push(value)
    onChange(snap)
    queueMicrotask(() => {
      setUndoDepth(formatUndoPast.current.length)
      setRedoDepth(formatUndoFuture.current.length)
    })
  }, [onChange, value])

  const handleFormatRedo = useCallback(() => {
    const snap = formatUndoFuture.current.pop()
    if (snap === undefined) return
    formatUndoPast.current.push(value)
    onChange(snap)
    queueMicrotask(() => {
      setUndoDepth(formatUndoPast.current.length)
      setRedoDepth(formatUndoFuture.current.length)
    })
  }, [onChange, value])

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
    const sel = value.slice(start, end)
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
    formatUndoPast.current.push(value)
    while (formatUndoPast.current.length > 40) formatUndoPast.current.shift()
    formatUndoFuture.current = []
    const next = value.slice(0, start) + md + value.slice(end)
    onChange(next)
    setUndoDepth(formatUndoPast.current.length)
    setRedoDepth(0)
    const pos = start + md.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }, [onChange, t, value])

  const applyInsertImage = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const sel = value.slice(start, end)
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
    formatUndoPast.current.push(value)
    while (formatUndoPast.current.length > 40) formatUndoPast.current.shift()
    formatUndoFuture.current = []
    const next = value.slice(0, start) + md + value.slice(end)
    onChange(next)
    setUndoDepth(formatUndoPast.current.length)
    setRedoDepth(0)
    const pos = start + md.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }, [onChange, t, value])

  const hintId = hint ? `plain-composer-hint-${stableHintSuffix}` : undefined

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 py-1 border-b border-fg/6">
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
              <option key={o.token} value={o.token}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {hint ? (
        <p id={hintId} className="text-2xs text-fg-subtle leading-snug">
          {hint}
        </p>
      ) : null}

      <div
        className="rounded-xl border border-fg/8 bg-surface-2/25 overflow-hidden focus-within:ring-1 focus-within:ring-accent-500/30"
        role="group"
        aria-label={t.email.formatToolbarLabel}
      >
        <div
          role="toolbar"
          className="flex flex-wrap items-center gap-0.5 px-1 py-1 border-b border-fg/8 bg-fg/[0.045]"
        >
          <FormatToolBtn onClick={handleFormatUndo} disabled={undoDepth === 0} title={t.email.formatUndo}>
            <Undo2 size={16} strokeWidth={2} aria-hidden />
          </FormatToolBtn>
          <FormatToolBtn onClick={handleFormatRedo} disabled={redoDepth === 0} title={t.email.formatRedo}>
            <Redo2 size={16} strokeWidth={2} aria-hidden />
          </FormatToolBtn>
          <ToolbarDivider />
          <FormatToolBtn onClick={applyBodyBold} title={t.email.formatBold}>
            <Bold size={16} strokeWidth={2.25} aria-hidden />
          </FormatToolBtn>
          <FormatToolBtn onClick={applyBodyItalic} title={t.email.formatItalic}>
            <Italic size={16} strokeWidth={2.25} aria-hidden />
          </FormatToolBtn>
          <FormatToolBtn onClick={applyBodyUnderline} title={t.email.formatUnderline}>
            <Underline size={16} strokeWidth={2} aria-hidden />
          </FormatToolBtn>
          <FormatToolBtn onClick={applyBodyStrike} title={t.email.formatStrikethrough}>
            <Strikethrough size={16} strokeWidth={2} aria-hidden />
          </FormatToolBtn>
          <ToolbarDivider />
          <FormatToolBtn onClick={applyBodyBullet} title={t.email.formatBulletList}>
            <List size={16} strokeWidth={2} aria-hidden />
          </FormatToolBtn>
          <FormatToolBtn onClick={applyBodyNumbered} title={t.email.formatNumberedList}>
            <ListOrdered size={16} strokeWidth={2} aria-hidden />
          </FormatToolBtn>
          <FormatToolBtn onClick={applyBodyQuote} title={t.email.formatQuote}>
            <TextQuote size={16} strokeWidth={2} aria-hidden />
          </FormatToolBtn>
          <ToolbarDivider />
          <FormatToolBtn onClick={applyBodyOutdent} title={t.email.formatOutdent}>
            <IndentDecrease size={16} strokeWidth={2} aria-hidden />
          </FormatToolBtn>
          <FormatToolBtn onClick={applyBodyIndent} title={t.email.formatIndent}>
            <IndentIncrease size={16} strokeWidth={2} aria-hidden />
          </FormatToolBtn>
          <ToolbarDivider />
          <FormatToolBtn onClick={applyInsertLink} title={t.email.formatInsertLink}>
            <Link2 size={16} strokeWidth={2} aria-hidden />
          </FormatToolBtn>
          <FormatToolBtn onClick={applyInsertImage} title={t.email.formatInsertImage}>
            <ImageIcon size={16} strokeWidth={2} aria-hidden />
          </FormatToolBtn>
          <ToolbarDivider />
          <FormatToolBtn onClick={applyBodyClearFormat} title={t.email.formatClear}>
            <Eraser size={16} strokeWidth={2} aria-hidden />
          </FormatToolBtn>
        </div>
        <textarea
          ref={bodyRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={minRows}
          aria-describedby={hintId}
          className="w-full min-w-0 border-0 rounded-none rounded-b-xl bg-transparent px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none resize-y leading-relaxed focus:ring-0 min-h-[200px]"
        />
      </div>
    </div>
  )
}
