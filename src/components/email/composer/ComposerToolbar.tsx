import type { ReactNode } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  TextQuote,
  Link2,
  Image as ImageIcon,
  Eraser,
  Undo2,
  Redo2,
  IndentIncrease,
  IndentDecrease,
} from 'lucide-react'
import { useTranslations } from '../../../i18n'

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

export interface ComposerToolbarProps {
  undoDepth: number
  redoDepth: number
  showTemplates: boolean
  mergeFieldOptions: Array<{ token: string; label: string }>
  onUndo: () => void
  onRedo: () => void
  onBold: () => void
  onItalic: () => void
  onUnderline: () => void
  onStrike: () => void
  onBullet: () => void
  onNumbered: () => void
  onQuote: () => void
  onOutdent: () => void
  onIndent: () => void
  onInsertLink: () => void
  onInsertImage: () => void
  onClearFormat: () => void
  onToggleTemplates: () => void
  onInsertMergeField: (token: string) => void
}

/**
 * Renders only the `role="toolbar"` formatting button row.
 * Rendered inside ComposerBody's border group box so it shares the rounded container with the textarea.
 */
export function ComposerToolbar({
  undoDepth,
  redoDepth,
  onUndo,
  onRedo,
  onBold,
  onItalic,
  onUnderline,
  onStrike,
  onBullet,
  onNumbered,
  onQuote,
  onOutdent,
  onIndent,
  onInsertLink,
  onInsertImage,
  onClearFormat,
}: ComposerToolbarProps) {
  const t = useTranslations()

  return (
    <div
      role="toolbar"
      className="flex flex-wrap items-center gap-0.5 px-1 py-1 border-b border-fg/8 bg-fg/[0.045]"
    >
      <FormatToolBtn onClick={onUndo} disabled={undoDepth === 0} title={t.email.formatUndo}>
        <Undo2 size={16} strokeWidth={2} aria-hidden />
      </FormatToolBtn>
      <FormatToolBtn onClick={onRedo} disabled={redoDepth === 0} title={t.email.formatRedo}>
        <Redo2 size={16} strokeWidth={2} aria-hidden />
      </FormatToolBtn>
      <ToolbarDivider />
      <FormatToolBtn onClick={onBold} title={t.email.formatBold}>
        <Bold size={16} strokeWidth={2.25} aria-hidden />
      </FormatToolBtn>
      <FormatToolBtn onClick={onItalic} title={t.email.formatItalic}>
        <Italic size={16} strokeWidth={2.25} aria-hidden />
      </FormatToolBtn>
      <FormatToolBtn onClick={onUnderline} title={t.email.formatUnderline}>
        <Underline size={16} strokeWidth={2} aria-hidden />
      </FormatToolBtn>
      <FormatToolBtn onClick={onStrike} title={t.email.formatStrikethrough}>
        <Strikethrough size={16} strokeWidth={2} aria-hidden />
      </FormatToolBtn>
      <ToolbarDivider />
      <FormatToolBtn onClick={onBullet} title={t.email.formatBulletList}>
        <List size={16} strokeWidth={2} aria-hidden />
      </FormatToolBtn>
      <FormatToolBtn onClick={onNumbered} title={t.email.formatNumberedList}>
        <ListOrdered size={16} strokeWidth={2} aria-hidden />
      </FormatToolBtn>
      <FormatToolBtn onClick={onQuote} title={t.email.formatQuote}>
        <TextQuote size={16} strokeWidth={2} aria-hidden />
      </FormatToolBtn>
      <ToolbarDivider />
      <FormatToolBtn onClick={onOutdent} title={t.email.formatOutdent}>
        <IndentDecrease size={16} strokeWidth={2} aria-hidden />
      </FormatToolBtn>
      <FormatToolBtn onClick={onIndent} title={t.email.formatIndent}>
        <IndentIncrease size={16} strokeWidth={2} aria-hidden />
      </FormatToolBtn>
      <ToolbarDivider />
      <FormatToolBtn onClick={onInsertLink} title={t.email.formatInsertLink}>
        <Link2 size={16} strokeWidth={2} aria-hidden />
      </FormatToolBtn>
      <FormatToolBtn onClick={onInsertImage} title={t.email.formatInsertImage}>
        <ImageIcon size={16} strokeWidth={2} aria-hidden />
      </FormatToolBtn>
      <ToolbarDivider />
      <FormatToolBtn onClick={onClearFormat} title={t.email.formatClear}>
        <Eraser size={16} strokeWidth={2} aria-hidden />
      </FormatToolBtn>
    </div>
  )
}
