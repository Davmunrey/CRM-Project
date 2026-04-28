# Velo — Sales Platform

A production-grade, full-featured CRM single-page application built with React 18, TypeScript, Vite, and Tailwind CSS. Inspired by HubSpot/Pipedrive, designed for Spanish/European B2B sales teams.

## Workspace READMEs

- Main app: `README.md`
- Documentation index: `docs/README.md`
- Docs ↔ v1 planning bridge: `docs/project-state.md`
- Supabase setup and migrations: `supabase/README.md`

## Features

| Module | Features |
|---|---|
| **Dashboard** | KPI cards, revenue bar chart, deal funnel, recent activity, top deals |
| **Contacts** | Table/grid, toolbar (search, filters, CSV, duplicates, view toggle, new contact), smart views + **saved filtered lists** + **distribution lists** (`EntityListsToolbar`, `distributionListsStore`), bulk actions, slide-over form; strings via i18n (`common.csv`, `entityLists.*`, etc.) |
| **Contact Detail** | Overview, Activities, Deals, Notes tabs |
| **Companies** | Same toolbar pattern as Contacts (CSV with `companies:export`, duplicates by domain/name, table/grid, sort chips), smart views + saved lists + distribution lists, industry/status/size filters, detail page |
| **Automations** | Rule builder with starter template library; canonical English seed rules in `src/i18n/seed/automationSeedRulesEn.ts`; runtime labels via `getTranslations()` in `automationsStore` |
| **Deals** | Kanban + list; primary **New deal** inside glass `Toolbar` (aligned with Contacts/Companies); smart views; quote builder (save/export/send) |
| **Activities** | Unified feed, overdue highlighting, quick complete/delete |
| **Reports** | Revenue forecast, Won/Lost donut, activities by type, contacts by source, conversion funnel |
| **Inbox Collaboration** | Gmail Inbox, real thread sync, pinned thread-to-record links, workspace-aware thread linking |
| **Pipeline Timeline** | Timeline view for stage progression and pipeline activity context |
| **Products** | Product catalog for quote line items and deal quoting workflows |
| **Audit Log** | Organization activity audit trail with filters and chronology |
| **Settings** | Tags management, pipeline stages, language (en/es/pt/fr/de/it), JSON export/import, data reset |
| **Authentication** | Supabase Auth (register/login/reset), protected routes, org bootstrap (`/org-setup`) |
| **Multi-tenancy** | Organization-scoped data via `organization_id` + RLS policies |
| **Realtime + Integrations** | Supabase Realtime sync, Gmail PKCE OAuth + refresh, pinned Gmail thread links, notifications/audit |

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- (Optional) A Supabase project for production-like mode

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

The app runs at `http://localhost:5174` (see [`vite.config.ts`](vite.config.ts)). With **Supabase** configured, data and auth hit your project. Without valid env vars, the Supabase client is `null` and auth/data stay disabled until you configure a project (see [`docs/deployment-spa-and-env.md`](docs/deployment-spa-and-env.md)).

### Deploy channels (`VITE_APP_CHANNEL`)

The SPA resolves a **channel** at build/runtime via [`src/lib/envChannel.ts`](src/lib/envChannel.ts). Set `VITE_APP_CHANNEL` in CI for hosted **production** and **staging** builds (local `npm run dev` omits it → `development`).

| Channel | When to use | Supabase URL + anon key at `vite build` |
|--------|-------------|----------------------------------------|
| **`production`** | Live customers (`main` / prod host) | **Required** (build fails if missing/invalid) |
| **`staging`** | Preview, UAT, pre-prod (separate Supabase project) | **Required** |
| **`development`** | Local `npm run dev` (channel unset; Vite `MODE` is not production) | **Strongly recommended** (otherwise `supabase` is `null`) |

Staging and production builds **must** use different Supabase projects in dashboard env vars. The shell shows a **staging** banner only when `appChannel === 'staging'` ([`src/components/layout/EnvironmentBanner.tsx`](src/components/layout/EnvironmentBanner.tsx)).

### Environment Variables

Create a `.env.local` file in the project root (see also [`.env.example`](.env.example)):

```bash
# Hosted builds: production | staging (omit locally → development)
# VITE_APP_CHANNEL=staging

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# Alternative naming used by some providers:
# VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

# Optional outbound provider (defaults to gmail)
# VITE_EMAIL_PROVIDER=gmail

# If using Resend as outbound provider
# VITE_EMAIL_PROVIDER=resend
# VITE_RESEND_SEND_FUNCTION=resend-send-email
```

**Deploy:** SPA rewrites, `VITE_APP_CHANNEL`, and Supabase vars per environment are documented in [`docs/deployment-spa-and-env.md`](docs/deployment-spa-and-env.md). **Google (Gmail/Calendar) operator setup** (OAuth client, Edge secrets, deploy): [`docs/google-gmail-oauth-verification.md`](docs/google-gmail-oauth-verification.md#operator-setup-google-oauth). Google verification / redirect matrix: same file. Post-deploy smoke: [`docs/smoke-checklist-production.md`](docs/smoke-checklist-production.md).
Supabase-only runtime (legacy “offline demo” anchor retained for bookmarks): [`docs/deployment-spa-and-env.md#offline-demo-mode`](docs/deployment-spa-and-env.md#offline-demo-mode).

When `VITE_EMAIL_PROVIDER=resend`, deploy Supabase Edge Function `resend-send-email` and set server-side secrets in Supabase:

- `RESEND_API_KEY`
- `RESEND_FROM`

Optional variables for maintenance scripts:

```bash
LEAD_MAINTENANCE_API_URL=http://localhost:5173/api/maintenance/lead
LEAD_MAINTENANCE_API_KEY=your_maintenance_api_key
LEAD_MAINTENANCE_ORG_ID=your_organization_id
```

## Lead Score Maintenance Runner

For backend/scheduler execution without user sessions:

```bash
# Single organization (requires LEAD_MAINTENANCE_ORG_ID)
npm run maintenance:lead:org

# All organizations
npm run maintenance:lead:all

# Health / last runs (optional LEAD_MAINTENANCE_ORG_ID filter)
npm run maintenance:lead:health

# SLA check report
npm run maintenance:lead:sla
```

Contract and headers are documented in:
- `docs/master-lead-management.md` (backend contract section)

## Testing

```bash
# Unit/integration tests (watch mode)
npm run test

# Unit/integration tests (single run)
npm run test:run

# Coverage report
npm run test:coverage

# End-to-end tests
npm run test:e2e

# End-to-end tests with browser UI
npm run test:e2e:headed
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite 8 |
| Styling | Tailwind CSS 3 (dark theme) |
| Routing | React Router v6 |
| State | Zustand 5 (Supabase-backed stores + selective local persist) |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| Drag & Drop | @hello-pangea/dnd |
| Icons | lucide-react |
| Dates | date-fns |

## Project Structure

```
src/
├── components/
│   ├── layout/         # Sidebar, Topbar, Layout, ErrorBoundary
│   ├── ui/             # Button, Input, Select, Badge, Avatar, Modal, Toast, StatCard
│   ├── contacts/       # ContactForm, ContactStatusBadge
│   ├── companies/      # CompanyForm
│   ├── deals/          # DealCard, DealForm, KanbanColumn
│   ├── activities/     # ActivityForm, ActivityItem
│   └── shared/         # SearchBar, EmptyState, PanelEmpty, SmartViewBar, EntityListsToolbar
├── pages/              # Route containers (33 pages): Velo modules, auth, inbox, timeline, audit, products, automations, goals, sequences, etc.
├── store/              # Zustand stores (22+): auth, data domains, `viewsStore`, `distributionListsStore`, inbox, …
├── types/              # All TypeScript interfaces (index.ts)
├── hooks/              # useLocalStorage, useSearch, useFilters
├── lib/                # Supabase client, env, `entityListFilters.ts` (merge toolbar + smart view filters for save)
└── utils/              # formatters, constants, `defaultAppSettings`, `duplicateDetection` (contacts + companies), scoring/health engines
```

## Architecture Decisions

### State Management (Zustand)
Each domain uses Zustand with Supabase fetch/insert/update/delete and optional optimistic UI. In Supabase mode, auth state avoids rehydrating demo users.

### Persistence Strategy
Primary persistence is Supabase (tables + RLS). Local persistence is used only for safe client state (for example language preference and selected UI preferences).

### Form Validation
React Hook Form + Zod schemas validate all forms client-side before submission. Each schema uses strict types (no `.default()` to avoid Zod v4 type inference issues with optional fields).

### Routing
React Router v6 with nested layouts. Each page is wrapped in an `ErrorBoundary` component to prevent cascading failures.

### Component Size
All components are kept under 200 lines. Large pages (Contacts, Deals) delegate form logic to dedicated `*Form` components.

## Current status

- **Runtime:** Supabase Auth, org onboarding, RLS multi-tenancy, and core data stores with realtime are implemented.
- **i18n:** EN / ES / PT (plus FR / DE / IT where keyed); English automation seeds in `src/i18n/seed/automationSeedRulesEn.ts`; workflow marketing copy in `src/i18n/workflowLibrary/`; run multilingual smoke before releases.
- **Unused code:** `npm run audit:unused` (Knip) for files and dependencies; see `knip.json`.
- **Tests:** Vitest (`npm run test:run`); pool + `maxWorkers` cap in `vite.config.ts` for stable Windows/CI runs.
- **Gmail:** PKCE, server refresh, resilient inbox, persisted thread links; migration `20260410195500_gmail_thread_workspace.sql`.
- **UX / shell:** Quote PDF/email from deals; lazy-loaded chart routes; `crm-page` / `crm-page-full`, `PanelEmpty`, auth/branding — see `docs/master-design-ui.md`.
- **Sell-ready product baseline:** Checklist + QA + go/no-go — `docs/master-release-qa.md` (Apr 2026 internal/beta GO).
- **Sell-ready security & compliance baseline:** Evidence map, Supabase/DNS runbooks, DSAR — see `docs/master-security-compliance.md`.
- **Next product focus:** Roadmap + backlog + shipped history — `docs/master-roadmap-backlog.md` and `docs/master-implementation-history.md`.

## Documentation

**Canonical index (all topics):** [`docs/README.md`](docs/README.md)

| If you need… | Start here |
|----------------|------------|
| **v1 phases / DEPLOY checkboxes vs canonical docs** | [`docs/project-state.md`](docs/project-state.md) |
| Full shipped narrative | `docs/master-implementation-history.md` |
| Priorities and backlog | `docs/master-roadmap-backlog.md` |
| Security / compliance evidence pack | `docs/master-security-compliance.md` |
| Go-live operations | `docs/master-release-qa.md` (Production handoff section) |

## Data and defaults

Velo is **Supabase-backed**: tenant data lives in Postgres under RLS. Initial **client defaults** for pipeline/tags/currency (before org settings load) come from [`src/utils/defaultAppSettings.ts`](src/utils/defaultAppSettings.ts). CSV import and org onboarding create real rows in your project; there is no built-in “mock CRM” mode in this branch.

---

*Last updated (git): **2026-04-22***
