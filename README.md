<div align="center">

# ⚡ n0CRM

### Outbound-native CRM for high-velocity sales teams — *your infrastructure, your data, zero lock-in.*

Contacts · Companies · Deals · Pipelines · Sequences · Gmail & Calendar · Automations · Lead scoring · Reports — **plus a multi-provider, tool-using AI sales assistant.**

<br/>

[![CI](https://img.shields.io/badge/CI-tsc·eslint·vitest·build·audit-2ea44f?style=flat-square)](.gitea/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-API%2060%20·%20Web%20263-2ea44f?style=flat-square)](#-quality-gates)
[![Vulnerabilities](https://img.shields.io/badge/npm%20audit-0%20vulnerabilities-2ea44f?style=flat-square)](#-security-at-a-glance)
[![License](https://img.shields.io/badge/license-Internal-555?style=flat-square)](#)
[![Maintained by Clovr Labs](https://img.shields.io/badge/by-Clovr%20Labs-4f46e5?style=flat-square)](#)

<br/>

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React 18](https://img.shields.io/badge/React%2018-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify%205-000000?style=flat-square&logo=fastify&logoColor=white)
![Node 22](https://img.shields.io/badge/Node.js%2022-339933?style=flat-square&logo=node.js&logoColor=white)
![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL%2016-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Redis 7](https://img.shields.io/badge/Redis%207-DC382D?style=flat-square&logo=redis&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white)
![Gemini](https://img.shields.io/badge/AI-Gemini%20·%20OpenAI%20·%20Anthropic-8E75FF?style=flat-square&logo=googlegemini&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

---

## ✨ Why n0CRM

|  |  |
|---|---|
| 🤖 **AI sales assistant** | A tool-using agent over your **own** CRM data — searches contacts/deals, drafts replies, suggests the next best action, logs activities. Multi-provider with **Google Gemini free by default** (or OpenAI / Anthropic). Degrades gracefully with no key. |
| 🏢 **True multi-tenant** | Every query scoped to `organization_id` from the JWT. Server-side **RBAC** (owner / admin / manager / sales_rep / viewer) enforced in the API, not just the browser. |
| 🔐 **Security-first** | MFA (TOTP), account lockout, HttpOnly-cookie JWT with revocation, AES-256-GCM field encryption, SSRF-hardened webhooks, tamper-evident security-event log, GDPR data-subject export & erasure. **0 npm vulnerabilities.** |
| 📬 **Outbound-native** | Gmail thread sync + send/reply, Google Calendar, A/B email sequences, lead scoring, automations, multi-pipeline deals with a quote builder. |
| 🌍 **6 languages** | Full UI i18n: English · Español · Português · Français · Deutsch · Italiano. |
| 🛠️ **Yours to run** | Docker Compose or Private Prompt. Postgres + Fastify + Redis + nginx. No BaaS, no lock-in, no surprise bills. |

---

## 📑 Table of Contents

[Highlights](#-whats-new) · [Tech Stack](#-tech-stack) · [Architecture](#-architecture) · [CRM Modules](#-crm-modules) · [Quick Start](#-quick-start) · [Docker](#-docker--full-stack) · [Deploy](#-deploy--private-prompt) · [Environment](#-environment-variables) · [API](#-api-overview) · [Security](#-security-at-a-glance) · [Quality Gates](#-quality-gates) · [CI/CD](#-cicd) · [Roadmap](#-roadmap)

---

## 🆕 What's new

> The platform was migrated off Supabase to a self-hosted **Fastify + PostgreSQL + Redis** stack, then hardened toward enterprise readiness.

- 🤖 **AI / agentic capability** — multi-provider (`Gemini` free default / `OpenAI` / `Anthropic`), a tool-using CRM agent with persisted conversations, in-app assistant drawer, next-best-action on Contact/Deal detail, and Inbox summarize + draft-reply.
- 🛡️ **AI governance** — per-tenant kill switch, monthly token spend cap, and retention purge of AI transcripts.
- 🔑 **MFA (TOTP)** — RFC-6238, end-to-end (enroll in Settings → Security, code prompt at login).
- 🪪 **Enterprise SSO + SCIM** — OIDC/OAuth2 single sign-on (PKCE, JIT user provisioning) with a one-click login button, plus **SCIM 2.0** (`/scim/v2`) for automated user provisioning & deprovisioning from your IdP (Entra / Okta / OneLogin).
- 👮 **Server-side RBAC** — permission matrix + `requirePermission` middleware, wired into member-lifecycle, API-key and webhook management.
- 🧾 **Compliance** — security-event audit log (login/MFA/role changes/impersonation) + GDPR export & erasure endpoints.
- 🔭 **Observability** — request-correlation IDs (`x-request-id`), central error capture, liveness/readiness probes.
- ✅ **Backend CI gate** — the API gained ESLint + an 85-test Vitest suite + a CI job (it previously had *none*).

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TypeScript 5 · Vite · Tailwind CSS 3 (dark) |
| State / Forms | Zustand 5 (optimistic, API-backed) · React Hook Form + Zod |
| Charts / Icons | Recharts · lucide-react |
| i18n | en · es · pt · fr · de · it |
| API | Fastify 5 · Node.js 22 |
| Database | PostgreSQL 16 via postgres.js · PgBouncer (transaction pool) |
| Cache / Realtime | Redis 7 (ioredis) · Socket.io 4 (org-scoped rooms, Redis adapter) |
| Auth | JWT HS256 — HttpOnly cookie · `jti` denylist · TOTP MFA |
| Encryption | AES-256-GCM (field-level) |
| 🤖 AI | Google Gemini (free default) · OpenAI · Anthropic — tool-using CRM agent |
| Monitoring | Prometheus · Grafana · postgres/node-exporter · `x-request-id` correlation |
| Email / Payments | Nodemailer (SMTP) / Resend · Stripe |
| Testing | Vitest (API + frontend) · Playwright (e2e) |

---

## 🏗️ Architecture

```
Browser (React SPA)
  │
  ├── REST API   ──→  Fastify 5  (Node 22)
  │   │                 ├─ /auth  /contacts /deals /companies /activities
  │   │                 ├─ /leads /sequences /automations /products
  │   │                 ├─ /reports /forecast /inbox /calendar
  │   │                 ├─ /ai (status · summarize · draft-reply · next-best-action · search · agent)
  │   │                 ├─ /privacy (GDPR export · erasure)   /custom-fields /goals /audit /webhooks
  │   │                 ├─ /health(/live·/ready)  /metrics  /internal/*
  │   │                 └─ /admin  /public/v1
  │   │
  │   ├── Realtime   ──→  Socket.io 4 (Redis adapter) — org-scoped rooms, JWT + is_active verified
  │   └── Background ──→  sequence runner (FOR UPDATE SKIP LOCKED) · AI retention purge
  │
  ├── PgBouncer ──→ PostgreSQL 16   (transaction pool, every query org-scoped)
  └── Monitoring  ──→ Prometheus + Grafana · 6-hourly pg_dump backups
```

**Auth flow:** `POST /auth/login` → HS256 JWT (`sub / org / role / jti`) set as an **HttpOnly cookie** (never in the body — XSS-safe), with optional **TOTP** second factor. On 401 the client clears state and redirects to `/login`; logout revokes the `jti` in Redis.

---

## 🧩 CRM Modules

| Module | Description |
|--------|-------------|
| 📊 **Dashboard** | KPI cards, revenue chart, deal funnel, activity heatmap, onboarding checklist |
| 👤 **Contacts** | Table/grid, CSV export, duplicate detection, bulk actions, smart views, distribution lists, LinkedIn enrichment |
| 🏢 **Companies** | Industry/status/size filters, domain dedup, revenue tracking |
| 💼 **Deals** | Kanban + list, multi-pipeline, stage auto-resolve, quote builder (save/export/email) |
| ✅ **Activities** | Unified feed, overdue highlighting, quick complete/delete |
| 🎯 **Leads** | Configurable scoring engine, score snapshots, events timeline |
| ⚙️ **Automations** | Rule builder (trigger → condition → action), execution log |
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

> **Requirements:** Node 22+, PostgreSQL 16, Redis 7.

```bash
# 1. Infrastructure
docker compose up postgres redis -d            # or: brew services start postgresql@16 redis

# 2. API
cd api
cp .env.example .env                            # set DATABASE_URL + JWT_SECRET (min 32 chars)
npm install && npm run db:migrate && npm run db:seed   # seeds admin@n0crm.local / Admin1234!
npm run dev                                     # → http://localhost:3001

# 3. Frontend (separate terminal)
cd frontend
cp .env.example .env                            # VITE_API_URL=http://localhost:3001
npm install && npm run dev                      # → http://localhost:5173
```

> 💡 **Turn on the AI assistant:** grab a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and set `GEMINI_API_KEY` in `api/.env`. With no key, AI features hide themselves automatically.

---

## 🐳 Docker — Full Stack

```bash
export JWT_SECRET=<min-32-char-secret>
export TOKEN_ENCRYPTION_KEY=<32-char-aes-key>
export POSTGRES_PASSWORD=<db-password>
export INTERNAL_KEY=<min-16-char-internal-secret>
export GRAFANA_PASSWORD=<grafana-admin-password>

docker compose up -d
docker compose --profile seed up seed           # optional: seed initial data
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| API | http://localhost:3001 (loopback-bound — reached via nginx in prod) |
| Prometheus / Grafana | http://localhost:9090 · http://localhost:3002 |

The API auto-runs pending migrations on boot.

---

## ☁️ Deploy — Private Prompt

`privateprompt-app.json` (repo root) defines the 4-service stack: `postgres` · `redis` · `api` · `web`. `JWT_SECRET` and `TOKEN_ENCRYPTION_KEY` are auto-generated on first deploy; set `TRUST_PROXY=2` (platform edge + nginx). CI builds & pushes both images on every merge to `master`.

---

## 🔧 Environment Variables

### API (`api/.env`)

| Variable | Req | Description |
|----------|-----|-------------|
| `DATABASE_URL` | ✅ | `postgres://user:pass@pgbouncer:6432/db` |
| `REDIS_URL` | ✅ | `redis://localhost:6379` |
| `JWT_SECRET` | ✅ | HS256 signing secret (min 32 chars) |
| `TOKEN_ENCRYPTION_KEY` | ✅ | AES-256-GCM key (32-byte hex) |
| `CORS_ORIGIN` | ✅ | Comma-separated allowed origins (no `*` in prod) |
| `INTERNAL_KEY` | prod | Min 16 chars — gates `/internal/*` + `/metrics` scrape |
| `TRUST_PROXY` | – | Proxy hop count for client-IP — nginx `1` (default), edge+nginx `2`, direct `0` |
| `ALLOW_OPEN_REGISTRATION` / `REGISTRATION_ALLOWED_DOMAINS` | – | Self-signup toggle + domain allow-list (first user always allowed) |
| `GEMINI_API_KEY` | – | **Free** default AI provider — [get one](https://aistudio.google.com/apikey) |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | – | Alternative AI providers |
| `AI_DEFAULT_PROVIDER` | – | `gemini` (default) · `openai` · `anthropic` |
| `AI_AGENT_MAX_STEPS` | – | Agent tool-call ceiling — default `8` |
| `AI_MONTHLY_TOKEN_CAP` / `AI_MESSAGE_RETENTION_DAYS` | – | Per-org spend cap (`0`=∞) · transcript retention (`0`=keep) |
| `SENTRY_DSN` | – | Error tracking (else structured logs) |
| `SMTP_*` / `RESEND_API_KEY` | – | Outbound email |
| `STRIPE_SECRET_KEY` | – | Billing |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | – | Gmail + Calendar OAuth |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | API base URL (local dev: `http://localhost:3001`) |
| `VITE_APP_CHANNEL` | `development` | `production` / `staging` for deployed builds |

---

## 🔌 API Overview

Routes are served under `/api` (nginx proxy) and require the auth cookie unless noted. Key prefixes: `/auth` · `/contacts` · `/companies` · `/deals` · `/activities` · `/leads` · `/sequences` · `/automations` · `/products` · `/reports` · `/forecast` · `/inbox` · `/calendar` · `/custom-fields` · `/goals` · `/audit` · `/webhooks` · `/notifications` · `/admin` · `/public/v1`.

| Prefix | Highlights |
|--------|-----------|
| `/auth` | login (+ TOTP), register, logout, refresh, password reset, **MFA** (`/mfa/setup·enable·disable`) |
| `/auth/sso` | **OIDC SSO** — `status` · `start` (PKCE authorize redirect) · `callback` (JIT provisioning) |
| `/scim/v2` | **SCIM 2.0** — `Users` CRUD + `ServiceProviderConfig` (Bearer api-key scoped `scim`; deprovision = deactivate + session revoke) |
| `/ai` | `status` · `summarize` · `draft-reply` · `next-best-action` · `search` · tool-using `agent` (persisted conversations) |
| `/privacy` | GDPR — org export, per-subject export, erasure/anonymization |
| `/orgs/me/members` | member lifecycle — change role / activate-deactivate (RBAC + safety rules) |
| `/admin` | org management, impersonation, **security-events** log |

Full reference: [`api/README.md`](api/README.md). Enterprise identity setup: [`docs/sso-and-scim.md`](docs/sso-and-scim.md).

---

## 🔐 Security at a glance

| Concern | Implementation |
|---------|---------------|
| Authentication | JWT HS256 (alg pinned), HttpOnly cookie, `jti` denylist, **TOTP MFA** |
| Account protection | bcrypt (rounds 12), **account lockout** (10 fails / 15 min → 429), configurable registration |
| Multi-tenant isolation | **App-layer org scoping is the authoritative control** — every query filters on `organization_id` from the JWT + writes verify FK ownership. RLS policies exist as opt-in defense-in-depth (not relied upon under the owner role + PgBouncer pool — see [ADR 0001](docs/adr/0001-tenant-isolation-and-rls.md)) |
| Multi-tenant RBAC | **Server-side `requirePermission`/`requireCrudPermission`** across CRM CRUD + member/API-key/webhook management (viewer read-only, sales_rep no-delete, etc.) |
| Rate limiting | 10/15 min auth · 500/min per-org · `TRUST_PROXY`-resolved IP (XFF rotation can't bypass) |
| SSRF | Webhooks resolve + pin the IP; Slack/AI calls use fixed host allow-lists |
| Secrets / encryption | AES-256-GCM field encryption (incl. MFA seeds & OAuth tokens); required secrets enforced at boot |
| Compliance | Tamper-evident **security-event log** · **GDPR** export & erasure · audit log |
| AI governance | Per-tenant kill switch · monthly token spend cap (429) · transcript retention purge |
| Hardened endpoints | `/metrics` (socket-peer + key), `/_debug/sql` (READ ONLY tx), no public DB console |
| Supply chain | `npm audit --audit-level=critical` in CI — **0 vulnerabilities** |

📄 Full audit + remediation history: [`SECURITY-AUDIT.md`](SECURITY-AUDIT.md) · Backup & disaster-recovery runbook: [`docs/disaster-recovery.md`](docs/disaster-recovery.md).

---

## ✅ Quality Gates

```bash
# API
cd api && npx tsc --noEmit && npm run lint && npx vitest run && npm run build && npm audit --audit-level=critical

# Frontend
cd frontend && npm run ui:lint && npm run i18n:lint && npm run i18n:coverage \
  && npm run lint:ci && npx tsc --noEmit && npm run test:run && npm run build && npm run bundle:check
```

**Status:** API 60 tests · Frontend 263 tests · 0 ESLint warnings · bundle 125 KB / 250 KB cap · 0 npm vulnerabilities.

---

## 🔁 CI/CD

| Workflow · Job | Trigger | Action |
|---|---|---|
| `ci.yml` · **api** | push `master` / PR | `npm ci` → tsc → ESLint → Vitest → build → `npm audit` |
| `ci.yml` · **ci** | push `master` / PR | UI + i18n guardrails, ESLint, tsc, Vitest, build, bundle budget |
| `ci.yml` · **security** | after `ci` | `npm audit --audit-level=critical` |
| `build-api.yml` / `build-production.yml` | push `master` | build & push Docker images to Gitea |

---

## 🗺️ Roadmap

Shipped foundations toward enterprise-grade; next up:

- [x] **SSO** — OIDC/OAuth2 federation (PKCE + JIT provisioning); SAML still open
- [x] **SCIM 2.0** provisioning — `Users` CRUD + `ServiceProviderConfig`, IdP-driven deprovisioning
- [x] `requirePermission`/`requireCrudPermission` across CRM CRUD + member/API-key/webhook management
- [ ] **HA / DR** — replicated Postgres + Redis, WAL/PITR, automated failover ([restore runbook already documented](docs/disaster-recovery.md))
- [ ] SAML 2.0 federation (for IdPs without OIDC)
- [x] RLS decision documented — app-layer scoping is authoritative; RLS is opt-in defense-in-depth ([ADR 0001](docs/adr/0001-tenant-isolation-and-rls.md))
- [x] MFA · RBAC · GDPR DSAR · AI governance · audit logging · observability · backend CI

---

## 🌍 Internationalization

Fully translated UI in **6 locales** (en · es · pt · fr · de · it). `en` is the typed source of truth; `es`/`pt` are full catalogs; `de`/`fr`/`it` inherit via spread. Catalogs: `frontend/src/i18n/`.

---

<div align="center">

**Internal tool — built & maintained by Clovr Labs** · _Last updated: 2026-06-11_

</div>
