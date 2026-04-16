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
5. Apply pending files under `supabase/migrations/` in chronological order.
6. Restart the dev server (`npm run dev`).

When Supabase is configured, the app uses real authentication and PostgreSQL. Without credentials, use **local** mock mode (`VITE_ALLOW_DEMO_MODE=true` in dev) or a **`demo`** channel build for hosted static demos — see root [`README.md`](../README.md) and [`src/lib/envChannel.ts`](../src/lib/envChannel.ts).

## Migration Notes

- Migration filenames are timestamped and should be applied in ascending order.
- Never edit an already applied migration; create a new migration for follow-up changes.
- Keep migration behavior aligned with related docs in `docs/` (runbooks/contracts).
- `20260415120000_list_organization_members_with_identity.sql` — `list_organization_members_with_identity()` RPC (org-scoped member email + display name for the app directory); grant `EXECUTE` to `authenticated` only.
