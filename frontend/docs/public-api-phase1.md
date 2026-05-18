# Public API — phase 1 (read-only)

This document describes the Velo public REST surface. The database migration `20260424120000_webhook_delete_payload_api_keys_lead_capture.sql` adds `organization_api_keys` (hashed secrets). This is a self-hosted REST API at `/public/v1/*`.

## Authentication

- **API keys** are created by org admins in the UI (Settings → API keys), authenticated with the user JWT.
- Format: `crm_live_<base64url>` (only shown once at creation).
- Storage: **SHA-256 hex** of the full key; never store the plaintext key in Postgres.
- Authenticate requests with `Authorization: Bearer <api_key>` header.
- Error payload contract: `{ error, code, status, request_id }`.

## Read API endpoints

Base URL: `{api_origin}/public/v1`

- **GET** `/public/v1/<collection>?limit=<1–100>` where `<collection>` is `deals`, `contacts`, `companies`, or `activities`.
- Response: `{ "data": [...], "meta": { "collection", "limit" }, "request_id": "<uuid>" }`
- Rows are filtered by the key’s `organization_id`. Successful requests update `last_used_at` on the key row.
- Error payload includes `request_id` so support can map API errors to backend logs.

## Operational troubleshooting

- `401` + `code: unauthorized`: missing `Authorization: Bearer <api_key>` header, or revoked/deleted API key.
- `403` + `code: forbidden`: API key's organization does not have access to the requested collection.
- `400` + `code: validation_error`: invalid `limit`, invalid collection name, or malformed request.
- Use `request_id` from the response when checking backend logs.

## Idempotency and behavior notes

- Phase 1 is read-only; **Idempotency-Key** is reserved for future mutating methods.
- Management deletes are idempotent by design to avoid broken retries in the UI/automation path.

## Operational notes

- API keys are managed in the CRM UI; revoked keys (`revoked_at` set) are rejected with 401.
- Base URL depends on your deployment: `http://localhost:3000/public/v1` for local dev, `https://api.yourdomain.com/public/v1` for production.

## Example request

```bash
curl -X GET "http://localhost:3000/public/v1/deals?limit=10" \
  -H "Authorization: Bearer crm_live_..." \
  -H "Content-Type: application/json"
```

---

*Last updated (git): **2026-05-18***
