import type { InputHTMLAttributes, ReactNode } from 'react'
import { forwardRef, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  /** Interactive control (e.g. password visibility); not pointer-events-none */
  rightAction?: ReactNode
  helpText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, rightAction, helpText, className = '', id, ...props }, ref) => {
    const genId = useId()
    const inputId = id ?? genId
    const errId = `${inputId}-error`
    const helpId = `${inputId}-help`
    const describedBy = [error ? errId : '', helpText && !error ? helpId : ''].filter(Boolean).join(' ') || undefined

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-fg-muted">
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-fg-muted">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`
              focus-ring w-full rounded-xl border bg-surface-2 text-fg text-sm
              placeholder:text-fg-muted/80
              focus-visible:border-accent-500/50
              hover:border-border-strong
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-base
              min-h-control
              ${error ? 'border-danger/50 focus-visible:ring-danger/30' : 'border-border-subtle'}
              ${leftIcon ? 'pl-9' : 'pl-3'}
              ${rightIcon || rightAction ? 'pr-10' : 'pr-3'}
              py-2
              ${className}
            `}
            {...props}
          />
          {rightIcon && !rightAction && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-fg-muted">
              {rightIcon}
            </div>
          )}
          {rightAction && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-1">
              {rightAction}
            </div>
          )}
        </div>
        {error && (
          <p id={errId} role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
        {helpText && !error && (
          <p id={helpId} className="text-xs text-fg-muted">
            {helpText}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
