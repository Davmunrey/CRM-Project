import type { HTMLAttributes, ReactNode } from 'react'

interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Rounded glass panel around controls (list/calendar style pages). */
  panel?: boolean
}

/**
 * Standard horizontal toolbar for list and data pages: search, filters, smart views, KPI actions.
 * Use `panel` everywhere these controls appear so spacing, glass surface, and elevation match (Contacts, Deals, Companies, Products, Automations, etc.).
 */
export function Toolbar({ children, className = '', panel = false, ...props }: ToolbarProps) {
  return (
    <div
      className={`flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4 ${
        panel ? 'glass px-4 py-3' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
