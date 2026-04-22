# E2E smoke: API & capture (Supabase)

This suite (`e2e/integrations-api-capture.spec.ts`) exercises the real Supabase stack: password login, `api-keys`, `crm-public-api`, `lead-capture-tokens`, and `lead-capture`. It does **not** start the Vite preview server; it uses Playwright’s `request` fixture only.

## Hosted CRM only (no local app)

**End users and day-to-day use of the deployed site:** Nothing from this document is required. People open your **web URL**, sign in with Supabase auth, and use **Settings → Integrations** as usual. API keys and lead tokens are created in the browser; there is no `.env.e2e` and no Playwright on their machines.

**What actually runs “in the cloud” when you deploy:**

| Piece | Where it lives |
|-------|----------------|
| SPA (CRM UI) | Your static host (e.g. Vercel, Netlify, S3+CDN) with **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** (public, not secrets in the sense of passwords). |
| Backend | Supabase (DB, Auth, Edge Functions). You deploy functions/migrations from CI or CLI — same as today. |
| This E2E smoke | **Optional.** It runs in **CI** (GitHub Actions / Gitea) when you add the five **`E2E_*`** repository secrets. It talks **directly** to `https://…supabase.co` (Auth + Functions). It does **not** need your marketing URL or a local `npm run dev`. |

So: **“everything on the web”** = normal hosting + Supabase. **E2E secrets** = only in the **CI** secret store of the repo that builds/tests the project (or a dedicated QA job), not on every employee’s laptop.

## Prerequisites

- Edge Functions deployed: `api-keys`, `crm-public-api`, `lead-capture`, `lead-capture-tokens` (see `supabase/README.md`).
- A Supabase user with **email + password** enabled.
- That user is `admin`, `owner`, or `manager` in the target organization.
- You know the organization UUID (`organizations.id`).

## Optional: local run (developers only)

Use this only if someone wants to run the same smoke test **from a laptop** before opening a PR. **Not required** for a fully hosted workflow.

1. Copy `.env.e2e.example` to `.env.e2e` and fill values (`.env.e2e` is gitignored).
2. Node **20+** (repo uses 22): `node --env-file` loads the file.
3. Install browsers once: `npx playwright install chromium`
4. Run:

```bash
npm run test:e2e:integrations:local
```

Without `.env.e2e`, use:

```bash
npm run test:e2e:integrations
```

If env vars are unset, the test **skips** (so CI and forks stay green).

## Multiple organizations, teams, and deployments

**Product behavior (Velo):** In a single Supabase project you can have **many organizations** (“companies”). Each organization has its own API keys and lead-capture tokens. Nothing in the app limits you to one company.

**What this E2E suite does:** It is a **smoke check** against the live API. Each run uses **one** org and **one** user, chosen only by env vars (`E2E_ORGANIZATION_ID` + that user’s membership). It does **not** mean only one company can use the CRM.

**Colleagues / more companies:**

| Scenario | What to do |
|----------|------------|
| **Developer A vs B** | Each keeps a private `.env.e2e` (gitignored) with **their** test user and **any** org they are allowed to manage. Same repo, different local files. |
| **Company A vs B (same hosted CRM)** | Same Supabase URL/anon key; **different** `E2E_ORGANIZATION_ID` and users if you want separate smoke tenants. Or one shared **staging** org for CI only. |
| **Forks / external contributors** | No secrets → test **skips**; they still get green CI. |
| **Your prod vs staging project** | Use **different** `E2E_SUPABASE_*` (and user/org) per environment. On GitHub, prefer **Environments** (e.g. `staging`) with a separate secret set so staging smoke never touches production credentials. |
| **Another Gitea / GitHub repo** (e.g. per customer fork) | Configure that repo’s **own** five secrets pointing at **that** deployment’s Supabase + test org. |

**CI convention:** Repository secrets usually point at **one** reference tenant (e.g. staging). That is enough to guard regressions for **all** tenants sharing the same codebase, because Edge Function behavior is shared; org-specific data is still isolated by `organization_id` at runtime.

## CI secrets (GitHub Actions / Gitea Actions)

Add these repository **secrets** so the optional CI step runs and the test does not skip:

| Secret | Description |
|--------|-------------|
| `E2E_SUPABASE_URL` | `https://<project-ref>.supabase.co` (no trailing slash) |
| `E2E_SUPABASE_ANON_KEY` | Anon public key (Settings → API) |
| `E2E_USER_EMAIL` | Test user email |
| `E2E_USER_PASSWORD` | Test user password |
| `E2E_ORGANIZATION_ID` | UUID of the organization |

**All five** must be set; otherwise the workflow skips Playwright install and the smoke step (same behavior as before).

## Verify after deploy

- **Hosted-only workflow:** After changing Edge Functions or RLS, push to a branch where CI has the five **`E2E_*`** secrets configured; the workflow runs the smoke step automatically (or trigger the workflow manually if your setup uses `workflow_dispatch`).
- **Optional local debug:** Run `npm run test:e2e:integrations:local` as in the section above.

Failures often mean: wrong org id, user not privileged, functions not deployed, or email auth disabled for the project.
