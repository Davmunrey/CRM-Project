# Public API — phase 1 (read-only)

This document describes the Velo public REST surface after the API & capture hardening pass. The database migration `20260424120000_webhook_delete_payload_api_keys_lead_capture.sql` adds `organization_api_keys` (hashed secrets).

## Authentication

- **API keys** are created by org admins via the `api-keys` Edge Function (`action`: `create` | `list` | `delete` | `revoke`), authenticated with the user JWT.
- Format: `crm_live_<base64url>` (only shown once at creation).
- Storage: **SHA-256 hex** of the full key; never store the plaintext key in Postgres.
- `create` returns the full secret only once (`apiKey`) and a `warning`.
- `list` always returns `200` with an array (`keys`), even when empty.
- `delete` is idempotent and returns `200` with `deleted: true|false`.
- Error payload contract for management functions: `{ error, code, status, request_id }`.

## Read API (`crm-public-api`)

- **No JWT** — verify_jwt = false; authenticate with `Authorization: Bearer <api_key>`.
- **GET** `.../functions/v1/crm-public-api?collection=<deals|contacts|companies|activities>&limit=<1–100>`
- Response: `{ "data": [...], "meta": { "collection", "limit" }, "request_id": "<uuid>" }`
- Rows are filtered by the key’s `organization_id`. Successful requests update `last_used_at` on the key row.
- Error payload includes `request_id` so support can map UI errors to Edge logs.

## Operational troubleshooting

- `401` + `code: unauthorized`: expired JWT for management endpoints, missing Bearer key for `crm-public-api`, or revoked/deleted API key.
- `403` + `code: forbidden`: authenticated user is not privileged in the target organization.
- `400` + `code: validation_error`: missing `organizationId`, `name`, or other required fields.
- Use `request_id` from the response when checking Supabase Edge Function logs.

## Idempotency and behavior notes

- Phase 1 is read-only; **Idempotency-Key** is reserved for future mutating methods.
- Management deletes are idempotent by design to avoid broken retries in the UI/automation path.

## Operational notes

- Deploy Edge Functions after linking the project: see `supabase/README.md`.
- Revoked keys (`revoked_at` set) are rejected with 401.

## Automated regression (E2E)

- See [`deployment-spa-and-env.md` — E2E integrations smoke](./deployment-spa-and-env.md#e2e-integrations-smoke) for env vars, CI secrets, and `npm run test:e2e:integrations:local`.
