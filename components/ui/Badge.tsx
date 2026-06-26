import type { ReactNode } from 'react'

/** Semantic + small set of decorative variants (all token-based, no raw palette). */
export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'accent'
  /** Decorative - still uses accent scale */
  | 'violet'
  | 'orange'

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success/15 text-success ring-success/25',
  warning: 'bg-warning/15 text-warning ring-warning/25',
  danger: 'bg-danger/15 text-danger ring-danger/25',
  info: 'bg-info/15 text-info ring-info/25',
  neutral: 'bg-surface-2 text-fg-muted ring-fg/12',
  accent: 'bg-accent-500/15 text-accent-400 ring-accent-500/25',
  violet: 'bg-accent-600/18 text-accent-300 ring-accent-600/30',
  orange: 'bg-warning/18 text-warning ring-warning/30',
}

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
}

export function Badge({ children, variant = 'neutral', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset
        ${variantClasses[variant]}
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}
      `}
    >
      {children}
    </span>
  )
}
