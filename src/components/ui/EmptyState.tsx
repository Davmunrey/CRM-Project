import type { ReactNode } from 'react'
import { Button } from './Button'

export type EmptyStateDensity = 'default' | 'compact'

interface EmptyStateProps {
  icon?: ReactNode
  title?: string
  /** Main page empty pattern */
  description?: string
  /** Panel / sidebar pattern — shown when `description` omitted */
  primary?: string
  secondary?: string
  density?: EmptyStateDensity
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Unified empty state for full pages and narrow panels.
 * Use `title` + `description` + optional `action` for main areas;
 * use `primary` (+ optional `title`, `secondary`) for panel placeholders.
 */
export function EmptyState({
  icon,
  title,
  description,
  primary,
  secondary,
  density = 'default',
  action,
}: EmptyStateProps) {
  const py = density === 'compact' ? 'py-10' : 'py-16'
  const mainText = description ?? primary ?? ''
  const isPanel = !description && !!primary

  const iconWrap = isPanel ? 'w-12 h-12 rounded-xl mb-3' : 'w-16 h-16 rounded-2xl mb-4'

  return (
    <div className={`flex flex-col items-center justify-center ${py} px-4 text-center`}>
      {icon && (
        <div
          className={`${iconWrap} bg-fg/[0.06] border border-border-subtle flex items-center justify-center text-fg-muted [&_svg]:mx-auto`}
          aria-hidden
        >
          {icon}
        </div>
      )}
      {title && (
        <h3 className={`font-semibold text-fg mb-1 ${isPanel ? 'text-sm' : 'text-base'}`}>{title}</h3>
      )}
      <p className={`text-fg-muted max-w-sm leading-relaxed ${isPanel ? 'text-sm' : 'text-sm mb-6'}`}>
        {mainText}
      </p>
      {secondary && <p className="text-xs text-fg-subtle mt-1.5 max-w-[220px]">{secondary}</p>}
      {action && description && (
        <Button type="button" onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
      {action && !description && (
        <Button type="button" onClick={action.onClick} className="mt-3">
          {action.label}
        </Button>
      )}
    </div>
  )
}
