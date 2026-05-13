# Velo CRM

Production-grade CRM single-page application built with React 18, TypeScript, Vite, and Tailwind CSS. Designed for B2B sales teams. Backend: self-hosted Fastify API (`velo-api`).

## Features

| Module | Features |
|--------|----------|
| **Dashboard** | KPI cards, revenue bar chart, deal funnel, recent activity, top deals |
| **Contacts** | Table/grid, search/filter, CSV export, duplicate detection, bulk actions, smart views, distribution lists |
| **Companies** | Same pattern as Contacts — domain/name dedup, industry/status/size filters, detail page |
| **Deals** | Kanban + list, stage progression, quote builder (save/export/send) |
| **Activities** | Unified feed, overdue highlighting, quick complete/delete |
| **Leads** | Lead scoring engine, score snapshots, events timeline, scoring rules editor |
| **Automations** | Rule builder with trigger/condition/action model, execution log |
| **Sequences** | Email sequences, enrollment management, step scheduling |
| **Products** | Product catalog for quotes and deal line items |
| **Reports** | Revenue forecast, Won/Lost donut, activities by type, contacts by source, conversion funnel |
| **Inbox** | Gmail OAuth integration, real thread sync, pinned thread-to-record links |
| **Custom Fields** | Per-entity custom field definitions, values, i18n labels |
| **Goals** | Sales targets per rep/team, progress tracking |
| **Audit Log** | Organization activity trail with filters |
| **Settings** | Tags, pipeline stages, language (en/es/pt/fr/de/it), JSON export/import |
| **Auth** | JWT-based login/register, protected routes, org bootstrap |
| **Multi-tenancy** | Organization-scoped data via JWT claims (`org` + `role`) |
| **Notifications** | In-app notification feed, mark-read, bulk clear |

## Quick Start — Local Dev

### Prerequisites

- Node.js 20+
- velo-api running (see `../velo-api/README.md`)

### 1. Environment

```bash
cp .env.example .env
# VITE_API_URL already points to http://localhost:3001
```

### 2. Install and run

```bash
npm install
npm run dev
```

App runs at `http://localhost:5174`.

### 3. Start the API + DB

```bash
cd ../velo-api
docker-compose up postgres redis -d
npm run db:migrate
npm run db:seed
npm run dev
```

Default credentials: `admin@velo.local` / `Admin1234!`

---

## Quick Start — Full Docker Stack

Runs everything (Postgres, Redis, API, frontend) in one command.

```bash
# Build frontend first
cd velo-crm
VITE_API_URL=/api npm run build

# Start full stack
cd ../velo-api
cp .env.example .env
# Edit .env — set JWT_SECRET (openssl rand -hex 32)
docker-compose up -d
```

Frontend available at `http://localhost`. nginx proxies `/api/*` → Fastify API.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | Base URL for the Fastify API. Local dev: `http://localhost:3001`. Docker: omit (uses `/api` via nginx proxy) |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite |
| Styling | Tailwind CSS 3 (dark theme) |
| Routing | React Router v6 |
| State | Zustand 5 (API-backed stores, optimistic UI) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Drag & Drop | @hello-pangea/dnd |
| Icons | lucide-react |
| Dates | date-fns |
| API | Fastify 5 (`velo-api`) — JWT auth, PostgreSQL, BullMQ |

---

## Project Structure

```
src/
├── components/
│   ├── layout/       # Sidebar, Topbar, Layout, ErrorBoundary
│   ├── ui/           # Button, Input, Select, Badge, Avatar, Modal, Toast
│   ├── contacts/     # ContactForm, ContactStatusBadge
│   ├── companies/    # CompanyForm
│   ├── deals/        # DealCard, DealForm, KanbanColumn
│   ├── activities/   # ActivityForm, ActivityItem
│   └── shared/       # SearchBar, EmptyState, SmartViewBar, EntityListsToolbar
├── pages/            # Route containers (33 pages)
├── store/            # Zustand stores — all backed by velo-api
├── types/            # TypeScript interfaces (index.ts)
├── hooks/            # useLocalStorage, useSearch, useFilters
├── lib/              # api.ts (fetch client), env, schemas
└── utils/            # formatters, constants, scoring/health engines
```

---

## Auth Flow

| Step | Description |
|------|-------------|
| Login | `POST /auth/login` → JWT with `sub/org/role` claims |
| Register | `POST /auth/register` → JWT without org claim → redirected to `/org-setup` |
| Org setup | `POST /orgs` → new JWT with org claim; `setToken()` replaces old token |
| Invitation | `/accept-invite?token=X` → `GET /invitations/:token` + `POST /invitations/:token/accept` → new JWT |
| Session restore | On load: read token from localStorage → `GET /auth/me` → hydrate store |
| 401 handling | `clearToken()` + redirect to `/login` (guard: no loop if already on `/login`) |
| Logout | `POST /auth/logout` + `clearToken()` + reset all auth state |
| Password reset | `POST /auth/forgot-password` (token stored in DB) → `POST /auth/reset-password?token=X` |

---

## Testing

```bash
npm run test          # watch mode
npm run test:run      # single run
npm run test:coverage # coverage report
npm run test:e2e      # Playwright e2e
```

---

## Scripts

```bash
npm run dev           # Vite dev server (localhost:5174)
npm run build         # Production build → dist/
npm run preview       # Preview production build
npm run test          # Vitest watch
npm run test:run      # Vitest single run
```
