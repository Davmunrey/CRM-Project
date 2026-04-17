import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language, Translations } from './types'
import type { Activity, Company, Contact, CRMEmail, Deal } from '../types'
import type { AuthUser } from '../types/auth'
import {
  localizeActivities,
  localizeAuthUsers,
  localizeCompanies,
  localizeContacts,
  localizeCRMEmails,
  localizeDeals,
} from './localizeSeed'
import { es } from './es'
import { en } from './en'
import { pt } from './pt'
import { fr } from './fr'
import { de } from './de'
import { it } from './it'

export type { Language, Translations }

const translations: Record<Language, Translations> = { en, es, pt, fr, de, it }

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
}

export const LANGUAGE_FLAGS: Record<Language, string> = {
  en: '🇬🇧',
  es: '🇪🇸',
  pt: '🇧🇷',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
}

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'es', 'pt', 'fr', 'de', 'it']

/**
 * Resolve the initial UI language from the browser. Used only as the default
 * when no user preference has been persisted yet (first visit). Persisted
 * choices in `crm_language` always win via zustand persist rehydration.
 */
export function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en'
  const candidates: string[] = []
  if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages)
  if (navigator.language) candidates.push(navigator.language)
  for (const raw of candidates) {
    if (!raw) continue
    const base = raw.toLowerCase().split('-')[0] as Language
    if (SUPPORTED_LANGUAGES.includes(base)) return base
  }
  return 'en'
}

interface I18nState {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: detectBrowserLanguage(),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'crm_language' }
  )
)

/** Hook that returns the current translations object */
export function useTranslations(): Translations {
  const language = useI18nStore((s) => s.language)
  return translations[language]
}

/** Get translations outside of React (for stores, utils) */
export function getTranslations(): Translations {
  return translations[useI18nStore.getState().language]
}

/** Get date-fns locale for current language */
export function getDateLocale() {
  const lang = useI18nStore.getState().language
  // Dynamic import not needed — just return the key for date-fns
  return lang
}

export function useLocalizedContacts(contacts: Contact[]) {
  const language = useI18nStore((s) => s.language)
  return useMemo(() => localizeContacts(contacts, getTranslations()), [contacts, language])
}

export function useLocalizedCompanies(companies: Company[]) {
  const language = useI18nStore((s) => s.language)
  return useMemo(() => localizeCompanies(companies, getTranslations()), [companies, language])
}

export function useLocalizedDeals(deals: Deal[]) {
  const language = useI18nStore((s) => s.language)
  return useMemo(() => localizeDeals(deals, getTranslations()), [deals, language])
}

export function useLocalizedActivities(activities: Activity[]) {
  const language = useI18nStore((s) => s.language)
  return useMemo(() => localizeActivities(activities, getTranslations()), [activities, language])
}

export function useLocalizedCRMEmails(emails: CRMEmail[]) {
  const language = useI18nStore((s) => s.language)
  return useMemo(() => localizeCRMEmails(emails, getTranslations()), [emails, language])
}

export function useLocalizedOrgUsers(users: AuthUser[]) {
  const language = useI18nStore((s) => s.language)
  return useMemo(() => localizeAuthUsers(users, getTranslations()), [users, language])
}
