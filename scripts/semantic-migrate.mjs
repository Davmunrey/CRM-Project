/**
 * One-shot semantic class migration for TSX under src/.
 * Run: node scripts/semantic-migrate.mjs
 * Idempotent-ish: safe to re-run; review git diff after.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '..', 'src')

const SKIP_DIRS = new Set(['node_modules'])
const SKIP_FILES = /[\\/]src[\\/](components[\\/]ui|lib[\\/]brandingAccent\.ts|lib[\\/]theme\.ts)/

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  const out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue
      out.push(...walk(p))
    } else if (/\.tsx$/.test(ent.name)) {
      out.push(p)
    }
  }
  return out
}

/** @param {string} text */
function migrate(text) {
  let s = text
  if (SKIP_FILES.test(s) && s.includes('src')) {
    // Still migrate pages importing from ui - only skip path check on file path not content
  }

  const reps = [
    [/\bbg-brand-(\d{2,3})\b/g, 'bg-accent-$1'],
    [/\btext-brand-(\d{2,3})\b/g, 'text-accent-$1'],
    [/\bborder-brand-(\d{2,3})\b/g, 'border-accent-$1'],
    [/\bfrom-brand-(\d{2,3})\b/g, 'from-accent-$1'],
    [/\bto-brand-(\d{2,3})\b/g, 'to-accent-$1'],
    [/\bvia-brand-(\d{2,3})\b/g, 'via-accent-$1'],
    [/\btext-slate-100\b/g, 'text-fg'],
    [/\btext-slate-200\b/g, 'text-fg'],
    [/\btext-slate-300\b/g, 'text-fg-muted'],
    [/\btext-slate-400\b/g, 'text-fg-muted'],
    [/\btext-slate-500\b/g, 'text-fg-subtle'],
    [/\btext-slate-600\b/g, 'text-fg-subtle'],
    [/\btext-slate-700\b/g, 'text-fg'],
    [/\bborder-slate-(\d{2,3})\b/g, 'border-border-subtle'],
    [/\bbg-slate-800\b/g, 'bg-surface-1'],
    [/\bbg-slate-900\b/g, 'bg-surface-0'],
    [/\bbg-slate-950\b/g, 'bg-surface-0'],
    [/\bbg-slate-700\b/g, 'bg-surface-2'],
    [/\bbg-slate-600\b/g, 'bg-surface-2'],
    [/\bbg-slate-500\b/g, 'bg-surface-2'],
    [/\btext-white\b/g, 'text-fg'],
    [/\bbg-white\/(\d+)\b/g, 'bg-fg/$1'],
    [/\bborder-white\/(\d+)\b/g, 'border-fg/$1'],
    [/\bhover:bg-white\/(\d+)\b/g, 'hover:bg-fg/$1'],
    [/\bhover:text-slate-300\b/g, 'hover:text-fg'],
    [/\bdivide-white\/(\d+)\b/g, 'divide-border-subtle'],
    [/\btext-emerald-300\b/g, 'text-success'],
    [/\btext-emerald-400\b/g, 'text-success'],
    [/\btext-emerald-500\b/g, 'text-success'],
    [/\bbg-emerald-500\/(\d+)\b/g, 'bg-success/$1'],
    [/\bbg-emerald-600\/(\d+)\b/g, 'bg-success/$1'],
    [/\bbg-emerald-500\b/g, 'bg-success'],
    [/\btext-red-400\b/g, 'text-danger'],
    [/\btext-red-300\b/g, 'text-danger'],
    [/\bbg-red-500\/(\d+)\b/g, 'bg-danger/$1'],
    [/\bborder-red-500\/(\d+)\b/g, 'border-danger/$1'],
    [/\btext-amber-400\b/g, 'text-warning'],
    [/\bbg-amber-500\/(\d+)\b/g, 'bg-warning/$1'],
    [/\btext-blue-400\b/g, 'text-info'],
    [/\btext-blue-500\b/g, 'text-info'],
    [/\bbg-blue-500\/(\d+)\b/g, 'bg-info/$1'],
    [/\bbg-blue-600\/(\d+)\b/g, 'bg-info/$1'],
    [/\btext-yellow-400\b/g, 'text-warning'],
    [/\bbg-yellow-500\/(\d+)\b/g, 'bg-warning/$1'],
    [/\btext-purple-400\b/g, 'text-accent-400'],
    [/\bbg-purple-500\/(\d+)\b/g, 'bg-accent-500/$1'],
    [/\btext-indigo-400\b/g, 'text-accent-400'],
    [/\bbg-indigo-500\/(\d+)\b/g, 'bg-accent-500/$1'],
    [/\btext-sky-400\b/g, 'text-info'],
    [/\bbg-sky-500\/(\d+)\b/g, 'bg-info/$1'],
    [/\bbg-navy-950\/70\b/g, 'bg-surface-0/70'],
    [/\bplaceholder:text-slate-500\b/g, 'placeholder:text-fg-subtle'],
    [/\bplaceholder:text-slate-600\b/g, 'placeholder:text-fg-subtle'],
  ]

  for (const [re, to] of reps) {
    s = s.replace(re, to)
  }
  return s
}

function main() {
  let changed = 0
  for (const file of walk(SRC)) {
    if (SKIP_FILES.test(file)) continue
    const raw = fs.readFileSync(file, 'utf8')
    const next = migrate(raw)
    if (next !== raw) {
      fs.writeFileSync(file, next, 'utf8')
      changed++
      console.log('updated', path.relative(path.join(__dirname, '..'), file))
    }
  }
  console.log(`semantic-migrate: ${changed} files updated`)
}

main()
