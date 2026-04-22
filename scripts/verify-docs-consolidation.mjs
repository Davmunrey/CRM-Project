/**
 * Post-consolidation check: legacy split sources must not exist under docs/;
 * expected master-*.md files must exist; docs/ may only contain an explicit allowlist of .md files.
 * Run: node scripts/verify-docs-consolidation.mjs
 */
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const DOCS_DIR = join(ROOT, 'docs')
const docs = (f) => join(DOCS_DIR, f)

const LEGACY = [
  'auth-sso-backend-handoff.md',
  'hardening-matrix.md',
  'sell-ready-security-evidence-index.md',
  'supabase-external-hardening-checklist.md',
  'compliance-mapping.md',
  'dsar-playbook.md',
  'gitea-operations.md',
  'email-deliverability-resend.md',
  'email-mailbox-privacy-runbook.md',
  'email-release-checklist.md',
  'email-smoke-test-15min.md',
  'lead-score-maintenance-backend.md',
  'lead-maintenance-ops-dashboard.md',
  'lead-maintenance-runbook.md',
  'data-retention-runbook.md',
  'design-system-and-layout.md',
  'theme-system.md',
  'navigation-settings-sidebar-runbook.md',
  'user-profile-display-names.md',
  'sell-ready-release-checklist.md',
  'qa-evidence-sell-ready-baseline.md',
  'qa-evidence-template.md',
  'go-no-go-sell-ready-baseline.md',
  'production-handoff-checklist.md',
  'implementation-history-sections-01-12.md',
  'implementation-history.md',
  'pro-roadmap-30-60-90.md',
  'pro-backlog.md',
  /** Merged into masters / project-state (do not reintroduce as standalone sources). */
  'email-deliverability.md',
  'checkbox-ownership-matrix.md',
  'manager-dashboard-metrics.md',
]

const MASTERS = [
  'master-security-compliance.md',
  'master-email-operations.md',
  'master-lead-management.md',
  'master-design-ui.md',
  'master-release-qa.md',
  'master-implementation-history.md',
  'master-roadmap-backlog.md',
  'master-pipedrive-velo-comparison.md',
]

/** Non-master Markdown allowed under docs/ (index, bridge, certified runbooks, engineering reference). */
const DOCS_MD_ALLOWLIST = new Set([
  ...MASTERS,
  'README.md',
  'project-state.md',
  'deployment-spa-and-env.md',
  'google-gmail-oauth-verification.md',
  'smoke-checklist-production.md',
  'design-system-reference.md',
  'sequences-flow.md',
  'public-api-phase1.md',
  'lead-capture-public-endpoint.md',
])

const errors = []
for (const f of LEGACY) {
  if (existsSync(docs(f))) errors.push(`Legacy file must not exist: docs/${f}`)
}
for (const f of MASTERS) {
  if (!existsSync(docs(f))) errors.push(`Expected master missing: docs/${f}`)
}

let mdOnDisk = []
try {
  mdOnDisk = readdirSync(DOCS_DIR).filter((n) => n.endsWith('.md'))
} catch {
  errors.push('docs/ directory missing or unreadable')
}

for (const name of mdOnDisk) {
  if (!DOCS_MD_ALLOWLIST.has(name)) {
    errors.push(
      `Unexpected docs/*.md: docs/${name}. Either merge into a master, add to DOCS_MD_ALLOWLIST in scripts/verify-docs-consolidation.mjs, or remove it.`,
    )
  }
}
for (const name of DOCS_MD_ALLOWLIST) {
  if (!existsSync(docs(name))) errors.push(`Allowlisted doc missing on disk: docs/${name}`)
}

if (errors.length) {
  for (const e of errors) console.error(e)
  process.exit(1)
}
console.log(
  'OK: no legacy split docs; all masters present; docs/*.md matches allowlist (' + DOCS_MD_ALLOWLIST.size + ' files).',
)
