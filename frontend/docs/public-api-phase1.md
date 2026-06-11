# Public API — Lead Capture

The n0CRM public API exposes a single write endpoint for ingesting leads from embeddable
forms and external integrations. It is **not** a read/collection API — there are no
public `GET` endpoints.

Implementation: `api/src/routes/publicApi.ts` (mounted at prefix `/public/v1`).
The API service listens on port `3001`; in production the SPA's nginx proxies the API
under `/api`, so the canonical path is `/api/public/v1/leads`.

## Endpoint

**POST** `/api/public/v1/leads`

Creates (or updates) a contact of type `lead` in the authenticated key's organization.

Rate limit: **20 requests / minute** per client.

## Authentication

- Authenticate with the header `x-api-key: <key>`. There is no `Authorization: Bearer` flow.
- Keys are minted in the UI under **Settings → Integrations**, by members with the
  `apikeys:manage` permission (owner/admin). The plaintext key is shown **once** at creation.
- Format: `n0crm_<base64url>` (24 random bytes). Only the SHA-256 hash (`key_hash`) is
  stored in the `api_keys` table — never the plaintext.
- A key is rejected if it does not exist, is revoked (`revoked_at` set), or is expired
  (`expires_at` in the past).

### Scopes

API keys carry an optional scope allow-list (selected in the Settings → Integrations
scope picker). This endpoint requires the **`leads:write`** scope.

- A key with **no scopes** declared is treated as full access (back-compat with
  pre-scope keys).
- A `*` or `all` wildcard scope grants everything.
- Otherwise the key must explicitly include `leads:write`.

A key lacking the scope receives:

```json
{ "error": "Insufficient API key scope", "required": "leads:write" }
```

## Request body

JSON object. `email` is required; name fields are optional and accept either camelCase or
snake_case (camelCase wins if both are present).

| Field        | Type   | Required | Notes                          |
| ------------ | ------ | -------- | ------------------------------ |
| `email`      | string | yes      | Valid email, max 254 chars     |
| `firstName`  | string | no       | Max 100 chars                  |
| `first_name` | string | no       | Alias for `firstName`          |
| `lastName`   | string | no       | Max 100 chars                  |
| `last_name`  | string | no       | Alias for `lastName`           |

The contact is upserted on `(email, organization_id)`: a new lead is inserted, or an
existing row's `updated_at` is bumped.

## Responses

| Status | Body | When |
| ------ | ---- | ---- |
| `201` | The contact row (`id`, `email`, `first_name`, `last_name`, `type`, `created_at`) | Lead captured |
| `400` | `{ "error": "Invalid request", "details": { ... } }` | Body fails Zod validation (e.g. missing/invalid email) |
| `401` | `{ "error": "API key required" }` | Missing `x-api-key` header |
| `401` | `{ "error": "Invalid API key" }` | Unknown, revoked, or expired key |
| `403` | `{ "error": "Insufficient API key scope", "required": "leads:write" }` | Key lacks `leads:write` |
| `429` | rate-limit error | More than 20 requests/minute |

## Example

```bash
curl -X POST "https://your-n0crm-host/api/public/v1/leads" \
  -H "x-api-key: n0crm_..." \
  -H "Content-Type: application/json" \
  -d '{ "email": "lead@example.com", "firstName": "Ada", "lastName": "Lovelace" }'
```

Local development (API bound to `127.0.0.1:3001`):

```bash
curl -X POST "http://localhost:3001/api/public/v1/leads" \
  -H "x-api-key: n0crm_..." \
  -H "Content-Type: application/json" \
  -d '{ "email": "lead@example.com" }'
```

---

*Last updated: 2026-06-11*
