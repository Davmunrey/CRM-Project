# CRM Pro — Sales Platform

A production-grade, full-featured CRM single-page application built with React 18, TypeScript, Vite, and Tailwind CSS. Inspired by HubSpot/Pipedrive, designed for Spanish/European B2B sales teams.

## Workspace READMEs

- Main app: `README.md`
- Documentation index: `docs/README.md`
- Supabase setup and migrations: `supabase/README.md`

## Features

| Module | Features |
|---|---|
| **Dashboard** | KPI cards, revenue bar chart, deal funnel, recent activity, top deals |
| **Contacts** | Table/grid view, search, filters, bulk delete, CSV export, slide-over form |
| **Contact Detail** | Overview, Activities, Deals, Notes tabs |
| **Companies** | Table view, industry/status/size filters, company detail page |
| **Deals** | Kanban drag & drop + list view, deal detail panel, mark Won/Lost, quote builder (save/export/send) |
| **Activities** | Unified feed, overdue highlighting, quick complete/delete |
| **Reports** | Revenue forecast, Won/Lost donut, activities by type, contacts by source, conversion funnel |
| **Inbox Collaboration** | Gmail Inbox, real thread sync, pinned thread-to-CRM links, workspace-aware thread linking |
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

The app runs at `http://localhost:5173`. In mock mode it auto-seeds demo data; in Supabase mode data is fetched from your project.

### Environment Variables

Create a `.env.local` file in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Local demo only (never in production): offline seed users when Supabase is unset
# VITE_ALLOW_DEMO_MODE=true

# Optional outbound provider (defaults to gmail)
# VITE_EMAIL_PROVIDER=gmail

# If using Resend as outbound provider
# VITE_EMAIL_PROVIDER=resend
# VITE_RESEND_SEND_FUNCTION=resend-send-email
```

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
│   └── shared/         # SearchBar, EmptyState, PanelEmpty
├── pages/              # Route containers (27 pages): CRM modules, auth, inbox, timeline, audit, products
├── store/              # Zustand stores (19): auth, CRM domains, inbox, settings, templates, products, audit
├── types/              # All TypeScript interfaces (index.ts)
├── hooks/              # useLocalStorage, useSearch, useFilters
└── utils/              # formatters, constants, seedData, scoring/health engines
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

- **Runtime:** Supabase Auth, org onboarding, RLS multi-tenancy, and core CRM stores with realtime are implemented.
- **i18n:** EN / ES / PT (plus FR / DE / IT where keyed); run multilingual smoke before releases.
- **Tests:** Vitest (`npm run test:run`); policy in `vite.config.ts` (single worker for stable CI/local runs).
- **Gmail:** PKCE, server refresh, resilient inbox, persisted thread links; migration `20260410195500_gmail_thread_workspace.sql`.
- **UX / shell:** Quote PDF/email from deals; lazy-loaded chart routes; `crm-page` / `crm-page-full`, `PanelEmpty`, auth/branding — see `docs/master-design-ui.md`.
- **Sell-ready product baseline:** Checklist + QA + go/no-go — `docs/master-release-qa.md` (Apr 2026 internal/beta GO).
- **Sell-ready security & compliance baseline:** Evidence map, Supabase/DNS runbooks, DSAR — see `docs/master-security-compliance.md`.
- **Next product focus:** Roadmap + backlog + shipped history — `docs/master-roadmap-backlog.md` and `docs/master-implementation-history.md`.

## Documentation

**Canonical index (all topics):** [`docs/README.md`](docs/README.md)

| If you need… | Start here |
|----------------|------------|
| Full shipped narrative | `docs/master-implementation-history.md` |
| Priorities and backlog | `docs/master-roadmap-backlog.md` |
| Security / compliance evidence pack | `docs/master-security-compliance.md` |
| Go-live operations | `docs/master-release-qa.md` (Production handoff section) |

## Seed Data
Offline demo mode (non-production only) requires `VITE_ALLOW_DEMO_MODE=true` when Supabase env vars are absent; production builds require real Supabase configuration.

In mock mode, the app ships with realistic Spanish/European B2B seed data:
- **25 contacts** across companies in fintech, SaaS, insurance, banking, retail
- **10 companies** including Bankia, Factorial, Mapfre, Inditex, Cabify, Deloitte
- **18 deals** across all pipeline stages (€500–€50,000)
- **30 activities** (calls, emails, meetings, tasks, LinkedIn, notes)
- **4 demo emails** linked to real contacts/companies/deals for Inbox and quote demo flows
- **3 mock users**: David Muñoz (Sales Manager), Sara López (AE), Carlos Vega (SDR)

To reset demo data: **Settings → Restaurar datos demo**.

In Supabase mode, demo users are not rehydrated into organization sessions.
