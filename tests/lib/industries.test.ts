import { describe, expect, it } from 'vitest'
import { getIndustryLabel, getIndustryOptions, normalizeIndustryValue } from '../../src/lib/industries'

describe('lib/industries', () => {
  it('normalizes legacy values to canonical LinkedIn industries', () => {
    expect(normalizeIndustryValue('saas')).toBe('computer-software')
    expect(normalizeIndustryValue('fintech')).toBe('financial-services')
    expect(normalizeIndustryValue('consulting')).toBe('management-consulting')
    expect(normalizeIndustryValue('healthcare')).toBe('hospital-health-care')
  })

  it('falls back to other for unknown values', () => {
    expect(normalizeIndustryValue('not-a-real-industry')).toBe('other')
    expect(normalizeIndustryValue('')).toBe('other')
  })

  it('returns localized labels for supported locales', () => {
    expect(getIndustryLabel('computer-software', 'es')).toBe('Software')
    expect(getIndustryLabel('computer-software', 'fr')).toBe('Logiciels')
    expect(getIndustryLabel('computer-software', 'de')).toBe('Software')
  })

  it('returns option list containing canonical mapped values', () => {
    const options = getIndustryOptions('en')
    expect(options.some((opt) => opt.value === 'computer-software')).toBe(true)
    expect(options.some((opt) => opt.value === 'financial-services')).toBe(true)
  })
})
