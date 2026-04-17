import type { Language } from '../i18n/types'
import rawIndustries from '../data/linkedin-industries-v2.json'

export type LinkedInIndustryId = string

export interface IndustryRecord {
  id: LinkedInIndustryId
  nameEn: string
  hierarchy: string
}

const records: IndustryRecord[] = (rawIndustries as { id: number; label: string; hierarchy: string }[]).map((row) => ({
  id: String(row.id),
  nameEn: row.label,
  hierarchy: row.hierarchy,
}))

const byId = new Map(records.map((r) => [r.id, r]))

/** Legacy CRM slugs → closest LinkedIn Industry Codes V2 id. */
const LEGACY_INDUSTRY_MAP: Record<string, LinkedInIndustryId> = {
  saas: '4',
  fintech: '43',
  consulting: '11',
  insurance: '42',
  banking: '41',
  retail: '27',
  healthcare: '14',
  other: '1594',
}

export function normalizeIndustryValue(raw: string): LinkedInIndustryId {
  const t = raw.trim()
  if (!t) return LEGACY_INDUSTRY_MAP.other
  if (LEGACY_INDUSTRY_MAP[t]) return LEGACY_INDUSTRY_MAP[t]
  if (byId.has(t)) return t
  return LEGACY_INDUSTRY_MAP.other
}

/** Optional per-language overrides: `overrides[lang][id] = label` */
const overrides: Partial<Record<Language, Record<string, string>>> = {}

export function getIndustryLabel(id: string, language: Language): string {
  const normalized = normalizeIndustryValue(id)
  const o = overrides[language]?.[normalized]
  if (o) return o
  return byId.get(normalized)?.nameEn ?? id
}

export function getIndustryOptions(language: Language): { value: string; label: string }[] {
  const opts = records.map((r) => ({ value: r.id, label: getIndustryLabel(r.id, language) }))
  opts.sort((a, b) => a.label.localeCompare(b.label, language === 'en' ? 'en' : undefined))
  return opts
}

export function getIndustryRecords(): readonly IndustryRecord[] {
  return records
}
