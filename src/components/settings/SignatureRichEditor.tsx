import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import {
  Bold,
  Eye,
  Italic,
  Underline,
  Strikethrough,
  Link2,
  Image as ImageIcon,
  List,
  ListOrdered,
} from 'lucide-react'
import DOMPurify from 'dompurify'
import { useTranslations } from '../../i18n'
import { Button } from '../ui/Button'

/** Rich-text signature preview / persistence: strip XSS while keeping links, lists, and data-URL images. */
function sanitizeSignatureHtml(html: string): string {
  return DOMPurify.sanitize(html ?? '', {
    USE_PROFILES: { html: true },
    // Allow https, mailto, tel, and data: only for images (not scripts/SVG)
    ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):|^data:image\//i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'srcdoc'],
  })
}

function hasPreviewableSignature(html: string): boolean {
  if (!html?.trim()) return false
  if (typeof document === 'undefined') {
    const stripped = html.replace(/<[^>]+>/g, '').replace(/\u00a0/g, ' ').trim()
    return stripped.length > 0 || /<img\b/i.test(html)
  }
  const d = document.createElement('div')
  d.innerHTML = html
  const text = d.innerText?.replace(/\u00a0/g, ' ').trim() ?? ''
  return Boolean(text || d.querySelector('img'))
}

export type SignatureRichEditorHandle = {
  insertText: (text: string) => void
  focus: () => void
}

export interface SignatureRichEditorProps {
  id?: string
  value: string
  onChange: (html: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  /** Rendered below the editing surface (e.g. merge-field chips). */
  footer?: ReactNode
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-5 w-px bg-fg/15 shrink-0" aria-hidden />
}

export const SignatureRichEditor = forwardRef<SignatureRichEditorHandle, SignatureRichEditorProps>(
  function SignatureRichEditor(
    { id, value, onChange, placeholder, label, disabled, footer },
    ref,
  ) {
    const t = useTranslations()
    const editorRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const lastEmitted = useRef<string | null>(null)
    const [empty, setEmpty] = useState(() => !value?.trim())
    const [focused, setFocused] = useState(false)

    const previewHtml = useMemo(() => sanitizeSignatureHtml(value ?? ''), [value])
    const showPreview = useMemo(() => hasPreviewableSignature(value ?? ''), [value])

    const emit = useCallback(() => {
      const el = editorRef.current
      if (!el) return
      let html = sanitizeSignatureHtml(el.innerHTML)
      const text = el.innerText?.replace(/\u00a0/g, ' ').trim() ?? ''
      const hasImg = Boolean(el.querySelector('img'))
      if (!text && !hasImg) {
        html = ''
        if (el.innerHTML !== '<br>') el.innerHTML = '<br>'
      }
      lastEmitted.current = html
      onChange(html)
      setEmpty(!text && !hasImg)
    }, [onChange])

    useEffect(() => {
      const el = editorRef.current
      if (!el) return
      const incoming = value ?? ''
      if (incoming === lastEmitted.current) return
      const next = incoming.trim() === '' ? '<br>' : incoming
      if (el.innerHTML !== next) {
        el.innerHTML = next
      }
      lastEmitted.current = incoming
      const text = el.innerText?.replace(/\u00a0/g, ' ').trim() ?? ''
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncs the `empty` flag after imperatively updating the DOM with the incoming value prop
      setEmpty(!text && !el.querySelector('img'))
    }, [value])

    const run = useCallback(
      (command: string, arg?: string) => {
        if (disabled) return
        editorRef.current?.focus()
        try {
          document.execCommand(command, false, arg)
        } catch {
          /* some commands fail in edge contexts */
        }
        emit()
      },
      [disabled, emit],
    )

    const handleImage = useCallback(
      async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file || disabled) return
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result ?? ''))
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(file)
        })
        editorRef.current?.focus()
        const img = `<img src="${dataUrl}" alt="" style="max-width:220px;height:auto;border-radius:6px;vertical-align:middle;" />`
        try {
          document.execCommand('insertHTML', false, img)
        } catch {
          document.execCommand('insertImage', false, dataUrl)
        }
        emit()
      },
      [disabled, emit],
    )

    const handleLink = useCallback(() => {
      if (disabled) return
      const url = window.prompt(t.settings.signatureEditorLinkPrompt, 'https://')
      if (url == null || !url.trim()) return
      editorRef.current?.focus()
      try {
        document.execCommand('createLink', false, url.trim())
      } catch {
        document.execCommand('insertHTML', false, `<a href="${url.trim()}">${url.trim()}</a>`)
      }
      emit()
    }, [disabled, emit, t.settings.signatureEditorLinkPrompt])

    useImperativeHandle(
      ref,
      () => ({
        focus: () => editorRef.current?.focus(),
        insertText: (text: string) => {
          if (disabled) return
          const el = editorRef.current
          if (!el) return
          el.focus()
          const sel = window.getSelection()
          if (!sel?.rangeCount) {
            el.innerHTML += text
            emit()
            return
          }
          const range = sel.getRangeAt(0)
          range.deleteContents()
          const node = document.createTextNode(text)
          range.insertNode(node)
          range.setStartAfter(node)
          range.collapse(true)
          sel.removeAllRanges()
          sel.addRange(range)
          emit()
        },
      }),
      [disabled, emit],
    )

    return (
      <div className="space-y-1.5">
        {label ? (
          <label htmlFor={id} className="block text-xs font-medium text-fg">
            {label}
          </label>
        ) : null}
        <div
          className={`rounded-xl border border-fg/10 bg-surface-2/50 overflow-hidden ${
            disabled ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          <div
            className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-fg/8 bg-fg/[0.04]"
            role="toolbar"
            aria-label={t.email.formatToolbarLabel}
          >
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="min-h-8 px-2"
              disabled={disabled}
              onClick={() => run('bold')}
              aria-label={t.settings.signatureToolbarBold}
              title={t.settings.signatureToolbarBold}
            >
              <Bold size={14} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="min-h-8 px-2"
              disabled={disabled}
              onClick={() => run('italic')}
              aria-label={t.settings.signatureToolbarItalic}
              title={t.settings.signatureToolbarItalic}
            >
              <Italic size={14} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="min-h-8 px-2"
              disabled={disabled}
              onClick={() => run('underline')}
              aria-label={t.email.formatUnderline}
              title={t.email.formatUnderline}
            >
              <Underline size={14} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="min-h-8 px-2"
              disabled={disabled}
              onClick={() => run('strikeThrough')}
              aria-label={t.email.formatStrikethrough}
              title={t.email.formatStrikethrough}
            >
              <Strikethrough size={14} />
            </Button>
            <ToolbarDivider />
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="min-h-8 px-2"
              disabled={disabled}
              onClick={handleLink}
              aria-label={t.settings.signatureToolbarLink}
              title={t.settings.signatureToolbarLink}
            >
              <Link2 size={14} />
            </Button>
            <label
              className="inline-flex items-center justify-center min-h-8 px-2 rounded-lg border border-border-subtle bg-fg/5 text-fg-muted cursor-pointer hover:bg-fg/8 transition-colors focus-within:focus-ring"
              aria-label={t.settings.signatureToolbarImage}
              title={t.settings.signatureToolbarImage}
            >
              <ImageIcon size={14} />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={disabled}
                onChange={handleImage}
              />
            </label>
            <ToolbarDivider />
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="min-h-8 px-2"
              disabled={disabled}
              onClick={() => run('insertUnorderedList')}
              aria-label={t.email.formatBulletList}
              title={t.email.formatBulletList}
            >
              <List size={14} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="min-h-8 px-2"
              disabled={disabled}
              onClick={() => run('insertOrderedList')}
              aria-label={t.email.formatNumberedList}
              title={t.email.formatNumberedList}
            >
              <ListOrdered size={14} />
            </Button>
          </div>
          <div className="relative">
            {empty && !focused && placeholder ? (
              <span
                className="pointer-events-none absolute left-3 top-2.5 right-3 text-sm text-fg-subtle select-none z-0"
                aria-hidden
              >
                {placeholder}
              </span>
            ) : null}
            <div
              id={id}
              ref={editorRef}
              className="relative z-[1] min-h-[12rem] max-h-[min(24rem,50vh)] overflow-y-auto px-3 py-2.5 text-sm text-fg leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500/35 [&_a]:text-accent-400 [&_a]:underline [&_img]:max-w-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              contentEditable={!disabled}
              role="textbox"
              aria-multiline
              aria-label={label ?? placeholder}
              suppressContentEditableWarning
              onInput={emit}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false)
                emit()
              }}
            />
          </div>
        </div>
        <div
          className="rounded-xl border border-fg/10 bg-surface-2/30 overflow-hidden"
          aria-label={t.settings.signatureEditorPreviewLabel}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-fg/8 bg-fg/[0.03]">
            <Eye size={14} className="text-fg-subtle shrink-0" aria-hidden />
            <span className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
              {t.settings.signatureEditorPreviewLabel}
            </span>
          </div>
          <div
            className="px-3 py-3 text-sm text-fg leading-relaxed min-h-[3rem] max-h-[min(16rem,40vh)] overflow-y-auto [&_a]:text-accent-400 [&_a]:underline [&_img]:max-w-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            aria-live="polite"
          >
            {showPreview ? (
              <div
                className="signature-preview-content"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <p className="text-[11px] text-fg-subtle italic leading-relaxed">
                {t.settings.signatureEditorPreviewEmpty}
              </p>
            )}
          </div>
        </div>
        {footer ? <div className="pt-1">{footer}</div> : null}
        <p className="text-[11px] text-fg-subtle leading-relaxed">{t.settings.signatureEditorVisualHint}</p>
      </div>
    )
  },
)
