# Supabase — Edge Functions (Legacy)

Core CRM functionality has migrated to `velo-api` (Fastify + PostgreSQL). The Edge Functions in this directory are **legacy** — the frontend no longer calls them directly.

## What moved to velo-api

| Was Supabase Edge Function | Now velo-api route |
|----------------------------|--------------------|
| Gmail OAuth + token management | `/gmail/*` |
| API keys + lead capture tokens | `/integrations/*` |
| Public CRM read API | `/public/v1/*` |
| Email tracking (open/click pixel) | `/email-tracking/*` |
| Org creation, invitations | `/orgs`, `/invitations/*` |
| Email send (Resend / SMTP) | `/email/send`, `/smtp/*` |

## Background jobs still in Supabase (if deployed)

These functions may remain deployed as Supabase scheduled jobs:

- `lead-score-maintenance` — nightly lead score recomputation
- `sequence-advance` — advances email sequence enrollments
- `promote-lead` — converts leads to contacts/deals
- `purge-soft-deleted` — hard-deletes soft-deleted rows after retention period
- `data-export` — org data export jobs

## Supabase SQL migrations

`supabase/migrations/` contains the historical Supabase PostgreSQL schema. **Not used by velo-api** — velo-api has its own migrations under `../velo-api/migrations/`.

These remain in the repo for reference.

## Outbound webhooks (if still using Supabase)

If webhook delivery runs through Supabase:

- `webhook-subscriptions` — manages subscriptions + signing secrets
- `webhook-worker` — processes `webhook_outbox`, delivers to subscriber URLs with HMAC-SHA256

Otherwise webhooks are handled by velo-api (`/webhook-subscriptions/*`).

---

*Last updated: 2026-05-14*
