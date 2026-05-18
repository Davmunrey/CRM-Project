import { LS_KEYS } from '../utils/constants'
import type { AppSettings, UiDensity } from '../types'

export type ThemePreference = AppSettings['themePreference']
export type { UiDensity } from '../types'
export type ResolvedTheme = 'light' | 'dark'

export function normalizeUiDensity(value: unknown): UiDensity {
  return value === 'compact' ? 'compact' : 'comfortable'
}

/** Sets `data-density` on `<html>` for token-driven row/control sizing. */
export function applyUiDensity(density: unknown) {
  document.documentElement.dataset.density = normalizeUiDensity(density)
}

export function getInitialUiDensityFromStorage(): UiDensity {
  try {
    const raw = window.localStorage.getItem(LS_KEYS.settings)
    if (!raw) return 'comfortable'
    const parsed = JSON.parse(raw) as { state?: { settings?: Partial<AppSettings> } }
    return normalizeUiDensity(parsed?.state?.settings?.uiDensity)
  } catch {
    return 'comfortable'
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'light' || preference === 'dark') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolvedTheme = resolveTheme(preference)
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolvedTheme)
  root.style.colorScheme = resolvedTheme
  return resolvedTheme
}

export function getInitialThemePreferenceFromStorage(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(LS_KEYS.settings)
    if (!raw) return 'system'
    const parsed = JSON.parse(raw) as { state?: { settings?: Partial<AppSettings> } }
    const preference = parsed?.state?.settings?.themePreference
    return preference === 'light' || preference === 'dark' || preference === 'system'
      ? preference
      : 'system'
  } catch {
    return 'system'
  }
}
