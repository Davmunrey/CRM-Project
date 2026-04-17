import { useEffect, useRef, useState } from 'react'
import { Globe, Check } from 'lucide-react'
import {
  LANGUAGE_FLAGS,
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  useI18nStore,
  useTranslations,
} from '../../i18n'
import type { Language } from '../../i18n'

type LanguageSwitcherVariant = 'floating' | 'inline'

interface LanguageSwitcherProps {
  /** `floating` pins to top-right of the viewport; `inline` flows with siblings. */
  variant?: LanguageSwitcherVariant
  className?: string
}

/**
 * Compact globe-style language picker. Designed to sit unobtrusively in the
 * corner of auth screens without dominating the layout the way a full Select
 * control does. Keeps full i18n coverage — flags are decorative, every option
 * carries its native language label.
 */
export function LanguageSwitcher({ variant = 'inline', className = '' }: LanguageSwitcherProps) {
  const t = useTranslations()
  const language = useI18nStore((s) => s.language)
  const setLanguage = useI18nStore((s) => s.setLanguage)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const wrapperPosition = variant === 'floating'
    ? 'fixed top-4 right-4 z-40'
    : 'relative inline-block'

  return (
    <div ref={containerRef} className={`${wrapperPosition} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.settings.language}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t.settings.language}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                   border border-fg/12 bg-surface-1/80 backdrop-blur-md
                   text-fg-muted hover:text-fg hover:border-fg/20 hover:bg-surface-1
                   text-xs font-medium transition-colors
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
      >
        <Globe size={14} aria-hidden />
        <span className="uppercase tracking-wide">{language}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t.settings.language}
          className="absolute right-0 mt-2 min-w-[180px] rounded-xl border border-fg/10
                     bg-surface-1/95 backdrop-blur-md shadow-float py-1 z-modal"
        >
          {SUPPORTED_LANGUAGES.map((lang: Language) => {
            const selected = lang === language
            return (
              <li key={lang}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setLanguage(lang)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left
                              transition-colors hover:bg-fg/6
                              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-500
                              ${selected ? 'text-fg font-medium' : 'text-fg-muted'}`}
                >
                  <span aria-hidden className="text-base leading-none">{LANGUAGE_FLAGS[lang]}</span>
                  <span className="flex-1">{LANGUAGE_LABELS[lang]}</span>
                  {selected && <Check size={14} className="text-accent-400" aria-hidden />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
