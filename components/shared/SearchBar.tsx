import { Search, X } from 'lucide-react'
import { Input } from '../ui/Input'
import { useTranslations } from '../../i18n'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({ value, onChange, placeholder = 'Buscar...', className = '' }: SearchBarProps) {
  const t = useTranslations()
  const effectivePlaceholder = placeholder === 'Buscar...' ? t.common.searchPlaceholder : placeholder
  return (
    <div className={`relative ${className}`}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={effectivePlaceholder}
        leftIcon={<Search size={14} />}
        rightIcon={
          value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-fg-subtle hover:text-fg-muted pointer-events-auto rounded-md p-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-500"
              aria-label={t.common.close}
            >
              <X size={14} />
            </button>
          ) : undefined
        }
      />
    </div>
  )
}
