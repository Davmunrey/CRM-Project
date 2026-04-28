# Contributing to Velo

## Quick start

- **Node** 20+ and **npm** 10+
- `npm install`
- Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (optional for full auth/data in dev; see [README](README.md))
- `npm run dev` — app on [http://localhost:5174](http://localhost:5174) (see `vite.config.ts`)

## Quality gates (run before a PR)

- `npm run ui:lint` — design tokens / color guardrails
- `npm run i18n:lint` — no stray user-facing string literals in forms of error handling
- `npm run i18n:coverage` — every locale has the same string key paths as `en` (Vitest)
- `npm run lint:ci` — ESLint on `src/`
- `npx tsc --noEmit`
- `npm run test:run` — Vitest
- `npm run build -- --mode development` — TypeScript + Vite production bundle (dev channel; avoids prod Supabase gate)

Optional: `npm run build:analyze` — bundle stats in `dist/stats.html` (set `ANALYZE=1` via `cross-env` in the script).

## i18n

- Add keys to `src/i18n/en.ts` and `src/i18n/types.ts`, and mirror in **full** catalogs `es.ts` / `pt.ts`.
- Locales that spread `en` (`fr`, `de`, `it`) pick up new keys until translated.

## Supabase

- Migrations: `supabase/migrations/`
- Edge Functions: `supabase/functions/` — deploy with `npm run supabase:deploy:all-functions` (requires Supabase CLI and login).

## Docs

- Product / ops masters live under `docs/`. Update the relevant master when behavior or runbooks change.
---

*Last updated (git): **2026-04-27***
