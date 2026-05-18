# Codebase map (consolidated)

This file consolidates the prior `.planning/codebase/*.md` documents into a single source of truth to reduce file sprawl while keeping the original content.

## Architecture

**Source:** `.planning/codebase/ARCHITECTURE.md`  
**Analysis date:** 2026-05-18

### Pattern overview

**Overall:** React 18 SPA (frontend/) + `velo-api` Fastify 5 backend (api/) in monorepo. PostgreSQL 16 + Redis. Zustand stores for client state. Auth via HS256 JWT (`{ sub, org, role, jti }`). Real-time via Socket.io. No Supabase runtime dependency — `supabase` client is `null` at runtime; all data goes through velo-api including Gmail OAuth.

**Key characteristics:**
- `velo-api` is the primary backend for auth, persistence, and realtime sync.
- Zustand remains the app state layer; all mutations go through `src/lib/api.ts` (`VITE_API_URL`).
- Route-level protection via `ProtectedRoute` + JWT `org`/`role` claims.
- Gmail integration uses PKCE + velo-api `/gmail/*` routes for token exchange (fully self-hosted — no Supabase Edge Function dependency).

### Layers

**App shell + routing (`src/App.tsx`):**
- Declares routes and protected wrappers.
- Initializes auth via `GET /auth/me` on mount (`isLoadingAuth` prevents /login flash).
- Uses lazy loading for chart-heavy routes (`Dashboard`, `Reports`, `Forecast`).

**Pages (`src/pages/*`):**
- Route containers that compose store data, domain components, and services.
- Main business UX for CRM entities, inbox, reporting, settings.

**Stores (`src/store/*`):**
- Domain-specific Zustand stores.
- All CRUD via `src/lib/api.ts` REST calls to velo-api; optimistic updates where implemented.
- `supabase` is `null` — all `!supabase` / `supabase?.` guards fire; Supabase-dependent panels show info states.
- Real-time: Socket.io events (api:3001) → `window.__veloDbChange(table)` global fires → stores refetch.

**Services (`src/services/*`):**
- Stateless integration adapters (`googleIntegrationService`, `gmailTokenRefresh`, etc.).
- All Gmail token operations now go through velo-api `/gmail/*` routes (no Supabase Edge Functions).

**Data/infra (`supabase/*`):**
- Legacy Edge Functions (email tracking, webhooks, public API) — deprecated, not called from frontend.
- SQL migrations: historical reference only; PostgreSQL schema now managed via `api/migrations/` in velo-api monorepo subdirectory.

### Core flows

**Auth + org scope:**
1. `POST /auth/login` → HS256 JWT with `{ sub, org, role }`.
2. `GET /auth/me` on mount restores session.
3. Every velo-api route scopes queries with `WHERE organization_id = ${req.user.org}`.

**CRM CRUD:**
1. UI dispatches store action.
2. Store optimistically updates local state.
3. `api.post/patch/delete` persists to velo-api.
4. Socket.io `__veloDbChange` broadcasts table changes to other connected clients.

**Gmail:**
1. User connects via Google OAuth popup (PKCE).
2. Code exchange via `POST /gmail/oauth-exchange` (velo-api — no Supabase dependency). Refresh token stored AES-256-GCM encrypted in `gmail_tokens`.
3. Short-lived access tokens used client-side; inbox loads/syncs Gmail threads via `GET /gmail/threads`.
4. Thread links pinned/unpinned and persisted in `gmail_thread_links` table.

### Cross-cutting concerns

- **i18n:** localized UI strings live in `src/i18n/*` (do not mirror catalogs in Markdown).
- **Security:** no browser-side refresh token storage; service-role logic isolated to Edge Functions.
- **Accessibility:** icon-only controls require `aria-label`/`title`.
- **Quality gates:** `npm run build` + `npm run test:run` must pass before release/merge.

## Technology stack

**Source:** `.planning/codebase/STACK.md`  
**Analysis date:** 2026-04-21

### Languages

- **Primary:** TypeScript 5.9
- **Secondary:** SQL (Postgres), CSS (Tailwind)

### Runtime / toolchain

- **Runtime:** browser (SPA); Node.js for tooling only (Vite/tsc)
- **Package manager:** npm (lockfile present)

### Frameworks and libraries (high signal)

- **React 18** + **React Router**
- **Zustand** for global state
- **Tailwind** + **Lucide**
- **React Hook Form** + **Zod**
- **Vitest** + Testing Library
- **Vite** for dev/build
- **Supabase JS** for DB/auth/realtime (when configured)

## Codebase structure

**Source:** `.planning/codebase/STRUCTURE.md`  
**Analysis date:** 2026-04-22

### Directory layout

**Monorepo structure:** This frontend directory is part of the velo-crm monorepo. Root contains: `frontend/` (React SPA), `api/` (Fastify + PostgreSQL), `docker-compose.yml`, `privateprompt-app.json`.

**UI layout conventions:** see `docs/master-design-ui.md` (`crm-page`, `crm-page-full`, shared empty states).

```
velo-crm/
├── frontend/                   # This directory (React SPA)
│   ├── .planning/              # Planning documents (this codebase map, requirements, roadmap, etc.)
│   ├── public/                 # Static assets served as-is by Vite
│   ├── src/
│   │   ├── assets/             # Static assets imported by components
│   │   ├── components/
│   │   │   ├── activities/     # Activity-domain components (forms, list items)
│   │   │   ├── auth/           # Route guard and permission gate components
│   │   │   ├── companies/      # Company-domain components
│   │   │   ├── contacts/       # Contact-domain components
│   │   │   ├── deals/          # Deal-domain components (kanban, forms)
│   │   │   ├── email/          # Email composer / inbox components
│   │   │   ├── import/         # CSV/JSON import wizard components
│   │   │   ├── layout/         # App shell (Sidebar, Topbar, Layout, ErrorBoundary, CommandPalette)
│   │   │   ├── settings/       # Settings sub-panels (e.g. webhooks UI)
│   │   │   ├── shared/         # Cross-domain reusable components
│   │   │   └── ui/             # Primitive design-system components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── i18n/               # Translations and language store
│   │   ├── lib/                # External client setup (supabase.ts, database.types.ts)
│   │   ├── pages/              # One file per route — full-page view components
│   │   ├── services/           # Stateless external API callers
│   │   ├── store/              # Zustand stores (one file per domain)
│   │   ├── types/              # TypeScript interfaces and union types
│   │   ├── utils/              # Pure helper functions and constants
│   │   ├── App.tsx             # Router definition, app-level effects
│   │   ├── main.tsx            # React DOM entry point
│   │   └── index.css           # Global Tailwind CSS entry
│   ├── supabase/               # Legacy Supabase schema and migrations (reference only)
│   ├── index.html              # Vite HTML shell
│   └── package.json
├── api/                        # Fastify backend (Node.js 22 + PostgreSQL 16)
│   ├── migrations/             # PostgreSQL schema migrations
│   ├── src/
│   │   ├── routes/             # API route handlers (auth, contacts, deals, gmail, etc.)
│   │   ├── db/                 # Database utilities and pool
│   │   └── ...
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml          # Starts: postgres, redis, api, frontend (nginx)
├── privateprompt-app.json      # Private Prompt deployment manifest
└── .gitea/
    └── workflows/
        ├── ci.yml              # Frontend type check + tests
        ├── build-production.yml # Frontend Docker image build
        └── build-api.yml       # API Docker image build
```

### Directory purposes (selected)

- **`src/pages/`**: one file per route (route-level containers)
- **`src/store/`**: domain-specific Zustand stores (Supabase-backed when configured)
- **`src/components/layout/`**: app chrome (Sidebar/Topbar/Layout/ErrorBoundary)
- **`src/components/ui/`**: design system primitives only (no stores)
- **`supabase/`**: schema/migrations/Edge Functions

## Coding conventions

**Source:** `.planning/codebase/CONVENTIONS.md`  
**Analysis date:** 2026-04-21

### Naming patterns (summary)

- Components: PascalCase `.tsx`
- Stores: camelCase `*Store.ts`
- Hooks: `useXxx`
- Utilities: camelCase
- Constants: `SCREAMING_SNAKE_CASE`
- Types: PascalCase (`interface`/`type`)

### TypeScript configuration (observed)

- Strict mode enabled
- Module resolution: `bundler`
- Path alias `@/*` exists but is not widely used (relative imports dominate)

### UI/layout conventions

- Canonical reference: `docs/master-design-ui.md`
- Lucide icon sizes: prefer **13 · 14 · 16 · 18 · 22**

## Testing patterns

**Source:** `.planning/codebase/TESTING.md`  
**Analysis date:** 2026-04-21

- Vitest + jsdom + Testing Library
- Source of truth: `npm run test:run`
- Release/merge gates: `npm run test:run` + `npm run build`

## External integrations (audit)

**Source:** `.planning/codebase/INTEGRATIONS.md`  
**Analysis date:** 2026-04-22

### Outgoing webhooks (v1)

- Outbox table: `webhook_outbox`
- Worker: Edge `webhook-worker`
- Signature header: **`X-Velo-Signature`** (HMAC-SHA256 hex of raw JSON body)
- Terminal failure: **`dead`** (DLQ semantics) + replay tooling

See `docs/master-pipedrive-velo-comparison.md` (product/parity) and `supabase/README.md` (operator runbook).

### Public read API (phase 1)

- Edge `crm-public-api` with org-scoped API keys (`organization_api_keys`, hash-only)
- See `docs/public-api-phase1.md`

## Codebase concerns

**Source:** `.planning/codebase/CONCERNS.md`  
**Analysis date:** 2026-04-21

- Deployment hardening remains a release risk until Phase 10 hosting/env/smoke is fully closed.
- Team directory had session-scoped risk; mitigated by RPC `list_organization_members_with_identity` + `authStore.fetchOrgUsers`.
- Email tracking: server truth via `track-open` / `track-click`; org-wide rollups are future work.

## Editability matrix

**Source:** `.planning/codebase/EDITABILITY_MATRIX.md`  
**Updated:** 2026-04-10

The module matrix and permission list were folded into the Coding Conventions source; keep `docs/project-state.md#checkbox-ownership` as the owner/evidence guide for checklist closure.

---

## Document control

- **Status:** Active  
- **Owner:** Engineering  
- **Last updated:** 2026-05-18  
- **Canonical:** Yes  

