/**
 * UI guardrails: fail CI if disallowed layout/color patterns appear under src/.
 * Run: npm run ui:lint
 *
 * Global rules apply everywhere (except allowlist).
 * Strict rules apply outside `src/components/ui/` (primitives may use raw patterns during migration).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '..', 'src')

const UI_PRIMITIVE_DIR = /[\\/]src[\\/]components[\\/]ui[\\/]/

/** @type {{ id: string, re: RegExp, msg: string }[]} */
const RULES = [
  { id: 'no-bg-navy', re: /\bbg-navy-/, msg: 'Use bg-surface-* instead of bg-navy-*.' },
  { id: 'no-text-navy', re: /\btext-navy-/, msg: 'Use text-fg / semantic tokens instead of text-navy-*.' },
  { id: 'no-border-navy', re: /\bborder-navy-/, msg: 'Use semantic borders instead of border-navy-*.' },
  { id: 'no-from-navy', re: /\bfrom-navy-/, msg: 'Avoid navy gradients; use surface / accent tokens.' },
  { id: 'no-to-navy', re: /\bto-navy-/, msg: 'Avoid navy gradients; use surface / accent tokens.' },
  { id: 'no-arbitrary-hex-bg', re: /bg-\[#/, msg: 'Avoid arbitrary hex backgrounds; use bg-surface-*.' },
  { id: 'no-arbitrary-hex-text', re: /text-\[#/, msg: 'Avoid arbitrary hex text colors; use text-fg / accent-*.' },
  { id: 'no-arbitrary-hex-border', re: /border-\[#/, msg: 'Avoid arbitrary hex borders; use border-fg/* or tokens.' },
  { id: 'no-arbitrary-hex-gradient', re: /\b(?:from|to|via)-\[#/, msg: 'Avoid arbitrary hex gradients; use accent / surface tokens.' },
]

/** Outside `components/ui` only - enforce semantic Tailwind in feature code. */
const STRICT_RULES = [
  { id: 'no-text-slate', re: /\btext-slate-/, msg: 'Use text-fg / text-fg-muted / text-fg-subtle instead of text-slate-*.' },
  { id: 'no-bg-slate', re: /\bbg-slate-/, msg: 'Use bg-surface-* instead of bg-slate-*.' },
  { id: 'no-border-slate', re: /\bborder-slate-/, msg: 'Use border-border-subtle / border-fg/* instead of border-slate-*.' },
  { id: 'no-text-white', re: /\btext-white\b/, msg: 'Use text-fg on surfaces; avoid text-white in TSX.' },
  { id: 'no-bg-white', re: /\bbg-white\b/, msg: 'Use bg-surface-1 or bg-fg/* instead of bg-white.' },
  { id: 'no-bg-brand', re: /\bbg-brand-/, msg: 'Use bg-accent-* instead of bg-brand-*.' },
  { id: 'no-text-brand', re: /\btext-brand-/, msg: 'Use text-accent-* instead of text-brand-*.' },
  { id: 'no-border-brand', re: /\bborder-brand-/, msg: 'Use border-accent-* instead of border-brand-*.' },
  { id: 'no-from-brand', re: /\bfrom-brand-/, msg: 'Use from-accent-* instead of from-brand-*.' },
  { id: 'no-to-brand', re: /\bto-brand-/, msg: 'Use to-accent-* instead of to-brand-*.' },
  { id: 'no-ring-brand', re: /ring-brand-/, msg: 'Use ring-accent-* instead of ring-brand-*.' },
  { id: 'no-outline-brand', re: /outline-brand-/, msg: 'Use outline-accent-* instead of outline-brand-*.' },
  { id: 'no-accent-brand', re: /accent-brand-/, msg: 'Use accent-accent-* or native accent-* scale instead of accent-brand-*.' },
  { id: 'no-placeholder-slate', re: /placeholder-slate-/, msg: 'Use placeholder:text-fg-subtle.' },
  { id: 'no-raw-status-text', re: /\btext-(red|emerald|amber|blue|rose|green|yellow)-[34]00\b/, msg: 'Use text-danger / text-success / text-warning / text-info instead of raw palette.' },
  { id: 'no-raw-status-bg', re: /\bbg-(red|emerald|amber|blue)-\d{3}\/\d+/, msg: 'Use bg-danger/*, bg-success/*, etc. instead of raw palette.' },
  {
    id: 'no-raw-palette-bg-solid',
    re: /\bbg-(red|emerald|amber|blue|rose|sky|green|yellow|violet|orange)-(50|[1-9]\d{2})\b/,
    msg: 'Use bg-success / bg-danger / bg-warning / bg-info / bg-accent-* instead of raw palette backgrounds.',
  },
  {
    id: 'no-raw-palette-text-solid',
    re: /\btext-(red|emerald|amber|blue|rose|sky|green|yellow|violet|orange)-(50|[1-9]\d{2})\b/,
    msg: 'Use text-success / text-danger / text-warning / text-info / text-accent-* instead of raw palette text.',
  },
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

    const rulesToRun = [...RULES]
    if (!UI_PRIMITIVE_DIR.test(file)) {
      rulesToRun.push(...STRICT_RULES)
    }

    for (const rule of rulesToRun) {
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
