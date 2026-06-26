# Enterprise Identity — SSO (OIDC) & SCIM 2.0

Propel supports IdP-driven authentication and lifecycle management:

- **SSO** — OpenID Connect / OAuth2 with PKCE and just-in-time (JIT) user provisioning.
- **SCIM 2.0** — automated user provisioning and **deprovisioning** from your IdP
  (Microsoft Entra ID, Okta, OneLogin, …).

Both are **org-scoped** and require no code changes to enable.

---

## 1. Single Sign-On (OIDC)

### Configure the API

Set these in the API environment (see [`api/.env.example`](../api/.env.example)):

| Variable | Description |
|----------|-------------|
| `OIDC_ISSUER` | Base URL whose `/.well-known/openid-configuration` is fetched (e.g. `https://login.microsoftonline.com/<tenant>/v2.0`). |
| `OIDC_CLIENT_ID` | Application (client) ID registered at the IdP. |
| `OIDC_CLIENT_SECRET` | Client secret. |
| `OIDC_REDIRECT_URI` | Must exactly match the redirect registered at the IdP, e.g. `https://crm.example.com/auth/sso/callback`. |
| `OIDC_DEFAULT_ROLE` | Role assigned to JIT-provisioned users (`admin` \| `manager` \| `sales_rep` \| `viewer`, default `sales_rep`). |
| `APP_URL` | Frontend origin the callback redirects back to after login. |

### Register the app at your IdP

1. Create an OAuth2 / OIDC application.
2. Set the redirect URI to your `OIDC_REDIRECT_URI`.
3. Grant the `openid email profile` scopes.
4. Copy the client ID/secret into the API env and restart.

### Flow

| Endpoint | Purpose |
|----------|---------|
| `GET /api/auth/sso/status` | Returns `{ enabled }` — the frontend shows the SSO button only when `true`. |
| `GET /api/auth/sso/start` | Builds an `authorize` URL (state + nonce + PKCE `S256`, stored in Redis) and 302-redirects to the IdP. |
| `GET /api/auth/sso/callback` | Consumes state, exchanges the code, verifies the ID token (JWKS RS256, `iss`/`aud`/`exp`/`nonce`/`email`), JIT-provisions the user, sets the auth cookie, and redirects to `APP_URL`. |

A failed round-trip redirects to `/login?sso_error=…`, which the login page surfaces inline.

---

## 2. SCIM 2.0 provisioning

SCIM lets your IdP create, update, and **deactivate** users automatically — base path `/api/scim/v2`.

### Authentication

SCIM reuses the API-key infrastructure — **no separate token store**.

1. In **Settings → API keys** (or `POST /api/integrations/api-keys`), create a key with the scope `scim`:
   ```json
   { "name": "Okta SCIM", "scopes": ["scim"] }
   ```
2. The key maps to the org that created it. Give it to your IdP as the **Bearer token**.
3. Requests authenticate via `Authorization: Bearer <key>`; the key is SHA-256-hashed and
   matched against `api_keys` (not revoked, not expired, scope includes `scim`).

> A legacy full-access key (empty `scopes`) or a wildcard (`*`/`all`) key also satisfies SCIM,
> consistent with the rest of the scoped API. Prefer a dedicated `["scim"]` key for least privilege.

### Supported resources

| Method & path | Behavior |
|---------------|----------|
| `GET /scim/v2/ServiceProviderConfig` | Capability discovery (patch ✓, filter ✓, bulk ✗, sort ✗). |
| `GET /scim/v2/Users` | List (max 200) or filter `userName eq "user@example.com"`. |
| `GET /scim/v2/Users/:id` | Fetch one user (org-scoped). |
| `POST /scim/v2/Users` | Provision a user. `409` if the email already exists. JIT users get a random placeholder password + `OIDC_DEFAULT_ROLE`. |
| `PATCH /scim/v2/Users/:id` | `replace` the `active` attribute → toggles `is_active`. |
| `PUT /scim/v2/Users/:id` | Replace `active` and/or `name`. |
| `DELETE /scim/v2/Users/:id` | **Soft** deprovision — deactivate (never hard-delete). |

All responses use `Content-Type: application/scim+json`; the service also accepts that content
type on request bodies.

### Safety rules

- The **last active owner** can never be deactivated or deleted (`409 Cannot deactivate the last owner`).
- Deactivation (PATCH/PUT/DELETE) **revokes the user's sessions** immediately
  (`setUserTokensValidAfter`), so deprovisioning takes effect at once.
- Provision and deprovision are written to the **audit log**
  (`scim_user_provisioned` / `scim_user_deprovisioned`).

### Example — provision a user (Okta-style)

```http
POST /api/scim/v2/Users HTTP/1.1
Authorization: Bearer <scim-scoped-api-key>
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "jane@acme.com",
  "name": { "formatted": "Jane Doe" },
  "active": true
}
```

### Example — deprovision (deactivate)

```http
PATCH /api/scim/v2/Users/<id> HTTP/1.1
Authorization: Bearer <scim-scoped-api-key>
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [{ "op": "replace", "path": "active", "value": false }]
}
```

---

## Notes & limits

- SCIM **Groups** are not implemented; role assignment uses `OIDC_DEFAULT_ROLE`. Adjust roles in
  **Settings → Team** or via the member-lifecycle API after provisioning.
- Email is globally unique — a `POST` for an email that exists in *any* org returns `409`.
- SAML federation is not yet supported (OIDC only). See the [roadmap](../README.md#-roadmap).
