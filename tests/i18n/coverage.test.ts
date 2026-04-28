import { describe, it, expect } from 'vitest'
import { en } from '../../src/i18n/en'
import { es } from '../../src/i18n/es'
import { pt } from '../../src/i18n/pt'
import { fr } from '../../src/i18n/fr'
import { de } from '../../src/i18n/de'
import { it as itLocale } from '../../src/i18n/it'

/** Paths to every string leaf (and string array items) for parity checks across locale objects. */
function stringPaths(value: unknown, prefix = ''): Set<string> {
  const out = new Set<string>()
  if (typeof value === 'string') {
    if (prefix) out.add(prefix)
    return out
  }
  if (value === null || value === undefined) return out
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      const p = prefix ? `${prefix}.${i}` : String(i)
      for (const s of stringPaths(item, p)) out.add(s)
    })
    return out
  }
  if (typeof value === 'object') {
    for (const k of Object.keys(value as object)) {
      const p = prefix ? `${prefix}.${k}` : k
      for (const s of stringPaths((value as Record<string, unknown>)[k], p)) out.add(s)
    }
  }
  return out
}

describe('i18n coverage (keys present in all locales)', () => {
  const base = stringPaths(en)

  it('es has the same string paths as en', () => {
    const s = stringPaths(es)
    expect(compareMissing(base, s)).toEqual([])
  })

  it('pt has the same string paths as en', () => {
    const s = stringPaths(pt)
    expect(compareMissing(base, s)).toEqual([])
  })

  it('fr has the same string paths as en', () => {
    const s = stringPaths(fr)
    expect(compareMissing(base, s)).toEqual([])
  })

  it('de has the same string paths as en', () => {
    const s = stringPaths(de)
    expect(compareMissing(base, s)).toEqual([])
  })

  it('it has the same string paths as en', () => {
    const s = stringPaths(itLocale)
    expect(compareMissing(base, s)).toEqual([])
  })
})

function compareMissing(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((k) => !b.has(k)).sort()
}
