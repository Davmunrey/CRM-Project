import type { Locale } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import type { Language } from '../i18n'

let cachedLocale: Locale = enUS
let cachedLang: Language | null = null

export function getLoadedDateFnsLocale(): Locale {
  return cachedLocale
}

export async function loadDateFnsLocale(lang: Language): Promise<Locale> {
  if (cachedLang === lang) return cachedLocale
  switch (lang) {
    case 'es': {
      const { es } = await import('date-fns/locale/es')
      cachedLocale = es
      break
    }
    case 'pt': {
      const { ptBR } = await import('date-fns/locale/pt-BR')
      cachedLocale = ptBR
      break
    }
    case 'fr': {
      const { fr } = await import('date-fns/locale/fr')
      cachedLocale = fr
      break
    }
    case 'de': {
      const { de } = await import('date-fns/locale/de')
      cachedLocale = de
      break
    }
    case 'it': {
      const { it } = await import('date-fns/locale/it')
      cachedLocale = it
      break
    }
    default:
      cachedLocale = enUS
  }
  cachedLang = lang
  return cachedLocale
}
