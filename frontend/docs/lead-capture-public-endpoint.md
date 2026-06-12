# Lead capture (public endpoint)

## Overview

Unauthenticated prospects submit a form that creates a **lead** (a contact of type `lead`) inside the correct organization. The endpoint is a standard Fastify route on the self-hosted API — there is no Supabase Edge, no `functions/v1/`, and no separate promote-lead step.

---

## 🔑 Authentication

The endpoint is authenticated by an **API key** (prefix `n0crm_`) passed in the `x-api-key` request header. The key must have the `leads:write` scope explicitly granted (keys with no declared scopes retain legacy full-access; a key that declares any explicit scope list is restricted to it).

| Header | Value |
|--------|-------|
| `x-api-key` | `n0crm_<key>` (full plaintext key, returned once on creation) |

Keys are created and scoped in **Settings > Integrations**. Only users with the `apikeys:manage` permission (owner / admin) can create, rotate, or revoke keys.

---

## 📥 Request

```http
POST /api/public/v1/leads
x-api-key: n0crm_<key>
Content-Type: application/json
```

### Body fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | string | Yes | Valid email, max 254 chars |
| `firstName` or `first_name` | string | No | Max 100 chars; both spellings accepted |
| `lastName` or `last_name` | string | No | Max 100 chars; both spellings accepted |

> The endpoint accepts camelCase (`firstName`) and snake_case (`first_name`) interchangeably for compatibility with both browser fetch calls and server-side integrations.

### Rate limit

20 requests per minute per API key.

---

## 📤 Responses

| Status | Body | Meaning |
|--------|------|---------|
| `201` | `{ id, email, first_name, last_name, type, created_at }` | Lead created (or re-touched on duplicate) |
| `400` | `{ error: "Invalid request", details: ... }` | Validation failure (missing/malformed fields) |
| `401` | `{ error: "API key required" }` | `x-api-key` header absent |
| `401` | `{ error: "Invalid API key" }` | Key not found, revoked, or expired |
| `403` | `{ error: "Insufficient API key scope", required: "leads:write" }` | Key exists but lacks `leads:write` scope |

### Duplicate email handling

`contacts` enforces a unique index on `(email, organization_id)`. If the same email is submitted twice for the same org, the row is upserted (`updated_at` refreshed) and `201` is returned with the existing row — no error, no duplicate row.

---

## 🗄️ What gets written

The endpoint inserts (or upserts) a row in the `contacts` table with `type = 'lead'`, scoped to the organization that owns the API key. There is no separate `leads` table.

---

## 🎟️ Lead-capture tokens (`lct_`)

Lead-capture tokens are a **separate** admin-managed credential with prefix `lct_`. They are stored as SHA-256 hashes in the `lead_capture_tokens` table and are distinct from `api_keys`.

These tokens power the **web-to-lead form**: the public endpoints `GET /api/public/forms/:token` (form config) and `POST /api/public/forms/:token` (submission — honeypot + 10/min rate limit) authenticate by the `lct_` token in the path (no JWT/API-key) and create a lead (`source: web_form`) in the token's org. A hosted form is served at the SPA route `{origin}/forms/<token>`. The token's form definition (title, fields, success message) lives in `lead_capture_tokens.config` (migration 023). The separate `/api/public/v1/leads` endpoint remains the `x-api-key` path for server-side integrations.

### Admin routes (require session + `apikeys:manage`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/lead-capture-tokens` | List tokens for the org (prefix, label, enabled, created_at) |
| `POST` | `/lead-capture-tokens` | Create token; body `{ label?: string }`. Returns plaintext `lct_…` once |
| `DELETE` | `/lead-capture-tokens/:id` | Delete a token (hard delete) |

Tokens have an `enabled` boolean and an optional `label` for identification. The plaintext token is returned only at creation time (same pattern as API keys).

---

## 🔧 Embedding example

```js
// Minimal fetch from a public landing page
await fetch('https://crm.example.com/api/public/v1/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'n0crm_<your-key>',
  },
  body: JSON.stringify({
    email: formData.get('email'),
    firstName: formData.get('first_name'),
    lastName: formData.get('last_name'),
  }),
})
```

For forms hosted on a different origin, configure CORS on your reverse proxy (nginx) or rely on same-origin embedding.

---

## Cross-links

- Lead scoring and lifecycle: [`master-lead-management.md`](./master-lead-management.md)
- API key management: **Settings > Integrations** (scope selector UI shows `leads:write`, `scim`)

---

*Last updated: 2026-06-11*
