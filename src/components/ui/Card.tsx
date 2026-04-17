import type { HTMLAttributes, ReactNode } from 'react'

type CardVariant = 'default' | 'muted' | 'accent'

const variantClasses: Record<CardVariant, string> = {
  default: 'glass border border-white/10',
  muted: 'bg-surface-2/95 border border-white/8',
  accent: 'bg-accent-500/10 border border-accent-500/25',
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  children?: ReactNode
}

export function Card({ variant = 'default', className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl shadow-float ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border-b border-white/6 px-6 py-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border-t border-white/6 px-6 py-4 ${className}`}>
      {children}
    </div>
  )
}
