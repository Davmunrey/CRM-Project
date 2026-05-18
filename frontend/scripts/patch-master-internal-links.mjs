/**
 * Rewrites legacy docs/*.md pointers inside docs/master-*.md to consolidated targets.
 * Run: node scripts/patch-master-internal-links.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const docs = (f) => join(process.cwd(), 'docs', f)

const rules = [
  [/docs\/auth-sso-backend-handoff\.md/g, 'master-security-compliance.md#auth-sso-backend-handoff'],
  [/docs\/hardening-matrix\.md/g, 'master-security-compliance.md#hardening-matrix'],
  [/docs\/sell-ready-security-evidence-index\.md/g, 'master-security-compliance.md#sell-ready-security-evidence-index'],
  [/docs\/supabase-external-hardening-checklist\.md/g, 'master-security-compliance.md#supabase-external-hardening-checklist'],
  [/docs\/compliance-mapping\.md/g, 'master-security-compliance.md#compliance-mapping'],
  [/docs\/dsar-playbook\.md/g, 'master-security-compliance.md#dsar-playbook'],
  [/docs\/gitea-operations\.md/g, 'master-security-compliance.md#gitea-operations'],
  [/docs\/email-deliverability-resend\.md/g, 'master-email-operations.md#email-deliverability-resend'],
  [/docs\/email-mailbox-privacy-runbook\.md/g, 'master-email-operations.md#email-mailbox-privacy-runbook'],
  [/docs\/email-release-checklist\.md/g, 'master-email-operations.md#email-release-checklist'],
  [/docs\/email-smoke-test-15min\.md/g, 'master-email-operations.md#email-smoke-test-15min'],
  [/docs\/lead-score-maintenance-backend\.md/g, 'master-lead-management.md#lead-score-maintenance-backend'],
  [/docs\/lead-maintenance-ops-dashboard\.md/g, 'master-lead-management.md#lead-maintenance-ops-dashboard'],
  [/docs\/lead-maintenance-runbook\.md/g, 'master-lead-management.md#lead-maintenance-runbook'],
  [/docs\/data-retention-runbook\.md/g, 'master-lead-management.md#data-retention-runbook'],
  [/docs\/design-system-and-layout\.md/g, 'master-design-ui.md#design-system-and-layout'],
  [/docs\/theme-system\.md/g, 'master-design-ui.md#theme-system'],
  [/docs\/navigation-settings-sidebar-runbook\.md/g, 'master-design-ui.md#navigation-settings-sidebar-runbook'],
  [/docs\/user-profile-display-names\.md/g, 'master-design-ui.md#user-profile-display-names'],
  [/docs\/sell-ready-release-checklist\.md/g, 'master-release-qa.md#sell-ready-release-checklist'],
  [/docs\/qa-evidence-sell-ready-baseline\.md/g, 'master-release-qa.md#qa-evidence-sell-ready-baseline'],
  [/docs\/qa-evidence-template\.md/g, 'master-release-qa.md#qa-evidence-template'],
  [/docs\/go-no-go-sell-ready-baseline\.md/g, 'master-release-qa.md#go-no-go-sell-ready-baseline'],
  [/docs\/production-handoff-checklist\.md/g, 'master-release-qa.md#production-handoff-checklist'],
  [/docs\/implementation-history-sections-01-12\.md/g, 'master-implementation-history.md#implementation-history-sections-01-12'],
  [/docs\/implementation-history\.md/g, 'master-implementation-history.md#implementation-history'],
  [/docs\/pro-roadmap-30-60-90\.md/g, 'master-roadmap-backlog.md#pro-roadmap-30-60-90'],
  [/docs\/pro-backlog\.md/g, 'master-roadmap-backlog.md#pro-backlog'],
]

const masters = [
  'master-security-compliance.md',
  'master-email-operations.md',
  'master-lead-management.md',
  'master-design-ui.md',
  'master-release-qa.md',
  'master-implementation-history.md',
  'master-roadmap-backlog.md',
]

for (const m of masters) {
  const p = docs(m)
  let s = readFileSync(p, 'utf8')
  for (const [re, to] of rules) {
    s = s.replace(re, `docs/${to}`)
  }
  writeFileSync(p, s, 'utf8')
  console.log('Patched', p)
}
