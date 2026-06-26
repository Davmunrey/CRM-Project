import type { ReactNode } from 'react'

interface PillToggleProps {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  children: ReactNode
  className?: string
  'aria-label': string
}

export function PillToggle({ pressed, onPressedChange, children, className = '', 'aria-label': ariaLabel }: PillToggleProps) {
  return (
    <button type="button"
      aria-pressed={pressed}
      aria-label={ariaLabel}
      onClick={() => onPressedChange(!pressed)}
      className={`
        inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-ring
        ${pressed
          ? 'bg-accent-600/20 text-fg border border-accent-500/40'
          : 'bg-surface-2 text-fg-muted border border-border-subtle hover:bg-fg/[0.04]'}
        ${className}
      `}
    >
      {children}
    </button>
  )
}
