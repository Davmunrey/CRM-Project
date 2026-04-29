# Static hosting: SPA routing and build-time env

This document implements **`DEPLOY-01`** and **`DEPLOY-02`** intent from [`.planning/REQUIREMENTS.md`](../.planning/REQUIREMENTS.md): client-side routes must resolve on cold load, and Supabase client env vars must exist per environment.

**Target hosting:** private or self-operated static infrastructure (e.g. VPS + nginx/Caddy, object storage + CDN). Vercel is **not** assumed as the production platform; examples below are ordered with that in mind.

## SPA fallback (DEPLOY-01)

Configure **your** reverse proxy or CDN so unknown paths under the app origin serve `index.html` (React Router). Typical patterns:

| Pattern | Where |
|--------|--------|
| nginx `location / { try_files $uri $uri/ /index.html; }` | Private VPS / VM |
| Caddy `try_files { path } /index.html` | Private VPS |
| S3 website / CloudFront custom error → `/index.html` | Bucket + CDN |

Optional checked-in artifacts (use only if they match a host you actually use):

| Artifact | Host / CDN |
|----------|------------|
| [`public/_redirects`](../public/_redirects) (`/*` → `/index.html` `200`) | Netlify; copied to `dist/` by Vite |
| [`public/_headers`](../public/_headers) | Netlify (and similar) — baseline security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`); copied to `dist/` by Vite |
| [`vercel.json`](../vercel.json) | SPA **rewrites** to `index.html` when you host on Vercel; also sets the **same baseline security headers** for HTML/asset responses on that platform. For fully private static hosting, mirror the header intent in nginx/Caddy (see [Supabase external checklist — SPA transport](./master-security-compliance.md#supabase-external-hardening-checklist)). |

**Verify after deploy:** open `/deals` and `/settings` in a new tab (hard refresh). You should see the app shell or auth redirect, never a raw `404` HTML page from the CDN.

## Build-time environment (DEPLOY-02)

Vite inlines variables prefixed with `VITE_` at **build** time. Configure **separate values** for production vs staging in your CI pipeline or secrets store for the static host (not tied to a specific SaaS dashboard).

| Variable | Used in |
|----------|---------|
| `VITE_APP_CHANNEL` | [`src/lib/envChannel.ts`](../src/lib/envChannel.ts) — optional explicit **`production`** or **`staging`**. If unset, the channel follows Vite `MODE` (`vite build` defaults to **production** unless you pass `--mode staging` or `--mode development`). Local `npm run dev` resolves to **`development`**. Values other than `production` / `staging` are **not** first-class channels (for example a stray `demo` string does not enable a mock bundle). |
| `VITE_SUPABASE_URL` | [`src/lib/supabase.ts`](../src/lib/supabase.ts) |
| `VITE_SUPABASE_ANON_KEY` | Same |

**Build gate:** When the resolved channel is **`production`** or **`staging`**, `vite build` fails unless `VITE_SUPABASE_URL` (must start with `https://`) and `VITE_SUPABASE_ANON_KEY` validate ([`vite.config.ts`](../vite.config.ts)). Use `vite build --mode development` only for **compile-only CI**; release and preview hosts must still inject real Supabase keys for production/staging modes.

**Runtime (`dataRuntime`):** [`src/lib/supabase.ts`](../src/lib/supabase.ts) exports `dataRuntime` as `supabase` \| `unconfigured`, `supabase` as a client or `null`, and `isBootstrapFatalError` when a **production** bundle has no valid env. There is **no** offline mock CRM: **`unconfigured`** means auth and data paths stay disabled (local dev logs a console warning).

**Shell banner:** [`EnvironmentBanner.tsx`](../src/components/layout/EnvironmentBanner.tsx) shows the staging strip only when `appChannel === 'staging'`.

Local template: [`.env.example`](../.env.example).

## Staging vs production Supabase (DEPLOY-03)

- Set **`VITE_APP_CHANNEL=staging`** on staging / UAT builds so the UI banner and build-time checks match a non-production Supabase project.
- Point **staging** builds at a **staging** Supabase project (or isolated branch DB), not production anon keys.
- Add every **staging and production origin** you use (your real hostnames, e.g. `https://crm-staging.example.com`) to **Supabase Auth → URL configuration** redirect allowlist as needed.
- Align Gmail OAuth and Edge Function **CORS** with the same origins. **Google OAuth client + Supabase Edge** (secrets, deploy, redirect list): [`google-gmail-oauth-verification.md`](./google-gmail-oauth-verification.md#operator-setup-google-oauth). Optional: set Edge secret **`EDGE_CORS_ORIGINS`** (comma-separated exact browser origins) so authenticated Edge calls from the SPA use a tightened CORS policy instead of `*` — see [`.env.example`](../.env.example) and [`master-security-compliance.md` §3](./master-security-compliance.md#supabase-external-hardening-checklist). Optional research context: [`.planning/research/gmail-ai-features.md`](../.planning/research/gmail-ai-features.md) if present.

## Pipeline and smoke (DEPLOY-04)

- Deploy from your protected release branch (e.g. `main`) using **your** pipeline (self-hosted runner, private Git forge, etc.) with a recorded pass of [Smoke checklist — production](./smoke-checklist-production.md).

## Custom domain + TLS (DEPLOY-05)

Follow your DNS and certificate process (e.g. ACME on the reverse proxy, or certificates from your CDN) after the first successful deploy to the private static host.

<a id="offline-demo-mode"></a>

## Supabase-only runtime (legacy anchor: offline demo)

Older documentation described a **`demo`** deploy channel and **`VITE_ALLOW_DEMO_MODE`** for a local mock CRM. **That stack is removed.** The canonical model is:

- **Hosted `production` / `staging`:** always ship valid `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (separate Supabase projects per environment).
- **Local `development`:** point the same vars at a dev project; without them, `supabase` stays `null` and the app does not impersonate tenants.
- **Training / sales demos:** use a disposable Supabase project and seed orgs through normal product flows (or SQL migrations), not a client-only mock.

### Quick verification

1. `npm run build` with production-like env (or `npm run build -- --mode development` for compile-only checks) plus `npm run test:run`.
2. Smoke on a real project: auth, core entities, sequences, notifications per your release matrix.

<a id="e2e-integrations-smoke"></a>

## Optional: Playwright API and lead-capture smoke

The suite [`e2e/integrations-api-capture.spec.ts`](../e2e/integrations-api-capture.spec.ts) exercises the real Supabase stack: password login, `api-keys`, `crm-public-api`, `lead-capture-tokens`, and `lead-capture`. It does **not** start the Vite preview server; it uses Playwright’s **request** fixture only.

### Hosted-only (typical)

**End users:** nothing here is required. They use the normal Velo URL and **Settings → Integrations**; API keys and lead tokens are created in the browser.

**CI (optional):** add the five `E2E_*` repository secrets so the job talks directly to `https://…supabase.co` (Auth + Functions). It does **not** need your marketing site URL or `npm run dev`.

### Prerequisites

- Edge Functions deployed: `api-keys`, `crm-public-api`, `lead-capture`, `lead-capture-tokens` (see [`../supabase/README.md`](../supabase/README.md)).
- A Supabase user with **email + password** enabled.
- That user is `admin`, `owner`, or `manager` in the target organization.
- You know the organization UUID (`organizations.id`).

### Local run (developers only)

1. Copy [`.env.e2e.example`](../.env.e2e.example) to `.env.e2e` and fill values (`.env.e2e` is gitignored).
2. Node **20+** (repo uses 22): `node --env-file` loads the file.
3. Install browsers once: `npx playwright install chromium`
4. Run `npm run test:e2e:integrations:local`, or `npm run test:e2e:integrations` without `.env.e2e` (tests **skip** so CI and forks stay green).

### Multi-tenant note

Velo allows **many organizations** in one Supabase project. This suite is a **smoke check** against the live API using **one** org and user from env vars; it does **not** mean only one company can use the product.

| Scenario | Guidance |
|----------|----------|
| Developers | Each keeps a private `.env.e2e` with their test user and any org they may manage. |
| Staging vs production | Prefer separate `E2E_SUPABASE_*` and org/user; GitHub **Environments** help isolate staging smoke from production credentials. |
| Forks / external contributors | No secrets → tests skip (green). |

### CI secrets (all five required for the step to run)

| Secret | Description |
|--------|-------------|
| `E2E_SUPABASE_URL` | `https://<project-ref>.supabase.co` (no trailing slash) |
| `E2E_SUPABASE_ANON_KEY` | Anon public key (Settings → API) |
| `E2E_USER_EMAIL` | Test user email |
| `E2E_USER_PASSWORD` | Test user password |
| `E2E_ORGANIZATION_ID` | UUID of the organization |

### After deploy

- **Hosted-only workflow:** push to a branch whose CI has the five secrets; the workflow runs the smoke step (or use `workflow_dispatch` if configured).
- **Local debug:** `npm run test:e2e:integrations:local` as above.

Failures usually mean: wrong org id, user not privileged, functions not deployed, or email auth disabled for the project.

---

*See also [`project-state.md`](./project-state.md) and [`master-release-qa.md`](./master-release-qa.md#production-handoff-checklist).*
---

*Last updated (git): **2026-04-29***

## Vercel deployment (`davmunreys-projects/velo-crm`)

This project deploys as a **pure static SPA** on Vercel. There are no serverless functions — the `/api/` directory has been removed. `vercel.json` only contains SPA rewrites and security headers.

### Environment variables (Project → Settings → Environment Variables)

All three environments (Production, Preview, Development) have been configured as follows:

| Variable | Environments | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Production, Preview, Development | Was already set for Production; Preview + Development added 2026-04-29 |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview, Development | Was already set for Production; Preview + Development added 2026-04-29 |
| `VITE_GMAIL_REDIRECT_URI` | Production, Preview, Development | Value: `https://velo-crm-taupe.vercel.app/auth/gmail/callback` — added 2026-04-29 |

> **Important:** `VITE_GMAIL_REDIRECT_URI` must always point to the **production domain** (`https://velo-crm-taupe.vercel.app`). Vercel preview deployments work via a redirect through the production callback — see `docs/google-gmail-oauth-verification.md`.

### Supabase Edge Function secrets

These go in Supabase Dashboard → Edge Functions → Secrets (or `supabase secrets set`):

| Secret | Notes |
|---|---|
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth Web client ID |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth Web client secret |
| `TOKEN_ENCRYPTION_KEY` | 64 hex chars. Do not rotate without migration — rotating invalidates all stored refresh tokens. |
| `GOOGLE_OAUTH_REDIRECT_URIS` | CSV: production callback URL (+ localhost for dev) |
| `GOOGLE_OAUTH_ORIGIN_ALLOWLIST` | CSV of regex patterns for allowed preview origins (see `docs/google-gmail-oauth-verification.md`). Set 2026-04-29. |
| `EDGE_CORS_ORIGINS` | Comma-separated exact browser origins allowed to call Edge functions. **Configured 2026-04-29:** `https://velo-crm-taupe.vercel.app`, `https://velo-crm-davmunreys-projects.vercel.app`, `https://velo-crm-davmunrey-davmunreys-projects.vercel.app`, `https://velo-crm-two.vercel.app`, `http://localhost:5173`, `http://localhost:4173`. GitHub secret also updated so CI does not overwrite. |
