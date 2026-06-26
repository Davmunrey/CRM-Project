/**
 * Placeholder bootstrap for W16 localization.
 * Reads en.ts and generates draft locale files through key mirroring.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const enPath = join(root, 'src', 'i18n', 'en.ts')
const src = readFileSync(enPath, 'utf8')

for (const locale of ['fr', 'de', 'it']) {
  const outPath = join(root, 'src', 'i18n', `${locale}.draft.ts`)
  writeFileSync(outPath, src.replace('export const en', `export const ${locale}`), 'utf8')
  console.log(`Draft created: ${outPath}`)
}
