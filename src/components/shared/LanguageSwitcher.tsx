import { useEffect, useState } from 'react'
import { Check, Globe } from 'lucide-react'
import {
  LANGUAGE_FLAGS,
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  detectBrowserLanguage,
  useI18nStore,
  useTranslations,
} from '../../i18n'
import type { Language } from '../../i18n'
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu'

type LanguageSwitcherVariant = 'floating' | 'inline'

interface LanguageSwitcherProps {
  /** `floating` pins to top-right of the viewport; `inline` flows with siblings. */
  variant?: LanguageSwitcherVariant
  className?: string
  size?: 'sm' | 'md'
  /** Extra classes on the dropdown panel (e.g. z-index). */
  menuClassName?: string
}

const sizeClasses = {
  sm: 'px-2.5 py-2 text-sm gap-2',
  md: 'px-3 py-2.5 text-sm gap-2',
} as const

const globeSizes = { sm: 16 as const, md: 18 as const }

/**
 * Globe + native language name on the trigger (avoids “GB EN” regional-indicator glitches on Windows).
 * Menu rows keep flags + full names for quick scanning.
 */
export function LanguageSwitcher({
  variant = 'inline',
  className = '',
  size = 'sm',
  menuClassName = '',
}: LanguageSwitcherProps) {
  const t = useTranslations()
  const storedLanguage = useI18nStore((s) => s.language)
  const languageMode = useI18nStore((s) => s.languageMode ?? 'manual')
  const setLanguage = useI18nStore((s) => s.setLanguage)
  const [open, setOpen] = useState(false)
  const [browserTick, setBrowserTick] = useState(0)

  useEffect(() => {
    if (languageMode !== 'browser') return
    const onChange = () => setBrowserTick((n) => n + 1)
    window.addEventListener('languagechange', onChange)
    return () => window.removeEventListener('languagechange', onChange)
  }, [languageMode])

  const displayLanguage = languageMode === 'browser' ? detectBrowserLanguage() : storedLanguage
  void browserTick

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const wrapperPosition = variant === 'floating' ? 'fixed top-4 right-4 z-modal' : 'relative inline-block'

  return (
    <div className={`${wrapperPosition} ${className}`.trim()}>
      <DropdownMenu
        open={open}
        onOpenChange={setOpen}
        align="end"
        contentClassName={`min-w-[200px] ${menuClassName}`.trim()}
        trigger={(
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={t.settings.language}
            title={t.settings.language}
            onClick={() => setOpen((v) => !v)}
            className={`inline-flex items-center rounded-xl border border-fg/12 bg-surface-1/80 backdrop-blur-md
              text-fg hover:border-fg/20 hover:bg-surface-1 transition-colors
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500
              ${sizeClasses[size]}`}
          >
            <Globe size={globeSizes[size]} className="shrink-0 text-fg-muted" aria-hidden />
            <span className="truncate max-w-[9rem] font-medium text-fg">{LANGUAGE_LABELS[displayLanguage]}</span>
          </button>
        )}
      >
        {SUPPORTED_LANGUAGES.map((lang: Language) => {
          const selected = lang === displayLanguage
          return (
            <DropdownMenuItem
              key={lang}
              onClick={() => {
                setLanguage(lang)
                setOpen(false)
              }}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="text-base leading-none">
                    {LANGUAGE_FLAGS[lang]}
                  </span>
                  <span>{LANGUAGE_LABELS[lang]}</span>
                </span>
                {selected ? <Check size={14} className="text-accent-400 shrink-0" aria-hidden /> : null}
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenu>
    </div>
  )
}
