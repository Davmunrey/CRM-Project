# n0CRM — Dev Guide

## Setup

- Node 22+, npm 10+
- `cd frontend`
- `npm install`
- Copy `.env.example` → `.env`, set `VITE_API_URL=http://localhost:3001` (the only other var is `VITE_APP_CHANNEL`; the app talks only to the Fastify API — there is no Supabase)
- Start `api/` with Postgres + Redis (see `../api/README.md`)
- `npm run dev` → `http://localhost:5173`

Auth is an HttpOnly `auth_token` cookie set by the API — the SPA never reads the token. All requests use `credentials: 'include'`; the Socket.io handshake uses `withCredentials`.

## Quality gates (run before pushing)

```bash
npm run ui:lint        # design token / color guardrails
npm run i18n:lint      # no bare user-facing strings in error handling
npm run i18n:coverage  # all locales match en key paths (Vitest)
npm run lint:ci        # ESLint on src/ (lint policy: 0 new warnings)
npx tsc --noEmit
npm run test:run       # Vitest
npm run build
npm run bundle:check   # bundle budget — largest gzip JS chunk ≤ 250 KB
```

Optional: `npm run build:analyze` — bundle stats in `dist/stats.html`.

## i18n

- New strings: add to `src/i18n/en.ts` and `src/i18n/types.ts`
- Mirror in full catalogs: `es.ts`, `pt.ts`
- `fr`, `de`, `it` spread `en` and override selectively — untranslated keys fall back to the English value until translated
- The `i18n:coverage` gate fails the build if any locale is missing a key path that exists in `en`

## Backend (api/)

- Routes: `../api/src/routes/`
- DB schema + migrations: `../api/migrations/`
- New table → new migration file `00N_description.sql` (auto-applied by `npm run db:migrate`)
- All routes authenticate via the HttpOnly `auth_token` cookie except `/auth/*` public endpoints and `GET /invitations/:token`
- AI routes live under `/ai` (status, summarize, draft-reply, next-best-action, search, agent)

## AI Assistant

AI is multi-provider (Gemini / OpenAI / Anthropic) and lives on the API; the frontend just calls it.

- `src/components/ai/AiAssistant.tsx` — global drawer (tool-using agent, persisted conversations), mounted once in `Layout` and opened by the floating `Sparkles` launcher.
- `src/components/ai/AiInsight.tsx` — inline "run an AI action, show result" button (copy / use / dismiss). Renders nothing when AI is disabled, so drop it in unconditionally. Used for next-best-action on Contact/Deal detail and summarize + draft-reply in the Inbox.
- State: `src/store/aiStore.ts`. Add any new AI labels across all six locales (the `i18n:coverage` gate enforces parity).

## CI/CD

`.gitea/workflows/ci.yml` runs on push/PR with three jobs:
- `api` — backend gate (working-directory `api/`): `tsc` → `eslint` → `vitest` → `build` → `npm audit`. The backend now has its own lint/type/test gate.
- `ci` — frontend gate (working-directory `frontend/`): `ui:lint` → `i18n:lint` → `i18n:coverage` → `lint:ci` → `tsc` → `vitest` → build → `bundle:check` (≤ 250 KB gzip), plus an optional Playwright API smoke when E2E secrets are set.
- `security` — `npm audit --audit-level=critical`.

Docker image builds run from separate workflows (`build-production.yml` for the frontend image, `build-api.yml` for the API image).

## Docs

- Engineering masters under `docs/` — update the relevant master when behavior or runbooks change
- Phase checklists and milestone notes under `.planning/`

---

*Last updated: 2026-06-10*
