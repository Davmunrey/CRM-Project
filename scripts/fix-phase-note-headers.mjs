/**
 * Normalizes duplicated / corrupted historical snapshot headers in phase planning markdown under `.planning/phases/`.
 * Run from repo root: node scripts/fix-phase-note-headers.mjs [--dry-run]
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const absFromRel = (rel) => join(ROOT, rel)

const UNIFIED = `> [!NOTE]
> **Historical snapshot:** This phase artifact is preserved for audit and may be outdated. Current source of truth: \`.planning/STATE.md\` and \`.planning/ROADMAP.md\`.

`

function lineStartIndex(lines, targetLine) {
  let pos = 0
  for (let j = 0; j < targetLine; j++) pos += lines[j].length + 1
  return pos
}

/** After leading blockquotes / blanks: yaml `---` + phase|plan|…, `<phase`, or first markdown H1. */
function findRestStart(contentLf) {
  const lines = contentLf.split('\n')
  let i = 0
  while (i < lines.length && (lines[i].startsWith('>') || lines[i].trim() === '')) i++

  if (i < lines.length && lines[i] === '---' && i + 1 < lines.length && /^(phase|plan|title|wave):/.test(lines[i + 1])) {
    return lineStartIndex(lines, i)
  }
  if (i < lines.length && lines[i].startsWith('<phase')) return lineStartIndex(lines, i)
  if (i < lines.length && lines[i].trim() === '' && i + 1 < lines.length && lines[i + 1].startsWith('# ')) {
    return lineStartIndex(lines, i + 1)
  }
  if (i < lines.length && lines[i].startsWith('# ')) return lineStartIndex(lines, i)
  return -1
}

const BROKEN_LINE = /> Source of truth for current status and priorities:  and \./g
const FIXED_LINE =
  '> Source of truth for current status and priorities: `.planning/STATE.md` and `.planning/ROADMAP.md`.'

function normalizePhaseHeader(raw) {
  const content = raw.replace(/\r\n/g, '\n')
  if (!content.startsWith('> [!NOTE]')) return raw
  const multiSnapshot = (content.match(/Historical snapshot/gi) || []).length >= 2
  const hasBroken = content.includes('priorities:  and .')
  if (!hasBroken && !multiSnapshot) return raw

  const cut = findRestStart(content)
  if (cut === -1) {
    if (!hasBroken) return raw
    const fixed = content.replace(BROKEN_LINE, FIXED_LINE)
    return fixed === content ? raw : fixed
  }

  const after = UNIFIED + content.slice(cut)
  return after === content ? raw : after
}

function main() {
  const dry = process.argv.includes('--dry-run')
  const rels = execSync('git ls-files .planning/phases', { cwd: ROOT, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter((f) => f.endsWith('.md'))

  let changed = 0
  for (const rel of rels) {
    const abs = absFromRel(rel)
    if (!existsSync(abs)) continue
    const before = readFileSync(abs, 'utf8')
    const after = normalizePhaseHeader(before)
    if (after === before) continue
    if (dry) console.log('would update', rel)
    else writeFileSync(abs, after, 'utf8')
    changed++
  }
  console.log(dry ? `Dry-run: ${changed} files would be updated` : `Normalized headers in ${changed} phase markdown files.`)
}

main()
