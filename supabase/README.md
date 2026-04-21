# Supabase Setup

This directory contains the SQL artifacts required to run the CRM in Supabase mode (auth, data model, RLS, and migrations).

## Quick Navigation

- Main project README: `../README.md`
- Documentation index: `../docs/README.md`
- Base schema file: `supabase/schema.sql`
- Incremental changes: `supabase/migrations/`

## Quick Start

1. Create a project at [supabase.com](https://supabase.com).
2. Copy your project URL and anon key from **Settings -> API**.
3. Create a `.env.local` file in the project root:

```bash
# Optional locally; required on CI for production/staging channels (see ../docs/deployment-spa-and-env.md)
# VITE_APP_CHANNEL=staging

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. In Supabase SQL Editor, run `supabase/schema.sql`.
5. Apply pending files under `supabase/migrations/` in chronological order (includes `20260421190000_realtime_publication_more_tables.sql`, which registers extra tables on the `supabase_realtime` publication so the app’s `initRealtimeSubscriptions` receives changes for enrollments, automation runs, leads, audit rows, and org members).
6. Restart the dev server (`npm run dev`).

When Supabase is configured, the app uses real authentication and PostgreSQL. Without credentials, use **local** mock mode (`VITE_ALLOW_DEMO_MODE=true` in dev) or a **`demo`** channel build for hosted static demos — see root [`README.md`](../README.md) and [`src/lib/envChannel.ts`](../src/lib/envChannel.ts).

## Remote project (CLI): migrations + webhooks

### Without a local terminal (GitHub Actions)

If you cannot run a shell locally, use the manual workflow **[`.github/workflows/supabase-remote-deploy.yml`](../.github/workflows/supabase-remote-deploy.yml)**:

1. In GitHub: **Settings → Secrets and variables → Actions**, add:
   - `SUPABASE_ACCESS_TOKEN` — [Account tokens](https://supabase.com/dashboard/account/tokens)
   - `SUPABASE_PROJECT_ID` — project ref from the dashboard URL (`…/project/<ref>`)
   - `SUPABASE_DB_PASSWORD` — **Settings → Database** (reset if you do not have it)
   - *(Recommended)* `WEBHOOK_WORKER_SECRET` — long random string for the `webhook-worker` Edge function
2. **Actions → “Supabase remote deploy” → Run workflow**.

That applies `supabase/migrations/` to the linked project and deploys `webhook-subscriptions` and `webhook-worker`.

### On your machine (CLI)

From the repo root after `npm install` (installs the `supabase` dev dependency):

1. `npm run supabase:login` — opens the browser and stores an access token for the CLI.
2. `npm run supabase:link -- --project-ref <your-project-ref>` — links the repo to the project (creates local config under `.supabase/`, gitignored).
3. `npm run supabase:db:push` — applies pending SQL in `supabase/migrations/` to the linked remote database (review with `supabase db diff` if you use a branching workflow).
4. **Once per project:** `npm run supabase:secrets:set-webhook-worker` — sets Edge secret `WEBHOOK_WORKER_SECRET`. If the env var `WEBHOOK_WORKER_SECRET` is unset, a new random value is generated and printed; save it for GitHub Actions / cron.
5. `npm run supabase:deploy:webhooks` — deploys `webhook-subscriptions` and `webhook-worker`.

Shortcut for steps 3 + 5 after the first secret setup: `npm run supabase:webhooks:push`.

## Migration Notes

- Migration filenames are timestamped and should be applied in ascending order.
- Never edit an already applied migration; create a new migration for follow-up changes.
- Keep migration behavior aligned with related docs in `docs/` (runbooks/contracts).
- `20260415120000_list_organization_members_with_identity.sql` — `list_organization_members_with_identity()` RPC (org-scoped member email + display name for the app directory); grant `EXECUTE` to `authenticated` only.
- `20260420140000_webhooks_outbound.sql` — outbound webhooks: `webhook_subscriptions`, `webhook_subscription_secrets`, `webhook_outbox`, `webhook_delivery_log`, triggers on deals/contacts/companies/activities.

## Edge Functions: outbound webhooks

Deploy:

- `webhook-subscriptions` — JWT-authenticated: create subscription + signing secret, rotate secret, send test `ping` payload.
- `webhook-worker` — **no JWT**; requires header `x-webhook-worker-secret` matching the Edge secret `WEBHOOK_WORKER_SECRET`.

From the repo root (after `npm install` and `supabase login` / `supabase link`): `npm run supabase:deploy:webhooks`

**Supabase secrets (Dashboard → Edge Functions → Secrets):**

- `WEBHOOK_WORKER_SECRET` — long random string; use the same value when invoking the worker (cron, GitHub Actions, etc.).

**`supabase/config.toml`** sets `[functions.webhook-worker] verify_jwt = false` so schedulers can call the worker without a user session.

**Process the queue** (example):

```bash
curl -sS -X POST "https://<project-ref>.supabase.co/functions/v1/webhook-worker" \
  -H "x-webhook-worker-secret: $WEBHOOK_WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d "{}"
```

Schedule the above every 1–5 minutes (Supabase scheduled functions, external cron, or **GitHub Actions**) so `webhook_outbox` rows move to subscribers.

**GitHub Actions (optional):** workflow [`.github/workflows/webhook-worker.yml`](../.github/workflows/webhook-worker.yml) runs every five minutes when repository secrets are set:

- `WEBHOOK_WORKER_INVOKE_URL` — full URL, e.g. `https://<project-ref>.supabase.co/functions/v1/webhook-worker`
- `WEBHOOK_WORKER_SECRET` — same string as the Edge secret `WEBHOOK_WORKER_SECRET`

If either secret is missing, the job exits successfully without calling the worker (safe for forks and local-only repos).

---

*Last updated (git): **2026-04-21***
