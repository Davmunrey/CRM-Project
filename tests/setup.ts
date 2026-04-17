import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'
import { useI18nStore } from '../src/i18n'

beforeEach(() => {
  window.localStorage.clear()
  useI18nStore.setState({ language: 'en' })
})
