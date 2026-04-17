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
                   border border-white/12 bg-[#111220]/80 backdrop-blur-md
                   text-slate-300 hover:text-white hover:border-white/20 hover:bg-[#111220]
                   text-xs font-medium transition-colors
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        <Globe size={14} aria-hidden />
        <span className="uppercase tracking-wide">{language}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t.settings.language}
          className="absolute right-0 mt-2 min-w-[180px] rounded-xl border border-white/10
                     bg-[#111220]/95 backdrop-blur-md shadow-float py-1 z-50"
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
                              transition-colors hover:bg-white/6
                              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500
                              ${selected ? 'text-white font-medium' : 'text-slate-300'}`}
                >
                  <span aria-hidden className="text-base leading-none">{LANGUAGE_FLAGS[lang]}</span>
                  <span className="flex-1">{LANGUAGE_LABELS[lang]}</span>
                  {selected && <Check size={14} className="text-brand-400" aria-hidden />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
