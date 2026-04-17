import '@testing-library/jest-dom'
import * as axeMatchers from 'vitest-axe/matchers'
import { beforeEach, expect } from 'vitest'
import { useI18nStore } from '../src/i18n'

expect.extend(axeMatchers)

beforeEach(() => {
  window.localStorage.clear()
  useI18nStore.setState({ language: 'en', languageMode: 'manual' })
})
