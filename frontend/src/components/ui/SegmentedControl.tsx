import type { ReactNode } from 'react'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
}

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentOption<T>[]
  className?: string
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div className={`inline-flex rounded-xl border border-border-subtle bg-surface-2/80 p-1 gap-0.5 ${className}`} role="group">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus-ring
              ${active ? 'bg-accent-600/20 text-fg border border-accent-500/30' : 'text-fg-muted hover:text-fg hover:bg-fg/[0.04]'}
            `}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
