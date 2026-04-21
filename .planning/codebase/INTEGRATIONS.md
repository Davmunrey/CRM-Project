# External Integrations

**Analysis Date:** 2026-04-21

## APIs & External Services

**AI (LLM features in the browser):**
- **Status in this repo:** The former client stack (`src/services/aiService.ts`, `src/store/aiStore.ts`, `src/components/ai/*`, `src/constants/aiModels.ts`) was **removed** (see `.planning/phases/06-secondary-stores-real-users/06.5-SUMMARY.md`). There is **no** in-app OpenRouter/Anthropic integration in the current tree.
- **Policy:** Any future AI must use **Edge-only** proxies (keys never in the browser) — tracked as open **AI-*** items in [`.planning/REQUIREMENTS.md`](../REQUIREMENTS.md).
- **i18n leftovers:** Some Settings-related translation keys still mention API keys; treat as non-functional until a new Edge-backed feature ships.

**Email — Gmail:**
- Used for: reading inbox threads and sending emails from within the CRM
- SDK/Client: Raw `fetch` to `https://gmail.googleapis.com/gmail/v1/users/me` (`src/services/gmailService.ts`)
- Auth: OAuth 2.0 Authorization Code + PKCE
  - Browser initiates PKCE flow and callback (`/auth/gmail/callback`)
  - Edge Function `gmail-oauth-exchange` performs code exchange securely
  - Refresh token is stored server-side in `gmail_tokens`
  - Short-lived access token is stored in-memory via `GmailTokenContext` (not persisted)
  - Edge Function `gmail-refresh-token` is used for token renewal
- Scopes requested:
  - `https://www.googleapis.com/auth/gmail.send`
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/gmail.compose`
- Operations: `GET /threads`, `GET /threads/{id}`, `POST /messages/send`, `GET /profile`
- Additional integration: `gmail_thread_links` table stores pinned thread-to-CRM links (contact/company/deal), and `20260410195500_gmail_thread_workspace.sql` extends workspace-aware linkage behavior.

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (env vars, optional)
  - Client: `@supabase/supabase-js` 2.100, initialized in `src/lib/supabase.ts`
  - The client is `null` when env vars are absent; all stores check `isSupabaseConfigured` before using it
  - Schema defined in `supabase/schema.sql`
  - Tables: core CRM tables + org/auth support + secondary modules (products, templates, sequences, automations, goals, audit, custom fields, `gmail_tokens`, `gmail_thread_links`)
  - Row Level Security (RLS) enabled on tenant tables
    - CRM rows are scoped to the caller’s **organization** (`organization_id` / membership checks; see `supabase/schema.sql` and migrations for exact predicates)
    - User-private surfaces (e.g. notifications, per-user Gmail tokens) additionally require `auth.uid()` ownership where applicable
  - `updated_at` auto-managed via PostgreSQL trigger `handle_updated_at()`
  - UUID primary keys via `uuid-ossp` extension
  - TypeScript types generated/maintained manually in `src/lib/database.types.ts`

**Fallback / Offline Storage:**
- When Supabase is not configured, all CRM data is persisted to `localStorage` via Zustand `persist` middleware
- This is the default mode in development without a Supabase project configured
- `localStorage` keys: `crm_auth` (auth persist) and per-domain keys from `LS_KEYS` in `src/utils/constants.ts` plus explicit `name` fields on individual `persist(...)` configs (e.g. `crm_emails_v2`, `crm_views`, `crm_onboarding_v1`, `crm_attachments`) — see stores under `src/store/`

**File Storage:**
- Not detected — no S3, Supabase Storage, or other file storage integration present

**Caching:**
- None — no Redis, Memcached, or CDN cache layer

## Authentication & Identity

**Primary Auth Provider:**
- Supabase Auth (when `isSupabaseConfigured` is true)
  - Initialized via `initSupabaseAuth()` in `src/store/authStore.ts`
  - Listens to `supabase.auth.onAuthStateChange` and maps Supabase user to `AuthUser` type
  - Role and organization context resolved from JWT/app metadata + org membership

**Fallback Auth Provider (demo mode only):**
- Local/demo auth state is used only when Supabase env vars are absent

**Gmail OAuth:**
- Handled separately via Google Identity Services (see Gmail section above)
- Not connected to the primary auth system

## Monitoring & Observability

**Error Tracking:**
- Not detected — no Sentry, Datadog, or similar integration

**Logs:**
- `src/store/auditStore.ts` provides an in-app audit log: `logAction(action, entity, entityId, title, detail)`
- Audit entries are persisted in Supabase in configured mode (with local fallback only when Supabase is not configured)
- Audit log is viewable at the `/audit` route (`src/pages/AuditLog.tsx`)
- No external log shipping

## CI/CD & Deployment

**Hosting:**
- Static SPA — repo includes [`vercel.json`](../../vercel.json) and [`public/_redirects`](../../public/_redirects) as **examples** of SPA fallback routing; other hosts are supported with equivalent rewrite rules (see [`docs/deployment-spa-and-env.md`](../../docs/deployment-spa-and-env.md))
- Application builds to a static bundle (`npm run build`) suitable for any static host

**CI Pipeline:**
- GitHub Actions CI is present and aligned with Vitest + TypeScript checks

## Environment Configuration

**Required env vars (Supabase — optional):**
- `VITE_SUPABASE_URL` — Supabase project REST/Auth URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon (public) key

**Runtime-configured secrets (entered by user in Settings UI, stored locally as applicable):**
- *(none for LLM providers — client AI store removed)*  
- Google OAuth Client ID — used to initiate OAuth; token exchange and refresh handled by Supabase Edge Functions

**Secrets location:**
- `.env` file (gitignored) for Supabase URL/key
- Gmail OAuth: user-driven consent; refresh material handled by Edge Functions — not committed to `.env` as end-user secrets

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- **CRM domain webhooks (v1):** Postgres triggers enqueue rows in `webhook_outbox` when deals/contacts/companies/activities change (if the org has ≥1 enabled subscription). Edge Function `webhook-worker` delivers signed HTTPS POSTs to each matching `webhook_subscriptions.target_url`. See migration `20260420140000_webhooks_outbound.sql` and `supabase/README.md`.
- Gmail send remains a direct API call (not CRM lifecycle webhooks).

**Product spec (CRM Pro outbound webhooks v1 + parity vs Pipedrive):** [`docs/master-pipedrive-crm-pro-comparison.md`](../../docs/master-pipedrive-crm-pro-comparison.md).

---

*Integration audit: 2026-04-21*
---

*Last updated (git): **2026-04-21** — link to Pipedrive comparison / webhooks spec master; footer refreshed with repo doc sweep.*
