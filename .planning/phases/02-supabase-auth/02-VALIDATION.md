> [!NOTE]
> **Historical snapshot:** This phase artifact is preserved for audit and may be outdated. Current source of truth: `.planning/STATE.md` and `.planning/ROADMAP.md`.

---
phase: 2
slug: supabase-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 2 — Validation Strategy

> Per-phase validation contract. Phase 2 introduces auth wiring and is the first phase with automated unit tests (Vitest + RTL).

> **Superseded (2026-04-21):** Vitest, RTL, `tests/setup.ts`, auth tests, and GitHub Actions CI are **already present** in the repository. Tables below that still show “not yet installed” or ❌ Wave 0 are **historical snapshots** only; do not use them to plan installs.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Testing Library (installed — see `package.json`) |
| **Config file** | `vite.config.ts` — includes `test` block |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npm run test:run` or `npx vitest run` |
| **Estimated runtime** | Order of tens of seconds (grows with suite) |

---

## Sampling Rate

- **After every task commit:** `npx vitest run --reporter=verbose` (once Wave 0 installs Vitest)
- **After every plan wave:** Full suite `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2.0-vitest-setup | W0 | 0 | TEST-01 | infra | `npx vitest run` exits 0 | ❌ W0 | ⬜ pending |
| 2.1-signup | 2.1 | 1 | AUTH-01 | unit | `npx vitest run tests/auth/Register.test.tsx` | ❌ W0 | ⬜ pending |
| 2.1-verify-email | 2.1 | 1 | AUTH-02 | unit | `npx vitest run tests/auth/Register.test.tsx` | ❌ W0 | ⬜ pending |
| 2.2-login | 2.2 | 1 | AUTH-01 | unit | `npx vitest run tests/auth/Login.test.tsx` | ❌ W0 | ⬜ pending |
| 2.2-oas | 2.2 | 1 | AUTH-04 | unit | `npx vitest run tests/auth/authStore.test.ts` | ❌ W0 | ⬜ pending |
| 2.3-forgot-pw | 2.3 | 2 | AUTH-03 | unit | `npx vitest run tests/auth/ForgotPassword.test.tsx` | ❌ W0 | ⬜ pending |
| 2.3-reset-pw | 2.3 | 2 | AUTH-03 | unit | `npx vitest run tests/auth/ResetPassword.test.tsx` | ❌ W0 | ⬜ pending |
| 2.4-loading-guard | 2.4 | 2 | AUTH-04 | unit | `npx vitest run tests/auth/ProtectedRoute.test.tsx` | ❌ W0 | ⬜ pending |
| 2.5-logout | 2.5 | 2 | AUTH-05 | unit | `npx vitest run tests/auth/authStore.test.ts` | ❌ W0 | ⬜ pending |
| 2.x-sec01 | 2.2 | 1 | SEC-01 | manual | Code inspection — simpleHash not called | N/A | ⬜ pending |
| 2.x-sec06 | 2.1 | 1 | SEC-06 | unit | `npx vitest run tests/lib/supabase.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> **Superseded (2026-04-21):** All items below are **done** in the current repo (scripts, config, and test files exist). Unchecked boxes are retained only as a historical record of the original Phase 2 gate wording.

- [x] `package.json` — test script and Vitest / RTL / jsdom devDependencies
- [x] `vite.config.ts` — `test` block with jsdom + `tests/setup.ts`
- [x] `tests/setup.ts` — `@testing-library/jest-dom` + Supabase mock setup
- [x] `tests/auth/authStore.test.ts` — AUTH-01, AUTH-04, AUTH-05 coverage
- [x] `tests/auth/Register.test.tsx` — AUTH-01, AUTH-02
- [x] `tests/auth/Login.test.tsx` — AUTH-01
- [x] `tests/auth/ForgotPassword.test.tsx` — AUTH-03
- [x] `tests/auth/ResetPassword.test.tsx` — AUTH-03
- [x] `tests/auth/ProtectedRoute.test.tsx` — AUTH-04
- [x] `tests/lib/supabase.test.ts` — SEC-06

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email delivered to inbox | AUTH-02 | Requires live Supabase + real email | Register with real email; check inbox for verification link |
| Password reset email works | AUTH-03 | Requires live Supabase + email delivery | Submit ForgotPassword form; click link in email; verify new password works |
| Session survives hard refresh | AUTH-04 | Requires real browser | Log in, press Ctrl+Shift+R; confirm dashboard loads without /login flash |
| Back button blocked after logout | AUTH-05 | Requires real browser | Log in, log out, press Back; confirm /login shown not dashboard |

---

## Validation Sign-Off

> **Superseded (2026-04-21):** Wave 0 deliverables exist in-repo; CI runs Vitest. Remaining items are **process** (manual smoke on live Supabase, frontmatter archival) if you still use this file for audits.

- [x] Wave 0 installs Vitest and creates auth test files *(repository state)*
- [x] Automated tests pass in CI — see `.github/workflows/ci.yml`
- [ ] Manual browser tests verified against live Supabase project *(human, when re-validating)*
- [ ] `simpleHash` code path confirmed unreachable when Supabase is configured *(re-verify on demand)*
- [ ] `nyquist_compliant: true` set in frontmatter *(archival — optional)*

**Approval:** historical phase artifact — see `.planning/STATE.md` for current status.
