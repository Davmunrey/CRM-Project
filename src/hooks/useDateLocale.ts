import { useEffect, useState } from 'react'
import type { Locale } from 'date-fns'
import { useI18nStore } from '../i18n'
import { getLoadedDateFnsLocale, loadDateFnsLocale } from '../lib/dateFnsLocale'

/**
 * Date-fns `Locale` for the active UI language. Loads non-English locales on demand.
 */
export function useDateLocale(): Locale {
  const language = useI18nStore((s) => s.language)
  const [locale, setLocale] = useState<Locale>(() => getLoadedDateFnsLocale())

  useEffect(() => {
    let cancelled = false
    void loadDateFnsLocale(language).then((l) => {
      if (!cancelled) setLocale(l)
    })
    return () => {
      cancelled = true
    }
  }, [language])

  return locale
}
