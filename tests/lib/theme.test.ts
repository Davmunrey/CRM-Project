import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyUiDensity,
  getInitialUiDensityFromStorage,
  normalizeUiDensity,
} from '../../src/lib/theme'
import { useSettingsStore } from '../../src/store/settingsStore'

describe('lib/theme - ui density', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-density')
  })

  it('normalizes unknown values to comfortable', () => {
    expect(normalizeUiDensity('compact')).toBe('compact')
    expect(normalizeUiDensity('comfortable')).toBe('comfortable')
    expect(normalizeUiDensity('small')).toBe('comfortable')
    expect(normalizeUiDensity(undefined)).toBe('comfortable')
    expect(normalizeUiDensity(null)).toBe('comfortable')
  })

  it('applies data-density on html element', () => {
    applyUiDensity('compact')
    expect(document.documentElement.dataset.density).toBe('compact')
    applyUiDensity('comfortable')
    expect(document.documentElement.dataset.density).toBe('comfortable')
    applyUiDensity('bogus' as unknown as string)
    expect(document.documentElement.dataset.density).toBe('comfortable')
  })

  it('reads density from persisted settings shape', () => {
    window.localStorage.setItem(
      'crm_settings',
      JSON.stringify({ state: { settings: { uiDensity: 'compact' } } }),
    )
    expect(getInitialUiDensityFromStorage()).toBe('compact')

    window.localStorage.setItem('crm_settings', 'not-json')
    expect(getInitialUiDensityFromStorage()).toBe('comfortable')

    window.localStorage.removeItem('crm_settings')
    expect(getInitialUiDensityFromStorage()).toBe('comfortable')
  })
})

describe('settingsStore - updateUiDensity', () => {
  it('persists density value in settings state', () => {
    const initial = useSettingsStore.getState().settings.uiDensity
    useSettingsStore.getState().updateUiDensity('compact')
    expect(useSettingsStore.getState().settings.uiDensity).toBe('compact')
    useSettingsStore.getState().updateUiDensity('comfortable')
    expect(useSettingsStore.getState().settings.uiDensity).toBe('comfortable')
    // Restore initial to avoid leaking state across suites
    useSettingsStore.getState().updateUiDensity(initial)
  })
})
