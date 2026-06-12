import { describe, it, expect } from 'vitest'
import { resolveFormConfig, isHoneypotTripped, DEFAULT_FORM_CONFIG } from './leadForms.js'

describe('resolveFormConfig', () => {
  it('returns defaults for empty/invalid input', () => {
    expect(resolveFormConfig(undefined)).toEqual(DEFAULT_FORM_CONFIG)
    expect(resolveFormConfig(null)).toEqual(DEFAULT_FORM_CONFIG)
    expect(resolveFormConfig('nope')).toEqual(DEFAULT_FORM_CONFIG)
  })

  it('keeps provided title/description/successMessage', () => {
    const c = resolveFormConfig({ title: 'Demo request', description: 'Tell us about you', successMessage: 'Got it!' })
    expect(c.title).toBe('Demo request')
    expect(c.description).toBe('Tell us about you')
    expect(c.successMessage).toBe('Got it!')
  })

  it('filters fields to the allow-list and always includes email', () => {
    const c = resolveFormConfig({ fields: ['firstName', 'email', 'evil', 'phone'] })
    expect(c.fields).toEqual(['firstName', 'email', 'phone'])
  })

  it('appends email when a custom field list omits it', () => {
    const c = resolveFormConfig({ fields: ['firstName', 'company'] })
    expect(c.fields).toContain('email')
  })
})

describe('isHoneypotTripped', () => {
  it('is true when the _hp field is filled (a bot)', () => {
    expect(isHoneypotTripped({ _hp: 'http://spam' })).toBe(true)
  })
  it('is false when _hp is empty/absent (a human)', () => {
    expect(isHoneypotTripped({ _hp: '' })).toBe(false)
    expect(isHoneypotTripped({ _hp: '   ' })).toBe(false)
    expect(isHoneypotTripped({ email: 'a@b.com' })).toBe(false)
    expect(isHoneypotTripped(null)).toBe(false)
  })
})
