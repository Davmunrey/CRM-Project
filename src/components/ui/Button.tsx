import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
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
    'btn-gradient text-white font-semibold',
  secondary:
    'bg-surface-2/90 hover:bg-white/6 border border-white/10 hover:border-white/15 text-fg',
  ghost:
    'hover:bg-white/6 text-fg-muted hover:text-fg',
  danger:
    'bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300',
  /** @deprecated Use secondary — kept for API compatibility */
  outline:
    'border border-white/12 hover:border-accent-500/50 hover:bg-accent-500/10 text-fg-muted hover:text-fg',
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-xs gap-1 rounded-full min-h-[28px]',
  sm: 'px-3.5 py-1.5 text-sm gap-1.5 rounded-full min-h-[32px]',
  md: 'px-5 py-2 text-sm gap-2 rounded-full min-h-[40px]',
  lg: 'px-6 py-2.5 text-base gap-2.5 rounded-full min-h-[44px]',
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
  return (
    <button type="button"
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-base ease-out
        focus-ring
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
