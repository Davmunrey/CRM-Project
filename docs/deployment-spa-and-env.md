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
| [`vercel.json`](../vercel.json) (`rewrites` → `index.html`) | Legacy reference only — **not** required for private deploys |

**Verify after deploy:** open `/deals` and `/settings` in a new tab (hard refresh). You should see the app shell or auth redirect, never a raw `404` HTML page from the CDN.

## Build-time environment (DEPLOY-02)

Vite inlines variables prefixed with `VITE_` at **build** time. Configure **separate values** for production vs staging in your CI pipeline or secrets store for the static host (not tied to a specific SaaS dashboard).

| Variable | Used in |
|----------|---------|
| `VITE_APP_CHANNEL` | [`src/lib/envChannel.ts`](../src/lib/envChannel.ts) — `production` \| `staging` \| `demo`; omit locally → `development` |
| `VITE_SUPABASE_URL` | [`src/lib/supabase.ts`](../src/lib/supabase.ts) |
| `VITE_SUPABASE_ANON_KEY` | Same |

**Build:** `vite build` rejects **production** and **staging** channels unless Supabase env vars are valid ([`vite.config.ts`](../vite.config.ts)). **demo** channel allows a bundle without Supabase (offline mock for static hosting).

**Runtime:** `production` / `staging` without Supabase show the bootstrap fatal screen (`isBootstrapFatalError` in [`src/lib/supabase.ts`](../src/lib/supabase.ts)). `demo` without Supabase enables offline mock. Local `npm run dev` defaults to `development`.

Local template: [`.env.example`](../.env.example).

## Staging vs production Supabase (DEPLOY-03)

- Set **`VITE_APP_CHANNEL=staging`** on staging / UAT builds so the UI banner and build-time checks match a non-production Supabase project.
- Point **staging** builds at a **staging** Supabase project (or isolated branch DB), not production anon keys.
- Add every **staging and production origin** you use (your real hostnames, e.g. `https://crm-staging.example.com`) to **Supabase Auth → URL configuration** redirect allowlist as needed.
- Align Gmail OAuth and Edge Function **CORS** with the same origins (see [`.planning/research/gmail-ai-features.md`](../.planning/research/gmail-ai-features.md) if present).

## Pipeline and smoke (DEPLOY-04)

- Deploy from your protected release branch (e.g. `main`) using **your** pipeline (self-hosted runner, private Git forge, etc.) with a recorded pass of [Smoke checklist — production](./smoke-checklist-production.md).

## Custom domain + TLS (DEPLOY-05)

Follow your DNS and certificate process (e.g. ACME on the reverse proxy, or certificates from your CDN) after the first successful deploy to the private static host.

<a id="offline-demo-mode"></a>

## Offline demo mode

Velo supports a **hosted demo** bundle and **local offline demo** when Supabase is not configured. Runtime resolution lives in [`src/lib/supabase.ts`](../src/lib/supabase.ts).

### Runtime labels

- `supabase`: real authentication and persistence (production/staging style).
- `offline_demo`: mock auth + seed data, no Supabase backend required.
- `unconfigured`: Supabase missing and demo mode not enabled.

### Environment variables (demo)

- `VITE_APP_CHANNEL=demo`: builds a hosted demo bundle.
- `VITE_ALLOW_DEMO_MODE=true`: enables local offline demo when Supabase is not configured.
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`: required for **production** and **staging** channels (see [Build-time environment](#build-time-environment-deploy-02)).

### Privacy (demo)

- Login UI must not expose demo credentials, account hints, or personal names.
- Seed-facing identity stays generic (for example `demo.admin@example.com`, `Demo Admin`).
- Public-facing offline seed records should avoid company-identifiable names and domains.

### Parity checklist (demo vs production)

- Data shapes match production models (`types`, stores, and mappers).
- Offline leads include scoring rules and seed events aligned with migration defaults.
- Sequence seeds include `flowDefinition` and enrollment examples.
- Notifications and references use valid seed IDs (`u*`, `d*`, `a*`).
- Realtime-only features degrade gracefully in offline mode.

### Quick verification

1. `npm run build` and `npm run test:run`.
2. Smoke in demo mode: auth, leads, sequences (flow tab + enrollments), notifications, contacts / companies / deals, reports.

### Known limitations (offline demo)

- No edge functions (`promote-lead`, sequence workers, maintenance jobs) execute.
- No live Gmail OAuth / send / refresh.
- No Supabase Realtime sync; stores run local seed behavior.

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

*Last updated (git): **2026-04-22***
