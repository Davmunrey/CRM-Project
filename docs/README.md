# CRM documentation

**Canonical index:** everything that used to live across ~28 topic files is now **7 master documents** (consolidated 2026-04-15). Edit these files directly; the one-time merge script is `scripts/build-doc-masters.mjs` (requires restoring legacy paths from git history if you ever re-run it).

## Document control

- **Status:** Active  
- **Owner:** Engineering  
- **Last updated:** 2026-04-15  
- **Canonical:** Yes  

---

## Status snapshot

| Area | State | Master document |
|------|--------|-------------------|
| Security, compliance, SSO, Gitea, evidence | Baseline shipped Apr 2026 + external sign-offs per env | [`master-security-compliance.md`](./master-security-compliance.md) |
| Email (deliverability, privacy, release, smoke) | Active runbooks | [`master-email-operations.md`](./master-email-operations.md) |
| Lead maintenance, scoring backend, retention | Ops + telemetry + retention policy | [`master-lead-management.md`](./master-lead-management.md) |
| Design system, theme, navigation, profiles | UI reference | [`master-design-ui.md`](./master-design-ui.md) |
| Release, QA, go/no-go, production handoff | Gates and evidence | [`master-release-qa.md`](./master-release-qa.md) |
| Implementation history (full handoff) | Part A + Part B merged | [`master-implementation-history.md`](./master-implementation-history.md) |
| Roadmap 30/60/90 + execution backlog | Forward plan | [`master-roadmap-backlog.md`](./master-roadmap-backlog.md) |

---

## Other entry points

- Main app overview: [`../README.md`](../README.md)  
- Supabase SQL and migrations: [`../supabase/README.md`](../supabase/README.md)  

---

## Conventions

- Prefer editing **master-*.md**; avoid resurrecting one-off filenames unless a master grows unwieldy and you split with intent.  
- Cross-links inside masters use `docs/master-….md#section-id` anchors.  
