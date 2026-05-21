# n0CRM — Dev Guide

## Setup

- Node 22+, npm 10+
- `cd frontend`
- `npm install`
- Copy `.env.example` → `.env`, set `VITE_API_URL=http://localhost:3001`
- Start `api/` with Postgres + Redis (see `../api/README.md`)
- `npm run dev` → `http://localhost:5173`

## Quality gates (run before pushing)

```bash
npm run ui:lint        # design token / color guardrails
npm run i18n:lint      # no bare user-facing strings in error handling
npm run i18n:coverage  # all locales match en key paths (Vitest)
npm run lint:ci        # ESLint on src/
npx tsc --noEmit
npm run test:run       # Vitest
npm run build
```

Optional: `npm run build:analyze` — bundle stats in `dist/stats.html`.

## i18n

- New strings: add to `src/i18n/en.ts` and `src/i18n/types.ts`
- Mirror in full catalogs: `es.ts`, `pt.ts`
- `fr`, `de`, `it` spread `en` — pick up new keys until translated

## Backend (api/)

- Routes: `../api/src/routes/`
- DB schema + migrations: `../api/migrations/`
- New table → new migration file `00N_description.sql` (auto-applied by `npm run db:migrate`)
- All routes require `Authorization: Bearer <token>` except `/auth/*` public endpoints and `GET /invitations/:token`

## CI/CD

Three workflows run on push/PR:
- `ci.yml` — frontend tests (working-directory: frontend)
- `build-production.yml` — builds frontend Docker image → `clovrlabs/velo-crm:latest`
- `build-api.yml` — builds api Docker image → `clovrlabs/n0crm-api:latest`

## Docs

- Engineering masters under `docs/` — update the relevant master when behavior or runbooks change
- Phase checklists and milestone notes under `.planning/`

---

*Last updated: 2026-05-18*
