# Supabase — Edge Functions (Legacy)

**Note: Authentication and realtime are now handled by velo-api (api/ subdirectory in monorepo). These Edge Functions are legacy integrations and should not be called from the frontend.**

Core CRM functionality has migrated to `velo-api` (Fastify 5 + PostgreSQL 16). The Edge Functions in this directory are **legacy** — the frontend no longer calls them directly.

## What moved to velo-api

| Was Supabase Edge Function | Now velo-api route | Status |
|----------------------------|--------------------|--------|
| Gmail OAuth + token management | `/gmail/*` | ✅ Fully migrated (2026-05-13) |
| API keys + lead capture tokens | `/integrations/*` | ✅ Fully migrated |
| Public CRM read API | `/public/v1/*` | ✅ Fully migrated |
| Email tracking (open/click pixel) | `/email-tracking/*` | ✅ Fully migrated |
| Org creation, invitations | `/orgs`, `/invitations/*` | ✅ Fully migrated |
| Email send (Resend / SMTP) | `/email/send`, `/smtp/*` | ✅ Fully migrated |
| Auth (register, login, password reset) | `/auth/*` | ✅ Fully migrated (JWT via velo-api) |
| Realtime subscriptions | Socket.io (api:3001) | ✅ Fully migrated |

## Legacy Supabase deployments (if applicable)

These functions may still be deployed in your Supabase project as scheduled jobs or Edge Functions (not called from frontend):

- `lead-score-maintenance` — nightly lead score recomputation
- `sequence-advance` — advances email sequence enrollments
- `promote-lead` — converts leads to contacts/deals
- `purge-soft-deleted` — hard-deletes soft-deleted rows after retention period
- `data-export` — org data export jobs

These are **optional** and can be migrated to velo-api background jobs (BullMQ) in a future release.

## Supabase SQL migrations (reference only)

`supabase/migrations/` contains the **historical** Supabase PostgreSQL schema used during development. **Not used by velo-api** — velo-api has its own migrations under `../api/migrations/`.

These remain in the repo for reference and version control history.

## Webhook delivery (if using Supabase)

If webhook delivery still runs through Supabase:

- `webhook-subscriptions` — manages subscriptions + signing secrets
- `webhook-worker` — processes `webhook_outbox`, delivers to subscriber URLs with HMAC-SHA256

**Recommended:** Migrate to velo-api webhook handler (`api/src/routes/webhook-subscriptions.ts`). Supabase webhooks are no longer called from the CRM.

---

*Last updated: 2026-05-18 — Frontend migration complete; all Supabase Edge Functions replaced by velo-api routes. This directory retained for historical reference and archive purposes only.*
