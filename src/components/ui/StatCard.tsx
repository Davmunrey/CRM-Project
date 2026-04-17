import type { ReactNode } from 'react'

export type StatCardAccent = 'accent' | 'success' | 'warning' | 'danger' | 'info'

interface StatCardProps {
  title: string
  value: ReactNode
  subtitle?: string
  icon: ReactNode
  iconBg?: string
  trend?: {
    value: string
    up: boolean
  }
  accent?: StatCardAccent
}

const accentMap: Record<StatCardAccent, { icon: string; glow: string }> = {
  accent: { icon: 'bg-accent-600/15 text-accent-400', glow: 'group-hover:shadow-brand-sm' },
  success: { icon: 'bg-success/15 text-success', glow: '' },
  warning: { icon: 'bg-warning/15 text-warning', glow: '' },
  danger: { icon: 'bg-danger/15 text-danger', glow: '' },
  info: { icon: 'bg-info/15 text-info', glow: '' },
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  trend,
  accent = 'accent',
}: StatCardProps) {
  const ac = accentMap[accent]
  return (
    <div
      className={`glass rounded-2xl border border-border-subtle p-5 glass-hover group cursor-default transition-all duration-base ${ac.glow}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-fg-muted uppercase tracking-wide mb-2">{title}</p>
          <p className="text-2xl font-bold text-fg truncate stat-number">{value}</p>
          {subtitle && <p className="text-xs text-fg-muted mt-1.5">{subtitle}</p>}
          {trend && (
            <div
              className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium
              ${trend.up ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger'}`}
            >
              <span>{trend.up ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        <div
          className={`${iconBg ?? ac.icon} rounded-xl p-3 flex-shrink-0 ml-3 transition-transform duration-base group-hover:scale-110`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}
