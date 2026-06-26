#!/usr/bin/env bash
# Propel — one-shot Supabase setup.
#
# Applies the database schema + deploys the Edge Functions to your project.
# The migrations are verified to apply cleanly (schema · profiles auth hook ·
# JWT RLS · tenant bootstrap).
#
# Prerequisites (export these first, or the CLI will prompt):
#   export SUPABASE_ACCESS_TOKEN=...   # https://supabase.com/dashboard/account/tokens
#   export SUPABASE_DB_PASSWORD=...    # Project Settings → Database → password
#                                      # (only needed for a non-interactive db push)
#
# Usage:  bash scripts/setup-supabase.sh
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-fhugkidzcojrnalvqvln}"

# Prefer a globally-installed CLI; fall back to npx.
if command -v supabase >/dev/null 2>&1; then
  SB() { supabase "$@"; }
else
  echo "→ Supabase CLI not found on PATH — using 'npx supabase'."
  SB() { npx --yes supabase "$@"; }
fi

echo "→ Linking project ${PROJECT_REF}"
SB link --project-ref "${PROJECT_REF}"

echo "→ Pushing migrations (schema + auth hook + RLS + tenant bootstrap)"
SB db push

echo "→ Deploying Edge Functions"
for fn in propel-api public-api public-forms public-booking; do
  echo "   • ${fn}"
  SB functions deploy "${fn}"
done

cat <<'NEXT'

✅ Database + Edge Functions deployed.

Remaining manual steps (Supabase Dashboard):
  1. Authentication → Hooks → enable the "custom_access_token_hook" Postgres
     function (injects org_id + role into the JWT — required for RLS + onboarding).
  2. (Optional) Edge Function secrets to light up integrations:
       supabase secrets set GEMINI_API_KEY=...            # AI (free default)
       supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...   # Gmail/Calendar
       supabase secrets set STRIPE_SECRET_KEY=...         # Billing
     (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
      automatically — no need to set them.)

Then set the app env vars (Vercel + .env.local):
  NEXT_PUBLIC_SUPABASE_URL=https://<project_ref>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
  SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # server-only
  NEXT_PUBLIC_APP_URL=<your production URL>
NEXT
