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
| `VITE_SUPABASE_URL` | [`src/lib/supabase.ts`](../src/lib/supabase.ts) |
| `VITE_SUPABASE_ANON_KEY` | Same |

Production builds **fail closed** if these are missing when `import.meta.env.PROD` is true (`isBootstrapFatalError`).

Local template: [`.env.example`](../.env.example).

## Preview vs production Supabase (DEPLOY-03)

- Point **preview** builds at a **staging** Supabase project (or isolated branch DB), not production anon keys.
- Add every preview origin (e.g. `https://*.vercel.app`) to **Supabase Auth → URL configuration** redirect allowlist as needed.
- Align Gmail OAuth and Edge Function **CORS** with the same origins (see [`.planning/research/gmail-ai-features.md`](../.planning/research/gmail-ai-features.md) if present).

## Pipeline and smoke (DEPLOY-04)

- Deploy from your protected release branch (e.g. `main`) with a recorded pass of [Smoke checklist — production](./smoke-checklist-production.md).

## Custom domain + TLS (DEPLOY-05)

Follow your host’s DNS and certificate flow after the first successful deploy.

---

*See also [`project-state.md`](./project-state.md) and [`master-release-qa.md`](./master-release-qa.md#production-handoff-checklist).*
