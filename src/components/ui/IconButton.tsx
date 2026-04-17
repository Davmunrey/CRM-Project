import type { ButtonHTMLAttributes, ReactNode } from 'react'

type IconButtonVariant = 'ghost' | 'subtle'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  'aria-label': string
  icon: ReactNode
  variant?: IconButtonVariant
}

const variantClasses: Record<IconButtonVariant, string> = {
  ghost:
    'text-fg-muted hover:text-fg hover:bg-fg/8',
  subtle:
    'text-fg-muted hover:bg-fg/6',
}

export function IconButton({
  icon,
  variant = 'ghost',
  className = '',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={`
        inline-flex items-center justify-center rounded-lg p-2
        transition-colors duration-base ease-out
        focus-ring
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${className}
      `}
      {...props}
    >
      {icon}
    </button>
  )
}
