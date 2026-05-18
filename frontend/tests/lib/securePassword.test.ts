import { describe, expect, it } from 'vitest'
import {
  formatPasswordStrengthIssues,
  generateSecurePassword,
  getPasswordRuleMet,
  getPasswordStrengthIssues,
  isStrongPassword,
  STRONG_PASSWORD_MIN_LENGTH,
} from '../../src/lib/securePassword'

describe('securePassword', () => {
  it('generateSecurePassword returns strong passwords', () => {
    const p = generateSecurePassword()
    expect(p.length).toBeGreaterThanOrEqual(STRONG_PASSWORD_MIN_LENGTH)
    expect(isStrongPassword(p)).toBe(true)
  })

  it('detects missing character classes', () => {
    expect(getPasswordStrengthIssues('short')).toContain('length')
    expect(getPasswordStrengthIssues('a'.repeat(20))).toContain('upper')
    expect(getPasswordStrengthIssues('A'.repeat(20))).toContain('lower')
    expect(getPasswordStrengthIssues('Aa'.repeat(10))).toContain('digit')
    expect(getPasswordStrengthIssues('Aa1'.repeat(5))).toContain('symbol')
  })

  it('formatPasswordStrengthIssues joins in stable order', () => {
    const msg = formatPasswordStrengthIssues(['symbol', 'length'], {
      length: 'L',
      lower: 'lo',
      upper: 'up',
      digit: 'd',
      symbol: 'S',
    })
    expect(msg).toBe('L · S')
  })

  it('getPasswordRuleMet mirrors getPasswordStrengthIssues', () => {
    const pw = 'Aa1!'
    const issues = new Set(getPasswordStrengthIssues(pw))
    const met = getPasswordRuleMet(pw)
    for (const k of ['length', 'lower', 'upper', 'digit', 'symbol'] as const) {
      expect(met[k]).toBe(!issues.has(k))
    }
  })
})
