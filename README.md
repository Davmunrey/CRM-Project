<div align="center">

# ⚡ Propel

### The connected, AI-native CRM for outbound sales teams — *fully managed, enterprise-secure, your data protected.*

Contacts · Companies · Deals · Pipelines · Sequences · Gmail & Calendar · Automations · Lead scoring · Reports — **plus a multi-provider, tool-using AI sales assistant.**

<br/>

[![CI](https://img.shields.io/badge/CI-branding·tsc·eslint·build·audit-0C8A68?style=flat-square)](.github/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-Vitest·typecheck·lint-0C8A68?style=flat-square)](#-quality-gates)
[![Vulnerabilities](https://img.shields.io/badge/npm%20audit-critical%20clean-0C8A68?style=flat-square)](#-security-at-a-glance)
[![License](https://img.shields.io/badge/license-Internal-555?style=flat-square)](#)

<br/>

![Next.js](https://img.shields.io/badge/Next.js%2015-000000?style=flat-square&logo=next.js&logoColor=white)
![React 18](https://img.shields.io/badge/React%2018-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![Node 22](https://img.shields.io/badge/Node.js%2022-339933?style=flat-square&logo=node.js&logoColor=white)
![Gemini](https://img.shields.io/badge/AI-Gemini%20·%20OpenAI%20·%20Anthropic-8E75FF?style=flat-square&logo=googlegemini&logoColor=white)

</div>

---

## ✨ Why Propel

|  |  |
|---|---|
| 🤖 **AI sales assistant** | A tool-using agent over your **own** CRM data — searches contacts/deals, drafts replies, suggests the next best action, logs activities. Multi-provider with **Google Gemini free by default** (or OpenAI / Anthropic). Degrades gracefully with no key. |
| 🏢 **True multi-tenant** | Every row scoped to `organization_id`. JWT custom claims inject `org_id` + `role` via Supabase Auth hook. **Row Level Security** on tenant tables; server-side RBAC in Edge Functions. |
| 🔐 **Security-first** | Supabase Auth, MFA (TOTP), account lockout patterns, AES-256-GCM field encryption for OAuth tokens, SSRF-hardened webhooks, tamper-evident security-event log, GDPR data-subject export & erasure. **`npm audit --omit=dev --audit-level=critical` in CI.** |
| 📬 **Outbound-native** | Gmail thread sync + send/reply, Google Calendar, A/B email sequences, lead scoring, automations, multi-pipeline deals with a quote builder. |
| 🌍 **6 languages** | Full UI i18n: English · Español · Português · Français · Deutsch · Italiano. |
| 🔌 **Connected** | Native **Gmail & Calendar**, **Slack**, **Stripe**, **LinkedIn**, signed **webhooks**, a scoped **public API**, and **multi-provider AI** — connect your stack in a few clicks, fully managed. |

---

## 📑 Table of Contents

[Highlights](#-whats-new) · [Tech Stack](#-tech-stack) · [Architecture](#-architecture) · [CRM Modules](#-crm-modules) · [Quick Start](#-quick-start) · [Supabase Setup](#-supabase-setup) · [Deploy (Vercel)](#-deploy--vercel) · [Environment](#-environment-variables) · [API](#-api-overview) · [Security](#-security-at-a-glance) · [Quality Gates](#-quality-gates) · [CI/CD](#-cicd) · [Roadmap](#-roadmap) · [i18n](#-internationalization)

---

## 🆕 What's new

> Propel is the rebrand and platform migration to **Next.js + Supabase + Vercel** — a managed, serverless CRM stack.

**Platform migration:**

- 🚀 **Next.js 15 App Router** — unified repo root: marketing landing at `/`, CRM app shell at `/login`, `/contacts`, `/deals`, and all routes via client-side routing.
- 🗄️ **Supabase PostgreSQL** — consolidated schema; `profiles` bridge to `auth.users`; custom access token hook for JWT `org_id` + `role`.
- 🛡️ **JWT-based RLS** — org-scoped policies on tenant tables; PostgREST reads/writes respect the caller's organization.
- ⚡ **Edge Functions** — `propel-api` (Gmail, AI, automations, email tracking, pipelines), plus `public-api`, `public-forms`, `public-booking`.
- 📡 **Supabase Realtime** — org-scoped live updates.
- 🎨 **Propel brand** — Hanken Grotesk, propel-green tokens, double-chevron logo; branding guard in CI.

**Product features:**

- 🗂️ **Monday-style collaboration & views** — threaded **Updates with @mentions** on contacts, companies, deals & leads; **Calendar** and **Timeline (Gantt)** board views on the Deals board alongside Kanban/List; a **composable widget dashboard** (drag-and-drop number/chart/funnel/list widgets, saved per user); and a **no-code automation recipe center** (builder + searchable template library + "when → then" recipe lines).
- 🧲 **Web-to-lead form builder** — HubSpot/Pipedrive-style public lead forms backed by a revocable token: configure title/fields/success in Settings, grab `{origin}/forms/<token>` or iframe embed (honeypot + rate-limited).
- 🔥 **Deal rotting & activity-based selling** — Pipedrive-style flags on deal cards for idle/"rotting" deals and deals with **no next activity scheduled**.
- 🎫 **Help desk / tickets** — HubSpot Service / Zoho Desk-style support tickets (status, priority, assignee, contact/company links).
- 📆 **Meeting scheduler / booking links** — Calendly-style public booking pages: share `{origin}/book/<token>`, confirmed bookings create calendar events + activities.
- 🤖 **AI / agentic capability** — multi-provider agent with persisted conversations, in-app assistant drawer, next-best-action, Inbox summarize + draft-reply.
- 🛡️ **AI governance** — per-tenant kill switch, monthly token spend cap, and retention purge of AI transcripts.
- 🔑 **MFA (TOTP)** — RFC-6238, end-to-end (enroll in Settings → Security, code prompt at login).
- 🪪 **Enterprise SSO + SCIM** — OIDC/OAuth2 (PKCE, JIT provisioning) plus **SCIM 2.0** for IdP-driven provisioning.
- 👮 **Server-side RBAC** — permission matrix enforced in Edge Functions and client permission gates.
- 🧾 **Compliance** — security-event audit log + GDPR export & erasure endpoints.
- ✅ **CI gate** — branding guard, TypeScript, ESLint, production build, and critical dependency audit on every push.

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | **Next.js 15** App Router · React 18 · TypeScript 5 · Tailwind CSS 3 |
| State / Forms | Zustand 5 (optimistic, Supabase-backed) · React Hook Form + Zod |
| Charts / Icons | Recharts · lucide-react |
| i18n | en · es · pt · fr · de · it |
| Auth | **Supabase Auth** — email/password · MFA (TOTP) · custom JWT claims |
| Database | **Supabase PostgreSQL 15** — PostgREST · consolidated migrations · RLS |
| Realtime | **Supabase Realtime** — org-scoped channel subscriptions |
| Serverless API | **Supabase Edge Functions** (Deno) — integrations, AI, public routes |
| Deploy | **Vercel** — preview URLs · env vars · CSP (`vercel.json`) |
| Encryption | AES-256-GCM (field-level OAuth tokens) |
| 🤖 AI | Google Gemini (free default) · OpenAI · Anthropic — via `propel-api` Edge Function |
| Email / Payments | Gmail API · Nodemailer/Resend · Stripe (Edge Functions) |
| Testing | Vitest · branding/typecheck/lint/build in CI |

---

## 🏗️ Architecture

```
Browser
  │
  ├── Next.js 15 (Vercel)
  │     ├─ /                    → Propel marketing landing (SSR)
  │     ├─ /login /contacts …   → ClientApp (React Router SPA shell)
  │     └─ middleware.ts        → Supabase session refresh
  │
  ├── CRM CRUD ──→ Supabase PostgREST
  │     │              ├─ /auth  /contacts /deals /companies /activities
  │     │              ├─ /leads /tickets /updates /sequences /automations /products
  │     │              ├─ /reports /forecast /inbox /calendar /booking-pages
  │     │              └─ RLS: organization_id = jwt.org_id
  │
  ├── Integrations ──→ Edge Functions (/functions/v1/propel-api)
  │     │              ├─ /ai (status · summarize · draft-reply · next-best-action · agent)
  │     │              ├─ /gmail · /email-tracking · /automations · /pipelines · /billing
  │     │              ├─ /privacy (GDPR export · erasure)   /custom-fields /goals /audit /webhooks
  │     │              └─ JWT Bearer auth from Supabase session
  │
  ├── Public routes ──→ Edge Functions
  │     │              ├─ public-api       (/public/v1)
  │     │              ├─ public-forms     (/public/forms/<token>)
  │     │              └─ public-booking   (/public/booking/<token>)
  │
  └── Realtime ──→ Supabase Realtime (postgres_changes, org-filtered)
```

**Auth flow:** `signInWithPassword` → Supabase session → custom access token hook adds `org_id` + `role` to JWT → PostgREST and Edge Functions enforce tenant isolation. On 401 the client clears state and redirects to `/login`.

---

## 🧩 CRM Modules

| Module | Description |
|--------|-------------|
| 📊 **Dashboard** | KPI cards, revenue chart, deal funnel, activity heatmap, onboarding checklist, composable drag-and-drop widgets (number/chart/funnel/list, saved per user) |
| 👤 **Contacts** | Table/grid, CSV export, duplicate detection, bulk actions, smart views, distribution lists, LinkedIn enrichment |
| 🏢 **Companies** | Industry/status/size filters, domain dedup, revenue tracking |
| 💼 **Deals** | Kanban + list + Calendar + Timeline (Gantt) board views, multi-pipeline, stage auto-resolve, quote builder (save/export/email), deal-rotting flags + activity reminders |
| ✅ **Activities** | Unified feed, overdue highlighting, quick complete/delete |
| 🎯 **Leads** | Configurable scoring engine, score snapshots, events timeline, **web-to-lead public forms** |
| 🎫 **Tickets / Help desk** | Support queue with status / priority / assignee, contact & company links, status-filtered views |
| 📆 **Booking links** | Calendly-style public scheduling pages with per-user availability; confirmed bookings create calendar events + activities |
| 💬 **Updates & @mentions** | Threaded activity updates with teammate @mentions on contacts / companies / deals / leads |
| ⚙️ **Automations** | No-code recipe center — rule builder (trigger → condition → action), template library, execution log |
| ✉️ **Sequences** | Email sequences with A/B variants, enrollment management, step scheduling |
| 🤖 **AI Assistant** | Multi-provider agent drawer · next-best-action on Contact/Deal · Inbox summarize + draft reply · graceful no-key fallback |
| 📥 **Inbox** | Gmail OAuth, thread sync, send/reply/compose, attachments, record linking, AI assist |
| 📅 **Calendar** | Google Calendar sync, event create/edit, month/week/day, Meet links |
| 📈 **Reports / Forecast** | Revenue, Won/Lost, conversion funnel, email stats · weighted pipeline forecast + health |
| 🔒 **Settings → Security** | TOTP MFA enrollment, team/role management, SMTP, API keys, webhooks |
| 🛡️ **Admin** | Org management, impersonation (audited), security-event log |
| 🔌 **Public API & Webhooks** | API-key auth with scopes, rate-limited, org-scoped; signed webhook delivery |

---

## 🚀 Quick Start

> **Propel is delivered as a fully-managed product** — connect Supabase and Vercel, then go. The steps below are for **local development**.

> **Requirements:** Node 22+, a Supabase project.

```bash
# 1. Clone & install
git clone https://github.com/Davmunrey/CRM-Project.git
cd CRM-Project
npm ci

# 2. Environment
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# from Supabase → Project Settings → API

# 3. Database (see Supabase Setup below)
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push

# 4. Run locally
npm run dev    # → http://localhost:3000

# 5. (optional) Verify the toolchain
npm run check:branding && npm run typecheck && npm run lint && npm run test:run
```

Open [http://localhost:3000](http://localhost:3000) for the Propel marketing landing. CRM routes (`/login`, `/contacts`, `/deals`, …) load the app shell.

> 💡 **Turn on the AI assistant:** set `GEMINI_API_KEY` in Supabase Edge Function secrets. With no key, AI features report `enabled: false` via `/ai/status`.

---

## 🗄️ Supabase Setup

1. **Install CLI:** [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli)

2. **Link your project:**

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Push migrations** (schema + profiles auth hook + JWT RLS):

   ```bash
   npx supabase db push
   ```

   Migrations live in `supabase/migrations/`.

4. **Enable custom access token hook** — Supabase Dashboard → Authentication → Hooks → Postgres function `custom_access_token_hook` (see `supabase/config.toml`).

5. **Deploy Edge Functions:**

   ```bash
   npx supabase functions deploy propel-api
   npx supabase functions deploy public-api
   npx supabase functions deploy public-forms
   npx supabase functions deploy public-booking
   ```

6. **Set Edge Function secrets** (Dashboard → Edge Functions → Secrets):

   | Secret | Purpose |
   |--------|---------|
   | `GEMINI_API_KEY` | AI (free default provider) |
   | `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Alternative AI providers |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Gmail + Calendar OAuth |
   | `STRIPE_SECRET_KEY` | Billing |

---

## ☁️ Deploy — Vercel

Propel deploys to **Vercel** (`crm-project`). Connect the GitHub repo and set environment variables in the Vercel dashboard:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | – | Server-only (Edge Functions, admin tasks) |
| `NEXT_PUBLIC_APP_URL` | – | Production URL (OAuth redirects) |

CI runs on push to `master`, `main`, and `propel/**` branches. Preview deployments inherit project env vars.

Security headers and CSP are configured in [`vercel.json`](vercel.json) (allows `*.supabase.co` for API and Realtime).

---

## 🔧 Environment Variables

### App (`.env.local`)

| Variable | Req | Description |
|----------|-----|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | – | Service role — **never** expose to browser |
| `NEXT_PUBLIC_APP_URL` | – | App origin (`http://localhost:3000` locally) |
| `NEXT_PUBLIC_SENTRY_DSN` | – | Browser error tracking |
| `NEXT_PUBLIC_APP_CHANNEL` | – | `development` · `staging` · `production` |

### Edge Function secrets (Supabase dashboard)

| Secret | Description |
|--------|-------------|
| `GEMINI_API_KEY` | **Free** default AI provider — [get one](https://aistudio.google.com/apikey) |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Alternative AI providers |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Gmail + Calendar OAuth |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Billing |

See [`.env.example`](.env.example) for the full list.

---

## 🔌 API Overview

CRM data is served via **Supabase PostgREST** (JWT + RLS). Integrations use **Edge Functions** (`propel-api`). Public routes use dedicated functions (no session required).

Key prefixes: `/auth` · `/contacts` · `/companies` · `/deals` · `/activities` · `/leads` · `/tickets` · `/updates` · `/sequences` · `/automations` · `/products` · `/reports` · `/forecast` · `/inbox` · `/calendar` · `/booking-pages` · `/custom-fields` · `/goals` · `/audit` · `/webhooks` · `/notifications` · `/admin` · `/public/v1`. Public (token-in-path): `/public/forms/<token>` · `/public/booking/<token>`.

| Prefix | Highlights |
|--------|-----------|
| `/auth` | Supabase Auth — login, register, logout, password reset, **MFA** (TOTP) |
| `/auth/sso` | **OIDC SSO** — PKCE authorize redirect · callback (JIT provisioning) |
| `/scim/v2` | **SCIM 2.0** — `Users` CRUD + `ServiceProviderConfig` (Bearer api-key scoped `scim`) |
| `/ai` | `status` · `summarize` · `draft-reply` · `next-best-action` · `search` · tool-using `agent` |
| `/privacy` | GDPR — org export, per-subject export, erasure/anonymization |
| `/orgs/me/members` | Member lifecycle — create, change role, activate/deactivate (RBAC) |
| `/admin` | Org management, impersonation, **security-events** log |

The client [`lib/api.ts`](lib/api.ts) routes CRM paths to PostgREST when Supabase is configured; integration paths go to Edge Functions with the session access token.

Enterprise identity setup: [`docs/sso-and-scim.md`](docs/sso-and-scim.md)

---

## 🔐 Security at a glance

| Concern | Implementation |
|---------|---------------|
| Authentication | **Supabase Auth** — email/password, refresh tokens, optional **TOTP MFA** |
| JWT claims | Custom access token hook injects `org_id` + `role` into every session JWT |
| Multi-tenant isolation | **RLS policies** on tenant tables (`organization_id = jwt.org_id`); Edge Functions verify org via `profiles` ([ADR 0001](docs/adr/0001-tenant-isolation-and-rls.md)) |
| Multi-tenant RBAC | Role matrix (owner / admin / manager / sales_rep / viewer) in Edge Functions + client permission gates |
| Rate limiting | Supabase platform limits + Edge Function throttling; public routes honeypot + token scoping |
| SSRF | Webhooks resolve + pin IPs; outbound fetch allow-lists in Edge Functions |
| Secrets / encryption | AES-256-GCM field encryption (OAuth tokens); service role key server-only |
| Compliance | Tamper-evident **security-event log** · **GDPR** export & erasure · audit log |
| AI governance | Per-tenant kill switch · monthly token spend cap · transcript retention purge |
| Supply chain | `npm audit --omit=dev --audit-level=critical` in CI |
| Branding guard | `npm run check:branding` — blocks legacy product names in committed source |

📄 Backup & disaster-recovery runbook: [`docs/disaster-recovery.md`](docs/disaster-recovery.md)

---

## ✅ Quality Gates

```bash
# Root (Next.js app — run before every push)
npm run check:branding    # no legacy product names in source
npm run typecheck         # tsc --noEmit
npm run lint:ci           # ESLint (Next.js)
npm run test:run          # Vitest unit tests
npm run build             # production build
npm audit --omit=dev --audit-level=critical   # production dependency audit

# Optional local checks
npm run ui:lint           # UI consistency guardrails
npm run i18n:lint         # i18n key parity
```

**Status:** Branding guard · TypeScript strict · ESLint · Vitest · production build · critical production-dependency audit on every CI run.

---

## 🧪 Testing

| Command | What it does |
|---------|--------------|
| `npm run test` | Vitest in watch mode (local dev) |
| `npm run test:run` | Vitest once (CI) — unit/smoke tests under [`tests/`](tests/) |
| `npm run typecheck` | `tsc --noEmit` across the app |
| `npm run lint` | ESLint via Next.js |
| `npm run build` | Full production build |

Unit tests live in [`tests/`](tests/) and run on Node via [`vitest.config.ts`](vitest.config.ts) (path alias `@/*` → repo root). Start with [`tests/smoke.test.ts`](tests/smoke.test.ts).

**Manual smoke checklist** (after `supabase db push` + `npm run dev`):

1. Landing renders at `/`; sign in at `/login`.
2. Create a contact, company, and deal; confirm they persist (PostgREST + RLS).
3. Move a deal across pipeline stages on the Deals board.
4. Settings → Integrations loads; connect a provider card.
5. (If configured) Settings → Integrations → **n8n**: connect, add an event subscription, hit **Test**, and confirm a row in the execution log.

---

## 🔁 CI/CD

| Workflow · Job | Trigger | Action |
|---|---|---|
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) · **ci** | push `master` / `main` / `propel/**` · PR | `npm ci` → branding → tsc → ESLint → build → Vitest → `npm audit` |

Deploy previews and production builds are handled by **Vercel** on merge to the connected branch.

---

## 🗺️ Roadmap

**Migration milestones:**

- [x] **Hito 1** — Propel rebrand, Next.js shell, marketing landing, CI
- [x] **Hito 2** — Supabase schema, profiles auth hook, JWT RLS
- [x] **Hito 3** — Edge Functions (Gmail, AI, automations, public routes)
- [x] **Hito 4** — Decommission legacy API stack, final docs, CI

**Product roadmap (ongoing):**

- [x] **SSO** — OIDC/OAuth2 federation (PKCE + JIT provisioning); SAML still open
- [x] **SCIM 2.0** provisioning — `Users` CRUD + `ServiceProviderConfig`, IdP-driven deprovisioning
- [x] Server-side RBAC across CRM CRUD + member/API-key/webhook management
- [ ] **HA / DR** — Supabase managed backups + documented restore ([runbook](docs/disaster-recovery.md))
- [ ] SAML 2.0 federation (for IdPs without OIDC)
- [x] RLS with JWT org claims ([ADR 0001](docs/adr/0001-tenant-isolation-and-rls.md))
- [x] MFA · RBAC · GDPR DSAR · AI governance · audit logging · CI gate

---

## 🌍 Internationalization

Fully translated UI in **6 locales** (en · es · pt · fr · de · it). `en` is the typed source of truth; `es`/`pt` are full catalogs; `de`/`fr`/`it` inherit via spread. Catalogs: [`i18n/`](i18n/).

---

<div align="center">

**Propel** · _Last updated: 2026-06-26_

</div>
