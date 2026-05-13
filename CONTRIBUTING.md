# Contributing to Velo

## Quick start

- **Node** 20+ and **npm** 10+
- `npm install`
- Copy `.env.example` to `.env` and set `VITE_API_URL=http://localhost:3001`
- Start `velo-api` (see `../velo-api/README.md`)
- `npm run dev` — app on [http://localhost:5174](http://localhost:5174)

## Quality gates (run before a PR)

- `npm run ui:lint` — design tokens / color guardrails
- `npm run i18n:lint` — no stray user-facing string literals in error handling
- `npm run i18n:coverage` — every locale has the same string key paths as `en` (Vitest)
- `npm run lint:ci` — ESLint on `src/`
- `npx tsc --noEmit`
- `npm run test:run` — Vitest
- `npm run build` — TypeScript + Vite production bundle

Optional: `npm run build:analyze` — bundle stats in `dist/stats.html`.

## i18n

- Add keys to `src/i18n/en.ts` and `src/i18n/types.ts`
- Mirror in full catalogs `es.ts`, `pt.ts`
- Locales that spread `en` (`fr`, `de`, `it`) pick up new keys until translated

## Backend (velo-api)

- API routes: `../velo-api/src/routes/`
- DB schema: `../velo-api/migrations/`
- New table: add a migration file `00N_description.sql` — picked up automatically by `npm run db:migrate`
- All routes require `Authorization: Bearer <token>` except `/auth/*` and `GET /invitations/:token`

## Docs

- Product / ops masters live under `docs/`. Update the relevant master when behavior or runbooks change.

---

*Last updated: 2026-05-13*
