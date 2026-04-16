# Static hosting: SPA routing and build-time env

This document implements **`DEPLOY-01`** and **`DEPLOY-02`** intent from [`.planning/REQUIREMENTS.md`](../.planning/REQUIREMENTS.md): client-side routes must resolve on cold load, and Supabase client env vars must exist per environment.

## SPA fallback (DEPLOY-01)

Checked-in examples (use what matches your host):

| Artifact | Host / CDN |
|----------|------------|
| [`vercel.json`](../vercel.json) (`rewrites` → `index.html`) | Vercel |
| [`public/_redirects`](../public/_redirects) (`/*` → `/index.html` `200`) | Netlify; copied to `dist/` by Vite |

Other providers: configure their equivalent (S3+CloudFront error document, nginx `try_files`, etc.).

**Verify after deploy:** open `/deals` and `/settings` in a new tab (hard refresh). You should see the app shell or auth redirect, never a raw `404` HTML page from the CDN.

## Build-time environment (DEPLOY-02)

Vite inlines variables prefixed with `VITE_` at **build** time. Configure **separate values** for production vs preview/staging in your CI or hosting dashboard.

| Variable | Used in |
|----------|---------|
| `VITE_APP_CHANNEL` | [`src/lib/envChannel.ts`](../src/lib/envChannel.ts) — `production` \| `staging` \| `demo`; omit locally → `development` |
| `VITE_SUPABASE_URL` | [`src/lib/supabase.ts`](../src/lib/supabase.ts) |
| `VITE_SUPABASE_ANON_KEY` | Same |

**Build:** `vite build` rejects **production** and **staging** channels unless Supabase env vars are valid ([`vite.config.ts`](../vite.config.ts)). **demo** channel allows a bundle without Supabase (offline mock for static hosting).

**Runtime:** `production` / `staging` without Supabase show the bootstrap fatal screen (`isBootstrapFatalError` in [`src/lib/supabase.ts`](../src/lib/supabase.ts)). `demo` without Supabase enables offline mock. Local `npm run dev` defaults to `development`.

Local template: [`.env.example`](../.env.example).

## Preview vs production Supabase (DEPLOY-03)

- Set **`VITE_APP_CHANNEL=staging`** on preview / UAT pipelines so the UI banner and build-time checks match a non-production Supabase project.
- Point **preview** builds at a **staging** Supabase project (or isolated branch DB), not production anon keys.
- Add every preview origin (e.g. `https://*.vercel.app`) to **Supabase Auth → URL configuration** redirect allowlist as needed.
- Align Gmail OAuth and Edge Function **CORS** with the same origins (see [`.planning/research/gmail-ai-features.md`](../.planning/research/gmail-ai-features.md) if present).

## Pipeline and smoke (DEPLOY-04)

- Deploy from your protected release branch (e.g. `main`) with a recorded pass of [Smoke checklist — production](./smoke-checklist-production.md).

## Custom domain + TLS (DEPLOY-05)

Follow your host’s DNS and certificate flow after the first successful deploy.

---

*See also [`project-state.md`](./project-state.md) and [`master-release-qa.md`](./master-release-qa.md#production-handoff-checklist).*
