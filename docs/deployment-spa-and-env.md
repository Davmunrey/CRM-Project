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

---

*See also [`project-state.md`](./project-state.md) and [`master-release-qa.md`](./master-release-qa.md#production-handoff-checklist).*
---

*Last updated (git): **2026-04-21***
