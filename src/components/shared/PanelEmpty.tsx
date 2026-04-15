import type { ReactNode } from 'react'

export interface PanelEmptyProps {
  /** Decorative icon (e.g. Lucide); wrapped for spacing */
  icon?: ReactNode
  /** Optional short heading above the message */
  title?: string
  primary: string
  secondary?: string
  /** `compact` for narrow side panels; `default` for main areas */
  density?: 'default' | 'compact'
}

/**
 * Empty / placeholder state for panels, sidebars, and split views.
 * Keeps vertical rhythm aligned across Inbox, Sequences, Templates, etc.
 */
export function PanelEmpty({ icon, title, primary, secondary, density = 'default' }: PanelEmptyProps) {
  const py = density === 'compact' ? 'py-10' : 'py-12'
  return (
    <div className={`flex flex-col items-center justify-center ${py} px-4 text-center`}>
      {icon && (
        <div className="mb-3 text-slate-500 [&_svg]:mx-auto" aria-hidden>
          {icon}
        </div>
      )}
      {title ? <p className="text-sm font-medium text-slate-400 mb-1">{title}</p> : null}
      <p className="text-sm text-slate-500 leading-relaxed">{primary}</p>
      {secondary ? <p className="text-xs text-slate-600 mt-1.5 max-w-[220px]">{secondary}</p> : null}
    </div>
  )
}
