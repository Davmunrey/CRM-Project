# Checkbox ownership matrix

This document maps **unchecked `- [ ]` clusters** across `docs/master-*.md`, `.planning/phases/*`, and `.planning/REQUIREMENTS.md` to **who closes them** and **what kind of work** is required (code, dashboard, evidence, or legal). Use it so engineering does not chase ops-only rows, and ops does not wait on code for human evidence.

| Cluster / document | Typical IDs or rows | Owner | Close requires |
|--------------------|---------------------|-------|----------------|
| `.planning/REQUIREMENTS.md` — `AUTH-*`, `SEC-*`, product features | Auth flows, RLS, UI gates | Engineering | Code + tests; some rows need **Supabase dashboard** (Auth settings, URLs) |
| `.planning/REQUIREMENTS.md` — `DEPLOY-01`–`DEPLOY-05` | Static host, SPA rewrites, TLS, preview vs prod | Ops + Engineering | **Evidence** (host, channel, Supabase project, smoke result, commit) pasted per REQUIREMENTS template; not `[x]` without human sign-off |
| `docs/smoke-checklist-production.md` | Post-deploy smoke | Ops / release | **Manual run** + note in STATE or release ticket |
| `docs/master-release-qa.md` — Production handoff | Go/no-go matrices | PM + Ops + Eng | Mixed: code fixes vs **human QA** sign-off |
| `docs/master-security-compliance.md` | DSAR, SOC mapping, buyer checklist | Security / Legal + Ops | **Runbooks + evidence**; many rows are not repo code |
| `docs/master-email-operations.md` | DNS, Resend, deliverability | Ops | **Dashboard + DNS**; link evidence in masters when done |
| `docs/google-gmail-oauth-verification.md` | Google Cloud verification | Product + Ops + Eng | **Google Cloud / OAuth** console work + app updates |
| `.planning/phases/*-VALIDATION.md` | “Done when” SQL, `nyquist_compliant` | Engineering + DBA | One-time **verify** then tick or mark **archived / not blocking** |
| `docs/master-roadmap-backlog.md` | SSO, webhooks v1, DSR, enterprise | Product | **Roadmap slices**; do not flatten into one sprint |

## i18n locales FR / DE / IT

The app ships **EN** (source), **ES**, and **PT** with full catalogs. **FR, DE, IT** (when present) intentionally **spread English** keys until native strings are added: parity is enforced by `npm run i18n:lint` on changed files; do not block releases on FR/DE/IT native copy unless product prioritizes those locales.

## Related links

- Bridge and gaps: [`project-state.md`](./project-state.md)
- Deploy intent (vendor-neutral): [`deployment-spa-and-env.md`](./deployment-spa-and-env.md)
- Milestones: [`.planning/ROADMAP.md`](../.planning/ROADMAP.md) · [`.planning/STATE.md`](../.planning/STATE.md) · [`.planning/REQUIREMENTS.md`](../.planning/REQUIREMENTS.md)
