/**
 * i18n guardrails: fail CI if user-facing string literals appear where we expect `t.*` / `getTranslations()`.
 * Run: npm run i18n:lint
 *
 * Heuristic (single-line): long string literals passed to setError(...) without using the translation tree.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '..', 'src')

const SKIP_DIR = /[\\/]src[\\/](i18n|test|tests)[\\/]|[\\/]src[\\/]components[\\/]ui[\\/]/

/** @type {{ id: string, re: RegExp, msg: string }[]} */
const RULES = [
  {
    id: 'no-long-setError-string-literal',
    re: /setError\(\s*['"`]([^'"`]{22,})['"`]\s*\)/g,
    msg:
      'Use `t.*`, `getTranslations().*`, or a variable - do not pass a long hardcoded string to setError (add a key under src/i18n).',
  },
]

function walk(dir) {
  /** @type {string[]} */
  const out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules') continue
      out.push(...walk(p))
    } else if (/\.(tsx|ts)$/.test(ent.name) && !/\.(test|spec)\.(tsx|ts)$/.test(ent.name)) {
      out.push(p)
    }
  }
  return out
}

function lineOfIndex(text, index) {
  return text.slice(0, index).split('\n').length
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('i18n-lint: src directory not found')
    process.exit(1)
  }

  /** @type {string[]} */
  const failures = []

  for (const file of walk(SRC)) {
    if (SKIP_DIR.test(file)) continue
    const rel = path.relative(path.join(__dirname, '..'), file)
    let text
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }

    for (const rule of RULES) {
      rule.re.lastIndex = 0
      let m
      while ((m = rule.re.exec(text)) !== null) {
        const line = lineOfIndex(text, m.index)
        const lineText = text.split('\n')[line - 1] ?? ''
        if (lineText.includes('getTranslations()') || /\bt\.\w/.test(lineText)) continue
        const sample = String(m[1]).slice(0, 48).replace(/\s+/g, ' ')
        failures.push(`${rel}:${line} [${rule.id}] ${rule.msg} (found "${sample}…")`)
      }
    }
  }

  if (failures.length) {
    console.error('i18n-lint failed:\n')
    for (const f of failures) console.error(`  · ${f}`)
    process.exit(1)
  }
  console.log('i18n-lint: OK')
}

main()
