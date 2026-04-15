/**
 * One-off consolidation: merge legacy docs/*.md into docs/master-*.md
 * Run from repo root: node scripts/build-doc-masters.mjs
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

const docs = (...p) => join(process.cwd(), 'docs', ...p)

function stripFirstH1(md) {
  return md.replace(/^#\s[^\n]+\r?\n+/, '')
}

function slugify(name) {
  return basename(name, '.md').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function section(filePath, label) {
  const raw = readFileSync(filePath, 'utf8')
  const id = slugify(filePath)
  const body = stripFirstH1(raw)
  return `\n\n<a id="${id}"></a>\n## ${label}\n\n${body.trim()}\n`
}

const masters = [
  {
    out: 'master-security-compliance.md',
    title: 'Security & Compliance (master)',
    intro: `Single reference for auth/SSO contracts, hardening matrix, sell-ready evidence index, Supabase external checklist, SOC2/GDPR mapping, DSAR procedures, and Gitea CI governance.\n\n**Replaces:** auth-sso-backend-handoff, hardening-matrix, sell-ready-security-evidence-index, supabase-external-hardening-checklist, compliance-mapping, dsar-playbook, gitea-operations.`,
    parts: [
      [docs('auth-sso-backend-handoff.md'), 'Auth / SSO backend handoff'],
      [docs('hardening-matrix.md'), 'Hardening matrix (audit-ready)'],
      [docs('sell-ready-security-evidence-index.md'), 'Sell-ready security & compliance evidence index'],
      [docs('supabase-external-hardening-checklist.md'), 'Supabase external hardening checklist'],
      [docs('compliance-mapping.md'), 'Compliance mapping (SOC2 / GDPR-lite)'],
      [docs('dsar-playbook.md'), 'DSAR playbook'],
      [docs('gitea-operations.md'), 'Gitea production operations'],
    ],
  },
  {
    out: 'master-email-operations.md',
    title: 'Email operations (master)',
    intro: `Deliverability, mailbox privacy, release gates, and smoke testing for email features.\n\n**Replaces:** email-deliverability-resend, email-mailbox-privacy-runbook, email-release-checklist, email-smoke-test-15min.`,
    parts: [
      [docs('email-deliverability-resend.md'), 'Email deliverability (Resend)'],
      [docs('email-mailbox-privacy-runbook.md'), 'Email mailbox privacy runbook'],
      [docs('email-release-checklist.md'), 'Email release checklist'],
      [docs('email-smoke-test-15min.md'), 'Email 15-minute smoke test'],
    ],
  },
  {
    out: 'master-lead-management.md',
    title: 'Lead management & scoring (master)',
    intro: `Lead score maintenance backend, ops dashboard, incident runbook, and data retention for telemetry.\n\n**Replaces:** lead-score-maintenance-backend, lead-maintenance-ops-dashboard, lead-maintenance-runbook, data-retention-runbook.`,
    parts: [
      [docs('lead-score-maintenance-backend.md'), 'Lead score maintenance — backend contract'],
      [docs('lead-maintenance-ops-dashboard.md'), 'Lead maintenance — Ops dashboard'],
      [docs('lead-maintenance-runbook.md'), 'Lead maintenance — runbook'],
      [docs('data-retention-runbook.md'), 'Data retention runbook'],
    ],
  },
  {
    out: 'master-design-ui.md',
    title: 'Design system & UI (master)',
    intro: `Layout shells, theme, navigation/settings sidebar, and profile display names.\n\n**Replaces:** design-system-and-layout, theme-system, navigation-settings-sidebar-runbook, user-profile-display-names.`,
    parts: [
      [docs('design-system-and-layout.md'), 'Design system and layout'],
      [docs('theme-system.md'), 'Theme system'],
      [docs('navigation-settings-sidebar-runbook.md'), 'Navigation (Settings + Sidebar) runbook'],
      [docs('user-profile-display-names.md'), 'User profile display names'],
    ],
  },
  {
    out: 'master-release-qa.md',
    title: 'Release & QA (master)',
    intro: `Sell-ready checklists, QA evidence, go/no-go records, and production handoff.\n\n**Replaces:** sell-ready-release-checklist, qa-evidence-sell-ready-baseline, qa-evidence-template, go-no-go-sell-ready-baseline, production-handoff-checklist.`,
    parts: [
      [docs('sell-ready-release-checklist.md'), 'Sell-ready release checklist'],
      [docs('qa-evidence-sell-ready-baseline.md'), 'QA evidence — sell-ready baseline'],
      [docs('qa-evidence-template.md'), 'QA evidence template'],
      [docs('go-no-go-sell-ready-baseline.md'), 'Go / No-Go — sell-ready baseline'],
      [docs('production-handoff-checklist.md'), 'Production handoff checklist'],
    ],
  },
  {
    out: 'master-implementation-history.md',
    title: 'Implementation history (master)',
    intro: `Full chronological handoff (foundation Part A + delivery Part B).\n\n**Replaces:** implementation-history-sections-01-12, implementation-history (Part B).`,
    parts: [
      [docs('implementation-history-sections-01-12.md'), 'Part A — Sections 1–12 (foundation)'],
      [docs('implementation-history.md'), 'Part B — Sections 13–21 (recent waves)'],
    ],
  },
  {
    out: 'master-roadmap-backlog.md',
    title: 'Roadmap & backlog (master)',
    intro: `30/60/90 roadmap plus execution backlog in one place.\n\n**Replaces:** pro-roadmap-30-60-90, pro-backlog.`,
    parts: [
      [docs('pro-roadmap-30-60-90.md'), 'Roadmap (30 / 60 / 90 days)'],
      [docs('pro-backlog.md'), 'PRO backlog (execution board)'],
    ],
  },
]

for (const m of masters) {
  let toc = '## Table of contents\n\n'
  const bodies = []
  for (const [fp, label] of m.parts) {
    if (!existsSync(fp)) throw new Error(`Missing: ${fp}`)
    const id = slugify(fp)
    toc += `- [${label}](#${id})\n`
    bodies.push(section(fp, label))
  }
  const outPath = docs(m.out)
  const md =
    `# ${m.title}\n\n` +
    `> Consolidated **2026-04-15**. ${m.intro}\n\n` +
    toc +
    '\n---\n' +
    bodies.join('\n---\n')
  writeFileSync(outPath, md, 'utf8')
  console.log('Wrote', outPath)
}

const remove = [
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

for (const f of remove) {
  const p = docs(f)
  if (existsSync(p)) {
    unlinkSync(p)
    console.log('Removed', p)
  }
}

console.log('Done. Update docs/README.md manually or extend this script.')
