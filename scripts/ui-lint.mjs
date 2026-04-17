/**
 * UI guardrails: fail CI if disallowed layout/color patterns appear under src/.
 * Run: npm run ui:lint
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '..', 'src')

/**
 * Files under src/lib/brandingAccent.ts and src/lib/theme.ts are allowed
 * to reference hex / raw tokens because they generate CSS variables.
 *
 * @type {{ id: string, re: RegExp, msg: string, allow?: RegExp }[]}
 */
const RULES = [
  { id: 'no-bg-navy', re: /\bbg-navy-/, msg: 'Use bg-surface-* instead of bg-navy-*.' },
  { id: 'no-text-navy', re: /\btext-navy-/, msg: 'Use text-fg / semantic tokens instead of text-navy-*.' },
  { id: 'no-border-navy', re: /\bborder-navy-/, msg: 'Use semantic borders instead of border-navy-*.' },
  { id: 'no-from-navy', re: /\bfrom-navy-/, msg: 'Avoid navy gradients; use surface / accent tokens.' },
  { id: 'no-to-navy', re: /\bto-navy-/, msg: 'Avoid navy gradients; use surface / accent tokens.' },
  { id: 'no-arbitrary-hex-bg', re: /bg-\[#/, msg: 'Avoid arbitrary hex backgrounds; use bg-surface-*.' },
  { id: 'no-arbitrary-hex-text', re: /text-\[#/, msg: 'Avoid arbitrary hex text colors; use text-fg / accent-*.' },
  { id: 'no-arbitrary-hex-border', re: /border-\[#/, msg: 'Avoid arbitrary hex borders; use border-white/* or tokens.' },
  { id: 'no-arbitrary-hex-gradient', re: /\b(?:from|to|via)-\[#/, msg: 'Avoid arbitrary hex gradients; use accent / surface tokens.' },
]

/** Paths that may legitimately reference hex tokens (branding/theme). */
const ALLOWLIST = [
  /[\\/]src[\\/]lib[\\/]brandingAccent\.ts$/,
  /[\\/]src[\\/]lib[\\/]theme\.ts$/,
]

function walk(dir) {
  /** @type {string[]} */
  const out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules') continue
      out.push(...walk(p))
    } else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) {
      out.push(p)
    }
  }
  return out
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('ui-lint: src directory not found')
    process.exit(1)
  }

  /** @type {string[]} */
  const failures = []

  for (const file of walk(SRC)) {
    const rel = path.relative(path.join(__dirname, '..'), file)
    if (ALLOWLIST.some((re) => re.test(file))) continue
    let text
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }

    for (const rule of RULES) {
      rule.re.lastIndex = 0
      if (!rule.re.test(text)) continue
      const m = text.match(rule.re)
      const sample = m ? String(m[0]).slice(0, 40) : ''
      failures.push(`${rel}: [${rule.id}] ${rule.msg}${sample ? ` (found "${sample}")` : ''}`)
    }
  }

  if (failures.length) {
    console.error('ui-lint failed:\n')
    for (const f of failures) console.error(`  · ${f}`)
    process.exit(1)
  }
  console.log('ui-lint: OK')
}

main()
