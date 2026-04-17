import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface DropdownMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
  /** Appended to the floating menu panel (e.g. z-index, max-height). */
  contentClassName?: string
}

/**
 * Dropdown anchored below trigger — backdrop closes on outside click / Escape.
 */
export function DropdownMenu({
  open,
  onOpenChange,
  trigger,
  children,
  align = 'end',
  className = '',
  contentClassName = '',
}: DropdownMenuProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  return (
    <div className={`relative ${className}`}>
      <div className="inline-flex">{trigger}</div>
      {open && (
        <>
          <button type="button"
            className="fixed inset-0 z-overlay cursor-default bg-transparent"
            aria-label="Close menu"
            onClick={() => onOpenChange(false)}
          />
          <div
            className={`absolute z-dropdown top-full mt-1 min-w-[200px] rounded-xl border border-border-subtle bg-surface-1 py-1 shadow-lg
              ${align === 'end' ? 'right-0' : 'left-0'} ${contentClassName}`.trim()}
            role="menu"
          >
            {children}
          </div>
        </>
      )}
    </div>
  )
}

interface DropdownMenuItemProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  destructive?: boolean
}

export function DropdownMenuItem({ children, onClick, disabled, destructive }: DropdownMenuItemProps) {
  return (
    <button type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`
        w-full text-left px-3 py-2 text-sm transition-colors
        ${destructive ? 'text-danger hover:bg-danger/10' : 'text-fg hover:bg-fg/[0.06]'}
        disabled:opacity-40 disabled:cursor-not-allowed
      `}
    >
      {children}
    </button>
  )
}
