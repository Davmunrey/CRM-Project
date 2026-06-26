import { Loader2 } from 'lucide-react'
import { useTranslations } from '../../i18n'

interface SpinnerProps {
  className?: string
  size?: number
  label?: string
}

export function Spinner({ className = '', size = 20, label }: SpinnerProps) {
  const t = useTranslations()
  return (
    <span role="status" aria-label={label ?? t.common.loading} className={`inline-flex text-fg-muted ${className}`}>
      <Loader2 className="animate-spin" size={size} aria-hidden />
    </span>
  )
}
