import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'link'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'btn-gradient text-fg font-semibold',
  secondary:
    'bg-surface-2/90 hover:bg-fg/6 border border-border-subtle hover:border-border-strong text-fg',
  ghost:
    'hover:bg-fg/6 text-fg-muted hover:text-fg',
  danger:
    'bg-danger/15 hover:bg-danger/25 border border-danger/30 hover:border-danger/50 text-danger hover:text-danger',
  /** @deprecated Use secondary - kept for API compatibility */
  outline:
    'border border-border-strong hover:border-accent-500/50 hover:bg-accent-500/10 text-fg-muted hover:text-fg',
  link:
    'underline-offset-4 hover:underline text-accent-500 hover:text-accent-400 px-0 py-0 min-h-0 rounded-none font-medium',
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-xs gap-1 rounded-full min-h-[28px]',
  sm: 'px-3.5 py-1.5 text-sm gap-1.5 rounded-full min-h-control',
  md: 'px-5 py-2 text-sm gap-2 rounded-full min-h-control',
  lg: 'px-6 py-2.5 text-base gap-2.5 rounded-full min-h-row',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isLink = variant === 'link'
  return (
    <button type="button"
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium
        transition duration-base ease-out-strong
        ${isLink ? '' : 'focus-ring active:scale-[0.97]'}
        disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={14} />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
