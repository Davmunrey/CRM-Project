# Codebase map (consolidated)

This file consolidates the prior `.planning/codebase/*.md` documents into a single source of truth to reduce file sprawl while keeping the original content.

## Architecture

**Source:** `.planning/codebase/ARCHITECTURE.md`  
**Analysis date:** 2026-04-22

### Pattern overview

**Overall:** React SPA with Supabase-backed data/auth, org-scoped RLS, and Zustand stores as client orchestration.

**Key characteristics:**
- Supabase is the primary backend for auth, persistence, and realtime sync.
- Zustand remains the app state layer, with selective persistence for safe client state.
- Route-level protection is handled through `ProtectedRoute` + permission checks.
- Gmail integration uses PKCE + Edge Functions for secure token exchange/refresh.

### Layers

**App shell + routing (`src/App.tsx`):**
- Declares routes and protected wrappers.
- Initializes auth/session sync.
- Uses lazy loading for chart-heavy routes (`Dashboard`, `Reports`, `Forecast`).

**Pages (`src/pages/*`):**
- Route containers that compose store data, domain components, and services.
- Main business UX for CRM entities, inbox, reporting, settings.

**Stores (`src/store/*`):**
- Domain-specific Zustand stores.
- Supabase CRUD + realtime subscriptions where applicable.
- When Supabase env vars are missing, `supabase` is `null` (`dataRuntime === 'unconfigured'`): no client mock CRM; staging/production builds require valid keys (`src/lib/envChannel.ts`, `src/lib/supabase.ts`, `vite.config.ts`).

**Services (`src/services/*`):**
- Stateless integration adapters (`gmailService`, `src/services/emailProviders/*`, etc.).
- Security-sensitive OAuth/token steps are delegated to Supabase Edge Functions.

**Data/infra (`supabase/*`):**
- SQL migrations and Edge Functions for server-side responsibilities.
- Includes Gmail token and thread-link persistence support.

### Core flows

**Auth + org scope:**
1. Session initializes from Supabase.
2. Org/role context is resolved.
3. RLS enforces tenant isolation on all scoped data operations.

**CRM CRUD:**
1. UI dispatches store action.
2. Store persists to Supabase (with optimistic UX where implemented).
3. Realtime updates fan out to active clients.

**Gmail:**
1. User connects via Google OAuth PKCE.
2. Code exchange and refresh token handling happen in Edge Functions.
3. Short-lived access tokens are used client-side; inbox loads/syncs threads.
4. Thread links can be pinned/unpinned and persisted (`gmail_thread_links`).

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

**UI layout conventions:** see `docs/master-design-ui.md` (`crm-page`, `crm-page-full`, shared empty states).

```
CRM/
├── public/                     # Static assets served as-is by Vite
├── src/
│   ├── assets/                 # Static assets imported by components
│   ├── components/
│   │   ├── activities/         # Activity-domain components (forms, list items)
│   │   ├── auth/               # Route guard and permission gate components
│   │   ├── companies/          # Company-domain components
│   │   ├── contacts/           # Contact-domain components
│   │   ├── deals/              # Deal-domain components (kanban, forms)
│   │   ├── email/              # Email composer / inbox components
│   │   ├── import/             # CSV/JSON import wizard components
│   │   ├── layout/             # App shell (Sidebar, Topbar, Layout, ErrorBoundary, CommandPalette)
│   │   ├── settings/           # Settings sub-panels (e.g. webhooks UI)
│   │   ├── shared/             # Cross-domain reusable components
│   │   └── ui/                 # Primitive design-system components
│   ├── hooks/                  # Custom React hooks
│   ├── i18n/                   # Translations and language store
│   ├── lib/                    # External client setup (supabase.ts, database.types.ts)
│   ├── pages/                  # One file per route — full-page view components
│   ├── services/               # Stateless external API callers
│   ├── store/                  # Zustand stores (one file per domain)
│   ├── types/                  # TypeScript interfaces and union types
│   ├── utils/                  # Pure helper functions and constants
│   ├── App.tsx                 # Router definition, app-level effects
│   ├── main.tsx                # React DOM entry point
│   └── index.css               # Global Tailwind CSS entry
├── supabase/                   # Supabase schema and migrations
├── index.html                  # Vite HTML shell
└── package.json
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
- **Last updated:** 2026-04-28  
- **Canonical:** Yes  

