/**
 * Markdown date inventory and optional git-date footers.
 * Uses `git ls-files` (tracked + untracked markdown) — avoids full-tree walks.
 *
 * Usage:
 *   node scripts/md-chronology.mjs inventory
 *   node scripts/md-chronology.mjs apply-footers [--dry-run]
 *   node scripts/md-chronology.mjs sort-state-key-decisions [--dry-run]
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

/** One `git ls-files` + optional untracked list; returns sorted paths + tracked set. */
function markdownGitIndex() {
  const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter((f) => f.endsWith('.md'))

  const trackedSet = new Set(tracked)
  let untracked = []
  try {
    untracked = execSync('git ls-files -o --exclude-standard', { cwd: ROOT, encoding: 'utf8' })
      .split(/\r?\n/)
      .filter((f) => f.endsWith('.md'))
  } catch {
    /* not a git checkout */
  }

  const rels = [...new Set([...tracked, ...untracked])].sort()
  return { rels, trackedSet }
}

const absFromRel = (rel) => join(ROOT, rel)

function gitLastCommitDate(rel) {
  try {
    return execSync(`git log -1 --format=%cs -- "${rel}"`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return null
  }
}

function mtimeDateIso(rel) {
  const abs = absFromRel(rel)
  if (!existsSync(abs)) return null
  try {
    return statSync(abs).mtime.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

const RE_HEAD_LAST_UPDATED = /^last_updated:\s/m

const RE_BODY_LAST_UPDATED = [
  /\*\*Last updated:\*\*/i,
  /- \*\*Last updated:\*\*/i,
  /\*Last updated \(git\):/i,
  /\| Last updated \|/i,
  /\*Last session:/i,
  /\*Last updated:\*/i,
  /\*Completed:\s*20\d\d-\d\d-\d\d/i,
  /Consolidated \*\*20\d\d-\d\d-\d\d\*\*/,
  /> Consolidated \*\*20\d\d/,
]

function hasLastUpdatedLikeContent(s) {
  const head = s.slice(0, 1200)
  if (RE_HEAD_LAST_UPDATED.test(head)) return true
  if (/\| Phase \|/.test(s) && /\| Completed \|/.test(s)) return true
  return RE_BODY_LAST_UPDATED.some((re) => re.test(s))
}

const RE_SORTABLE_TABLE = /\|\s*Decision\s*\|\s*Rationale\s*\|\s*Date\s*\|/

function hasSortableDateTableHint(s) {
  if (RE_SORTABLE_TABLE.test(s)) return true
  return /\|\s*[^|]+\|\s*[^|]+\|\s*Date\s*\|/.test(s) && /\|\s*20\d\d-\d\d-\d\d\s*\|/.test(s)
}

function inventory() {
  const { rels, trackedSet } = markdownGitIndex()
  const rows = []
  for (const rel of rels) {
    const abs = absFromRel(rel)
    if (!existsSync(abs)) continue
    const content = readFileSync(abs, 'utf8')
    const git = gitLastCommitDate(rel) || (!trackedSet.has(rel) ? mtimeDateIso(rel) : null) || 'unknown'
    rows.push({
      rel,
      git,
      hasMeta: hasLastUpdatedLikeContent(content),
      hintTable: hasSortableDateTableHint(content),
      untracked: !trackedSet.has(rel),
    })
  }
  const missing = rows.filter((r) => !r.hasMeta)
  const tableHints = rows.filter((r) => r.hintTable)
  console.log(`# Markdown date inventory (${rows.length} files from git)\n`)
  console.log(`Files without last-updated-like metadata: ${missing.length}`)
  console.log(`Files with possible Date-column tables: ${tableHints.length}\n`)
  for (const r of rows) {
    const flags = `${r.hasMeta ? 'meta' : 'NO-META'}${r.hintTable ? ',table' : ''}${r.untracked ? ',untracked' : ''}`
    console.log(`${r.git}\t${flags}\t${r.rel}`)
  }
}

function applyFooters(dryRun) {
  const { rels, trackedSet } = markdownGitIndex()
  let changed = 0
  for (const rel of rels) {
    const abs = absFromRel(rel)
    if (!existsSync(abs)) continue
    const content = readFileSync(abs, 'utf8')
    if (hasLastUpdatedLikeContent(content)) continue
    const git = gitLastCommitDate(rel) || (!trackedSet.has(rel) ? mtimeDateIso(rel) : null)
    if (!git) continue
    const footer = `\n---\n\n*Last updated (git): **${git}***\n`
    const next = content.replace(/\s*$/, '') + footer
    if (dryRun) console.log('would update', rel)
    else writeFileSync(abs, next, 'utf8')
    changed++
  }
  console.log(dryRun ? `Dry-run: ${changed} files would get footers` : `Updated ${changed} files with git footers`)
}

function parseTableRow(line) {
  const parts = line.split('|').map((c) => c.trim())
  if (parts.length < 4) return null
  const date = parts[parts.length - 2]
  if (!/^20\d\d-\d\d-\d\d$/.test(date)) return null
  return { line, date, decision: parts[1] }
}

function sortStateKeyDecisions(dryRun) {
  const abs = absFromRel('.planning/STATE.md')
  const raw = readFileSync(abs, 'utf8')
  const md = raw.replace(/\r\n/g, '\n')
  const head = '## Key Decisions\n\n'
  const start = md.indexOf(head)
  const end = md.indexOf('\n## Blockers', start)
  if (start === -1 || end === -1) {
    throw new Error('.planning/STATE.md: missing Key Decisions or Blockers section')
  }

  const lines = md.slice(start + head.length, end).split('\n')
  const header = lines[0]
  const sep = lines[1]
  if (!header.includes('| Decision |') || !sep.includes('---')) {
    throw new Error('Key Decisions table header/separator unexpected')
  }
  const rows = lines.slice(2).filter((l) => l.startsWith('|')).map(parseTableRow).filter(Boolean)
  rows.sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.decision.localeCompare(b.decision)))
  const newTable = [header, sep, ...rows.map((r) => r.line)].join('\n')
  const next = md.slice(0, start + head.length) + newTable + '\n' + md.slice(end)

  if (dryRun) {
    console.log('Dry-run: would rewrite Key Decisions sorted by Date ascending')
    return
  }
  writeFileSync(abs, next, 'utf8')
  console.log('Sorted .planning/STATE.md Key Decisions by Date ascending')
}

const cmd = process.argv[2]
const dry = process.argv.includes('--dry-run')
if (cmd === 'inventory') inventory()
else if (cmd === 'apply-footers') applyFooters(dry)
else if (cmd === 'sort-state-key-decisions') sortStateKeyDecisions(dry)
else {
  console.error(
    'Usage: node scripts/md-chronology.mjs inventory | apply-footers [--dry-run] | sort-state-key-decisions [--dry-run]',
  )
  process.exit(1)
}
