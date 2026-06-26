/** Minimum length for client-enforced strong passwords (align with product policy). */
export const STRONG_PASSWORD_MIN_LENGTH = 12

export type PasswordStrengthIssue = 'length' | 'lower' | 'upper' | 'digit' | 'symbol'

const LOWER = 'abcdefghjkmnpqrstuvwxyz'
const UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%^&*-_+=?'

function randomUint32(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]!
}

function pickChar(pool: string): string {
  return pool[randomUint32() % pool.length]!
}

/** Fisher–Yates shuffle using crypto RNG. */
function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomUint32() % (i + 1)
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
}

/**
 * Generates a random password with at least one lowercase, uppercase, digit, and symbol.
 * Uses `crypto.getRandomValues` (browser / secure contexts).
 */
export function generateSecurePassword(length = 20): string {
  const len = Math.max(STRONG_PASSWORD_MIN_LENGTH, length)
  const required = [pickChar(LOWER), pickChar(UPPER), pickChar(DIGITS), pickChar(SYMBOLS)]
  const pool = LOWER + UPPER + DIGITS + SYMBOLS
  const rest: string[] = []
  for (let i = 0; i < len - required.length; i++) {
    rest.push(pickChar(pool))
  }
  const chars = [...required, ...rest]
  shuffleInPlace(chars)
  return chars.join('')
}

export function getPasswordStrengthIssues(password: string): PasswordStrengthIssue[] {
  const issues: PasswordStrengthIssue[] = []
  if (password.length < STRONG_PASSWORD_MIN_LENGTH) issues.push('length')
  if (!/[a-z]/.test(password)) issues.push('lower')
  if (!/[A-Z]/.test(password)) issues.push('upper')
  if (!/[0-9]/.test(password)) issues.push('digit')
  if (!/[!@#$%^&*\-_+=?]/.test(password)) issues.push('symbol')
  return issues
}

export function isStrongPassword(password: string): boolean {
  return getPasswordStrengthIssues(password).length === 0
}

/** Per-rule satisfaction for live UI (inverse of `getPasswordStrengthIssues`). */
export function getPasswordRuleMet(password: string): Record<PasswordStrengthIssue, boolean> {
  const bad = new Set(getPasswordStrengthIssues(password))
  return {
    length: !bad.has('length'),
    lower: !bad.has('lower'),
    upper: !bad.has('upper'),
    digit: !bad.has('digit'),
    symbol: !bad.has('symbol'),
  }
}

const ISSUE_ORDER: PasswordStrengthIssue[] = ['length', 'lower', 'upper', 'digit', 'symbol']

/** Human-readable combined message for form errors (order is stable). */
export function formatPasswordStrengthIssues(
  issues: PasswordStrengthIssue[],
  labels: Record<PasswordStrengthIssue, string>,
): string {
  if (issues.length === 0) return ''
  return ISSUE_ORDER.filter((k) => issues.includes(k)).map((k) => labels[k]).join(' · ')
}
