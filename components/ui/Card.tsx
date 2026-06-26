import type { HTMLAttributes, ReactNode } from 'react'
import { createContext, useContext } from 'react'

type CardVariant = 'default' | 'muted' | 'accent'
export type CardPadding = 'sm' | 'md' | 'lg'

const variantClasses: Record<CardVariant, string> = {
  default: 'glass border border-border-subtle',
  muted: 'bg-surface-2/95 border border-border-subtle',
  accent: 'bg-accent-500/10 border border-accent-500/25',
}

const bodyPadding: Record<CardPadding, string> = {
  sm: 'px-4 py-4',
  md: 'px-6 py-5',
  lg: 'px-8 py-6',
}

const headerFooterPadding: Record<CardPadding, string> = {
  sm: 'px-4 py-3',
  md: 'px-6 py-4',
  lg: 'px-8 py-4',
}

const CardPaddingContext = createContext<CardPadding>('md')

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  /** Padding for CardHeader, CardBody, CardFooter */
  padding?: CardPadding
  children?: ReactNode
}

export function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <CardPaddingContext.Provider value={padding}>
      <div className={`rounded-2xl shadow-float ${variantClasses[variant]} ${className}`} {...props}>
        {children}
      </div>
    </CardPaddingContext.Provider>
  )
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  const pad = useContext(CardPaddingContext)
  return (
    <div className={`border-b border-border-subtle flex-shrink-0 ${headerFooterPadding[pad]} ${className}`}>
      {children}
    </div>
  )
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  const pad = useContext(CardPaddingContext)
  return <div className={`${bodyPadding[pad]} ${className}`}>{children}</div>
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  const pad = useContext(CardPaddingContext)
  return (
    <div className={`border-t border-border-subtle ${headerFooterPadding[pad]} ${className}`}>
      {children}
    </div>
  )
}
