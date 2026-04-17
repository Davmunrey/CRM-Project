import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'
import { useI18nStore } from '../src/i18n'

/** jsdom has no ResizeObserver; chart/layout code paths may stall without it. */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as typeof ResizeObserver
}

beforeEach(() => {
  window.localStorage.clear()
  useI18nStore.setState({ language: 'en' })
})
