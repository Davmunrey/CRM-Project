import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  className?: string
  size?: number
  label?: string
}

export function Spinner({ className = '', size = 20, label }: SpinnerProps) {
  return (
    <span role="status" aria-label={label ?? 'Loading'} className={`inline-flex text-fg-muted ${className}`}>
      <Loader2 className="animate-spin" size={size} aria-hidden />
    </span>
  )
}
