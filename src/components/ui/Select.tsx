import type { SelectHTMLAttributes } from 'react'
import { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, options, placeholder, className = '', id, ...props }, ref) => {
    const genId = useId()
    const selectId = id ?? genId
    const errId = `${selectId}-error`
    const hintId = `${selectId}-hint`
    const describedBy = [hint ? hintId : '', error ? errId : ''].filter(Boolean).join(' ') || undefined

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-fg-muted">
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`
              w-full appearance-none rounded-xl border bg-surface-2 text-fg text-sm
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 focus-visible:border-accent-500/50
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-base pl-3 pr-8 py-2 hover:border-white/15
              ${error ? 'border-red-500/50 focus-visible:ring-red-500/30' : 'border-white/10'}
              ${className}
            `}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none"
          />
        </div>
        {hint && (
          <p id={hintId} className="text-xs text-fg-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errId} role="alert" className="text-xs text-red-400">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
