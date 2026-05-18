import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** When false, only subtitle/actions render (Topbar already shows the page title). */
  showTitle?: boolean
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ showTitle = true, title, subtitle, actions, className = '' }: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 ${className}`}
    >
      <div className="min-w-0">
        {showTitle ? (
          <h1 className="text-lg font-semibold text-fg tracking-tight truncate">{title}</h1>
        ) : (
          <h1 className="sr-only">{title}</h1>
        )}
        {subtitle && <p className="text-sm text-fg-subtle mt-0.5">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  )
}
