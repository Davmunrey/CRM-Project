import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { DropdownMenu, DropdownMenuItem } from './DropdownMenu'
import { useSettingsStore } from '../../store/settingsStore'
import { useTranslations } from '../../i18n'
import type { ThemePreference } from '../../lib/theme'

export type ThemeSwitcherVariant = 'floating' | 'inline'

export interface ThemeSwitcherProps {
  variant?: ThemeSwitcherVariant
  /** Extra classes on the outer wrapper (e.g. `fixed top-4 right-20 z-modal` for auth shell). */
  className?: string
  align?: 'start' | 'end'
}

/**
 * Theme preference control (light / dark / system). Persists via `useSettingsStore`;
 * `App` applies classes on `document.documentElement`.
 */
export function ThemeSwitcher({ variant = 'inline', className = '', align = 'end' }: ThemeSwitcherProps) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    () => useSettingsStore.getState().settings.themePreference ?? 'system',
  )

  useEffect(() => {
    return useSettingsStore.subscribe((s) => {
      setThemePreference(s.settings.themePreference ?? 'system')
    })
  }, [])

  const wrapper =
    variant === 'floating'
      ? `fixed top-4 right-20 z-modal ${className}`.trim()
      : `relative inline-block ${className}`.trim()

  return (
    <div className={wrapper}>
      <DropdownMenu
        open={open}
        onOpenChange={setOpen}
        align={align}
        trigger={(
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={t.settings.theme}
            title={t.settings.theme}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-fg/12 bg-surface-1/80 backdrop-blur-md px-2.5 py-2 text-fg-muted hover:text-fg hover:border-fg/20 hover:bg-surface-1 transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
          >
            {themePreference === 'light' ? (
              <Sun size={18} aria-hidden />
            ) : themePreference === 'dark' ? (
              <Moon size={18} aria-hidden />
            ) : (
              <Monitor size={18} aria-hidden />
            )}
          </button>
        )}
      >
        {(['light', 'dark', 'system'] as const).map((pref) => (
          <DropdownMenuItem
            key={pref}
            onClick={() => {
              useSettingsStore.getState().updateThemePreference(pref)
              setOpen(false)
            }}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                {pref === 'light' ? <Sun size={14} aria-hidden /> : pref === 'dark' ? <Moon size={14} aria-hidden /> : <Monitor size={14} aria-hidden />}
                {pref === 'light'
                  ? t.settings.themeLight
                  : pref === 'dark'
                    ? t.settings.themeDark
                    : t.settings.themeSystem}
              </span>
              {themePreference === pref ? <Check size={14} className="text-accent-400 shrink-0" aria-hidden /> : null}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenu>
    </div>
  )
}
