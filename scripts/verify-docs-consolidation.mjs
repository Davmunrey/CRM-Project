/**
 * Post-consolidation check: legacy split sources must not exist under docs/;
 * expected master-*.md files must exist.
 * Run: node scripts/verify-docs-consolidation.mjs
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const docs = (f) => join(ROOT, 'docs', f)

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
]

const MASTERS = [
  'master-security-compliance.md',
  'master-email-operations.md',
  'master-lead-management.md',
  'master-design-ui.md',
  'master-release-qa.md',
  'master-implementation-history.md',
  'master-roadmap-backlog.md',
]

const errors = []
for (const f of LEGACY) {
  if (existsSync(docs(f))) errors.push(`Legacy file must not exist: docs/${f}`)
}
for (const f of MASTERS) {
  if (!existsSync(docs(f))) errors.push(`Expected master missing: docs/${f}`)
}

if (errors.length) {
  for (const e of errors) console.error(e)
  process.exit(1)
}
console.log('OK: no legacy split docs under docs/; all expected master-*.md files present.')
