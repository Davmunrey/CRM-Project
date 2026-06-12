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
- New table → new migration file `NNN_description.sql` (three-digit zero-padded, e.g. `018_ai.sql`, `019_mfa.sql`, `020_security_events.sql`); auto-applied by `npm run db:migrate`
- Routes that do **not** require a JWT (no `authenticate` hook): `/auth/*`, `/auth/sso/*`, `/public/v1/*`, `/scim/v2/*`, `/webhooks/*`, and `GET /invitations/:token`. Every other route requires the HttpOnly `auth_token` cookie via `app.authenticate`.
- AI routes live under `/ai` (status, summarize, draft-reply, next-best-action, search, agent)

### Backend contributor conventions

**RBAC — gating new routes:**

- CRM resource routes (contacts, deals, companies, etc.) → add `requireCrudPermission('<resource>')` as a `preHandler` hook on the plugin. This derives the permission from the HTTP method (`read` / `write` / `delete`) automatically.
- Sensitive one-off mutations (member role changes, API-key revocation, GDPR erasure, etc.) → use `requirePermission('<resource>:<action>')` directly on the route handler.
- Both helpers live in `api/src/middleware/rbac.ts` and must run after `authenticate` so `req.user` is populated.

**Audit logging — when to write:**

- Org-scoped, actor-visible changes (member lifecycle, data export/erasure, settings changes) → `INSERT INTO audit_log` with `action`, `entity_type`, `entity_id`, `entity_name`, `details`, `user_id`, `organization_id`.
- Security-relevant auth events (login, logout, password change, MFA toggle, impersonation) → call `recordSecurityEvent(req, type, opts)` from `api/src/services/securityEvents.ts`. This is fire-and-forget and must never throw or block the request.
- Many actions need both: for example, MFA enable/disable writes to `audit_log` **and** calls `recordSecurityEvent`.

**API-key scope enforcement:**

- Routes reachable via `x-api-key` (i.e. under `/public/v1` or `/scim/v2`) must call `hasScope(req.apiKeyScopes, '<required-scope>')` before acting. Return `403 { error: 'Insufficient API key scope', required: '<scope>' }` on failure.
- `hasScope` (exported from `api/src/routes/publicApi.ts`) is back-compat: a key with no scopes set is treated as full access so existing integrations keep working.

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

*Last updated: 2026-06-11*
