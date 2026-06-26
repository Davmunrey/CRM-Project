import type { HTMLAttributes, ReactNode } from 'react'

interface ListRowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Show bottom border */
  bordered?: boolean
  /** Interactive hover surface */
  clickable?: boolean
}

export function ListRow({
  children,
  bordered = true,
  clickable = true,
  className = '',
  ...props
}: ListRowProps) {
  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 min-h-row
        ${bordered ? 'border-b border-border-subtle' : ''}
        ${clickable ? 'cursor-pointer hover:bg-fg/[0.04] transition-colors' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}
