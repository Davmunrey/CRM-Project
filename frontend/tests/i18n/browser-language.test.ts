import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { detectBrowserLanguage, useI18nStore } from '../../src/i18n'

describe('detectBrowserLanguage', () => {
  const orig = globalThis.navigator

  beforeEach(() => {
    vi.stubGlobal('navigator', { languages: ['en-US'], language: 'en-US' } as Navigator)
  })

  afterEach(() => {
    vi.stubGlobal('navigator', orig)
    vi.unstubAllGlobals()
  })

  it('returns first supported base language from navigator.languages', () => {
    vi.stubGlobal('navigator', { languages: ['es-ES', 'en'], language: 'es-ES' } as Navigator)
    expect(detectBrowserLanguage()).toBe('es')
  })

  it('falls back to en when nothing matches', () => {
    vi.stubGlobal('navigator', { languages: ['xx-YY'], language: 'xx-YY' } as Navigator)
    expect(detectBrowserLanguage()).toBe('en')
  })
})

describe('useI18nStore languageMode', () => {
  it('setLanguage forces manual mode', () => {
    useI18nStore.setState({ language: 'en', languageMode: 'browser' })
    useI18nStore.getState().setLanguage('de')
    expect(useI18nStore.getState().language).toBe('de')
    expect(useI18nStore.getState().languageMode).toBe('manual')
  })
})
