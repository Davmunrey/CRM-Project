import type { TextareaHTMLAttributes } from 'react'
import { forwardRef, useId } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const genId = useId()
    const taId = id ?? genId
    const errId = `${taId}-error`

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={taId} className="text-sm font-medium text-fg-muted">
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <textarea
          id={taId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          className={`
            focus-ring w-full rounded-xl border bg-surface-2 text-fg text-sm
            placeholder:text-fg-muted/80
            focus-visible:border-accent-500/50
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-base p-3 resize-none
            ${error ? 'border-danger/50' : 'border-border-subtle hover:border-border-strong'}
            ${className}
          `}
          rows={4}
          {...props}
        />
        {error && (
          <p id={errId} role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
