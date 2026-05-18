import type { ReactNode } from 'react'
import { EmptyState } from '../ui/EmptyState'

export interface PanelEmptyProps {
  icon?: ReactNode
  title?: string
  primary: string
  secondary?: string
  density?: 'default' | 'compact'
}

/** Panel empty state - delegates to unified `ui/EmptyState`. */
export function PanelEmpty({ icon, title, primary, secondary, density = 'default' }: PanelEmptyProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      primary={primary}
      secondary={secondary}
      density={density}
    />
  )
}
