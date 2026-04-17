import type { HTMLAttributes, ReactNode } from 'react'

interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/**
 * Standard horizontal toolbar for list pages: search, filters, view toggles, bulk actions.
 */
export function Toolbar({ children, className = '', ...props }: ToolbarProps) {
  return (
    <div
      className={`flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
