import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api'
import { LS_KEYS } from '../utils/constants'
import { createDefaultNavigationPreferences } from '../config/navigationDefaults'
import { sanitizeNavigationPreferences } from '../utils/navigationSanitizer'
import type { NavigationPreferences } from '../types/navigation'

interface NavigationPrefsState {
  preferences: NavigationPreferences
  loaded: boolean
  loading: boolean
  error: string | null
  loadPreferences: () => Promise<void>
  updatePreferences: (updater: (current: NavigationPreferences) => NavigationPreferences) => Promise<void>
  resetPreferences: () => Promise<void>
}

const DEFAULT_PREFS = createDefaultNavigationPreferences()

export const useNavigationPrefsStore = create<NavigationPrefsState>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_PREFS,
      loaded: false,
      loading: false,
      error: null,

      loadPreferences: async () => {
        if (get().loading) return
        set({ loading: true, error: null })
        try {
          const res = await api.get<{ navigation: Partial<NavigationPreferences> }>('/preferences/me')
          const merged = sanitizeNavigationPreferences({ ...DEFAULT_PREFS, ...res.navigation })
          set({ preferences: merged, loaded: true })
        } catch {
          set({ loaded: true })
        } finally {
          set({ loading: false })
        }
      },

      updatePreferences: async (updater) => {
        const next = sanitizeNavigationPreferences(updater(get().preferences))
        set({ preferences: next })
        api.patch('/preferences/me/navigation', next).catch(() => undefined)
      },

      resetPreferences: async () => {
        await get().updatePreferences(() => createDefaultNavigationPreferences())
      },
    }),
    { name: `${LS_KEYS.settings}_navigation_prefs` },
  ),
)
