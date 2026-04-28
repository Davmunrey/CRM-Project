import { useEffect, useMemo, useState } from 'react'
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

export type LanguageMode = 'manual' | 'browser'

const translations: Record<Language, Translations> = { en, es, pt, fr, de, it }
const pseudoEnabled = import.meta.env.VITE_I18N_PSEUDO === '1'

function pseudoize(value: unknown): unknown {
  if (!pseudoEnabled) return value
  if (typeof value === 'string') return `[!! ${value} !!]`
  if (Array.isArray(value)) return value.map((v) => pseudoize(v))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = pseudoize(v)
    }
    return out
  }
  return value
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
}

export const LANGUAGE_FLAGS: Record<Language, string> = {
  /** US flag reads as “EN” more reliably than 🇬🇧 (often shown as “GB” without color emoji). */
  en: '🇺🇸',
  es: '🇪🇸',
  pt: '🇧🇷',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
}

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'es', 'pt', 'fr', 'de', 'it']

/**
 * Resolve the initial UI language from the browser. Used when `languageMode` is `browser`,
 * and as the default `language` value on first visit before persist rehydrates.
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
  /** When omitted (legacy persisted state), treated as `manual`. */
  languageMode?: LanguageMode
  setLanguage: (lang: Language) => void
  setLanguageMode: (mode: LanguageMode) => void
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: detectBrowserLanguage(),
      languageMode: 'browser',
      setLanguage: (language) => set({ language, languageMode: 'manual' }),
      setLanguageMode: (languageMode) => set({ languageMode }),
    }),
    { name: 'crm_language' },
  ),
)

function resolveEffectiveLanguage(): Language {
  const { language, languageMode } = useI18nStore.getState()
  const mode = languageMode ?? 'manual'
  return mode === 'browser' ? detectBrowserLanguage() : language
}

/** Hook that returns the current translations object */
export function useTranslations(): Translations {
  const language = useI18nStore((s) => s.language)
  const languageMode = useI18nStore((s) => s.languageMode ?? 'manual')
  const [browserTick, setBrowserTick] = useState(0)

  useEffect(() => {
    if (languageMode !== 'browser') return
    const onChange = () => setBrowserTick((n) => n + 1)
    window.addEventListener('languagechange', onChange)
    return () => window.removeEventListener('languagechange', onChange)
  }, [languageMode])

  return useMemo(() => {
    void browserTick
    const effective = languageMode === 'browser' ? detectBrowserLanguage() : language
    return pseudoize(translations[effective]) as Translations
  }, [language, languageMode, browserTick])
}

/** BCP-47 base language used for labels (respects browser mode + `languagechange`). */
export function useUiLanguage(): Language {
  const stored = useI18nStore((s) => s.language)
  const languageMode = useI18nStore((s) => s.languageMode ?? 'manual')
  const [browserTick, setBrowserTick] = useState(0)

  useEffect(() => {
    if (languageMode !== 'browser') return
    const onChange = () => setBrowserTick((n) => n + 1)
    window.addEventListener('languagechange', onChange)
    return () => window.removeEventListener('languagechange', onChange)
  }, [languageMode])

  return useMemo(() => {
    void browserTick
    return languageMode === 'browser' ? detectBrowserLanguage() : stored
  }, [stored, languageMode, browserTick])
}

/** Get translations outside of React (for stores, utils) */
export function getTranslations(): Translations {
  return translations[resolveEffectiveLanguage()]
}

/** Get date-fns locale for current language */
export function getDateLocale() {
  return resolveEffectiveLanguage()
}

export function useLocalizedContacts(contacts: Contact[]) {
  const t = useTranslations()
  return useMemo(() => localizeContacts(contacts, t), [contacts, t])
}

export function useLocalizedCompanies(companies: Company[]) {
  const t = useTranslations()
  return useMemo(() => localizeCompanies(companies, t), [companies, t])
}

export function useLocalizedDeals(deals: Deal[]) {
  const t = useTranslations()
  return useMemo(() => localizeDeals(deals, t), [deals, t])
}

export function useLocalizedActivities(activities: Activity[]) {
  const t = useTranslations()
  return useMemo(() => localizeActivities(activities, t), [activities, t])
}

export function useLocalizedCRMEmails(emails: CRMEmail[]) {
  const t = useTranslations()
  return useMemo(() => localizeCRMEmails(emails, t), [emails, t])
}

export function useLocalizedOrgUsers(users: AuthUser[]) {
  const t = useTranslations()
  return useMemo(() => localizeAuthUsers(users, t), [users, t])
}
