# Google Gmail & Calendar: OAuth operator setup and restricted-scope verification

This document is the **single repo source** for: (1) **how to obtain Google OAuth credentials** (Client ID + Client Secret — not a simple “API key”), configure the Cloud project, and wire **Supabase Edge Functions**; (2) **redirect URI** requirements for this SPA; (3) **Google’s restricted-scope verification** for production. End users connect from **Settings → Integrations** (`/settings/integrations`) after **email/password** sign-in; the Google account email must **match** the Velo (Supabase) user email.

**Code references:** OAuth scope **bundles** (Gmail first, Calendar incremental) in [`supabase/functions/_shared/google-scopes.ts`](../supabase/functions/_shared/google-scopes.ts); start URL from [`supabase/functions/google-oauth-start`](../supabase/functions/google-oauth-start) (body `bundle`: `primary` \| `calendar`); token exchange [`gmail-oauth-exchange`](../supabase/functions/gmail-oauth-exchange) merges scopes and keeps an existing refresh token when Google does not return a new one; refresh [`gmail-refresh-token`](../supabase/functions/gmail-refresh-token). Long-lived refresh tokens stay **server-side** (encrypted with `TOKEN_ENCRYPTION_KEY`).

**Incremental UX:** Users connect **Gmail** first (primary bundle). **Calendar** is a second OAuth step that requests only Calendar scopes with `include_granted_scopes=true` so Google can show the shorter “Velo already has some access” style screen. **Branding** (logo, privacy policy, terms) is configured only in **Google Cloud Console** on the OAuth consent screen, not in application code.

---

<a id="operator-setup-google-oauth"></a>

## Operator setup: Google Cloud + Supabase

### What you need from Google (OAuth 2.0 “Web client”, not a generic API key)

Velo does **not** use a Google “API key” for this flow. You create an **OAuth 2.0 Client ID** of type **Web application** in [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**. You will get:

| Field | Where it goes |
|--------|----------------|
| **Client ID** (ends with `.apps.googleusercontent.com`) | Supabase Edge secret `GOOGLE_CLIENT_ID` |
| **Client secret** | Supabase Edge secret `GOOGLE_CLIENT_SECRET` — **never** in the browser or `VITE_*` |

### 1. Google Cloud project and APIs

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable:
   - [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
   - [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)

### 2. OAuth consent screen

Open [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent). For most products use **External** (unless you use a Google Workspace org-only internal app). Add **test users** while the app is in *Testing*; add **privacy policy** and app domain fields before production verification. Declare **all** scopes the product may ever request (union of **primary** + **calendar** bundles in `_shared/google-scopes.ts` — helper `allProductScopesJoined()` documents the full set for the Console).

### 3. OAuth client (Web) — origins and redirect URIs

[Create an OAuth 2.0 Client ID](https://console.cloud.google.com/apis/credentials) → application type **Web application**.

- **Authorized JavaScript origins:** the **origin** only (no path), e.g. `http://localhost:5173`, `https://app.yourdomain.com`. Match the port your Vite dev server uses (see root [`README.md`](../README.md) / `vite.config.ts`).
- **Authorized redirect URIs:** must match **exactly** the callback this app uses: `{origin}/auth/gmail/callback` (see [`getGmailRedirectUri()`](../src/services/gmailService.ts)). Register **every** environment (local, preview, production).

### 4. Supabase Edge Function secrets

In the **same** Supabase project as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (Dashboard → **Edge Functions** → **Secrets**, or `supabase secrets set`):

| Secret | Description |
|--------|--------------|
| `GOOGLE_CLIENT_ID` | Web client ID from Google |
| `GOOGLE_CLIENT_SECRET` | Web client secret |
| `TOKEN_ENCRYPTION_KEY` | **64 hex characters** (32 bytes). Generate: `openssl rand -hex 32` |
| `GOOGLE_OAUTH_REDIRECT_URIS` | Comma-separated list of **every** allowed redirect URL (each full `https://…/auth/gmail/callback`), **or** a single `GOOGLE_OAUTH_REDIRECT_URI` if only one origin exists |
| `EDGE_CORS_ORIGINS` | *(Recommended in production)* Comma-separated **exact** browser origins (`scheme://host:port`) allowed to call Google/Gmail Edge functions and other CORS-aware surfaces. When set, a disallowed `Origin` receives **403** `cors_origin_not_allowed`. When unset, `Access-Control-Allow-Origin: *`. Align with every origin where users open Settings → Integrations. Documented in [`.env.example`](../.env.example) and [`master-security-compliance.md`](./master-security-compliance.md#supabase-external-hardening-checklist). |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided to Edge at runtime.

### 5. Database

Apply migrations (includes `gmail_tokens`, `google_oauth_states`, and `google_oauth_states.bundle` for which OAuth step started):

```bash
supabase db push
# or: supabase migration up
```

### 6. Deploy Edge Functions (Google + Gmail)

From the linked project:

```bash
npm run supabase:deploy:google
```

This deploys `google-oauth-start`, `google-integration-status`, `gmail-oauth-exchange`, `gmail-refresh-token`, and `gmail-disconnect`. The GitHub workflow [`.github/workflows/supabase-remote-deploy.yml`](../.github/workflows/supabase-remote-deploy.yml) includes these and now runs automatically on `master` pushes (plus manual trigger), with a preflight secret gate and post-deploy smoke check (`npm run supabase:smoke:google-edge`). See also [`supabase/README.md`](../supabase/README.md).

### 7. Smoke test (operator)

1. `npm run dev` with valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Sign in with email + password; open `/settings/integrations`.
3. **Connect Google** (Gmail / primary bundle) → first-time flow uses `prompt=consent` and `access_type=offline` → **Connected** with the same email as the CRM user (enforced in `gmail-oauth-exchange`).
4. **Enable Calendar** → second popup requests only Calendar scopes (incremental); approve → Calendar card shows **Active**.
5. Disconnect Google → both Gmail and Calendar access are cleared in Velo until the user connects again.

### Troubleshooting (operator)

- **“Failed to send a request to the Edge Function”** (in-app): the browser could not call `…/functions/v1/google-oauth-start`. Usually the function is **not deployed** to this project — run `npm run supabase:deploy:google` and confirm Edge **secrets** above. Check function logs in the Supabase dashboard.
- **Redirect URI mismatch:** the value sent in the OAuth request must appear both in **Google Cloud** redirect URIs and in `GOOGLE_OAUTH_REDIRECT_URIS` (or `GOOGLE_OAUTH_REDIRECT_URI`).
- **`TOKEN_ENCRYPTION_KEY` errors:** must be exactly 64 hex chars; rotating it invalidates existing encrypted refresh tokens (users reconnect).
- **No `refresh_token`:** the **first** Gmail connection must use `access_type=offline` and `prompt=consent` (handled for the `primary` bundle when there is no stored refresh token). Reconnects use `prompt=select_account`. Calendar incremental grants often omit a new refresh token — `gmail-oauth-exchange` keeps the existing encrypted refresh when that happens.
- **Popup blocked:** the UI falls back to full-page navigation to the same Google URL.

### Verification status (product / ops track)

| Field | Value |
|-------|--------|
| **Console submission** | Owned on the Google Cloud + legal side — not automatable from this repo. |
| **Repo readiness** | Redirect URI matrix + channel alignment below; keep **Authorized redirect URIs** in sync with every deployed origin. |
| **Last doc review** | 2026-04-22 — cross-check [`project-state.md`](./project-state.md) (Gaps) when submission state changes. |

### Checklist (Google Cloud Console — verification)

1. **Project** — Same Google Cloud project as the **Web** OAuth client used for `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in Supabase Edge (not a `VITE_` client secret in the SPA).
2. **OAuth consent screen** — User type (Internal vs External). External apps need the full verification path for broad release.
3. **Scopes** — Declare only what the product uses. Remove unused scopes before submission.
4. **App domain & branding** — Homepage, privacy policy URL, terms (if applicable). Production URLs should be **HTTPS**.
5. **Demo video / justification** — Google often requires a short screen recording showing scope usage and data handling; show opt-in, disconnect, and server-only token storage.
6. **Supabase Auth redirect URIs** — Add production and staging callback URLs exactly as Supabase Auth requires (separate from Gmail’s `/auth/gmail/callback` — that is for Google’s OAuth client, not Supabase Auth’s).
7. **Submit for verification** — After deploy, use the production URL in the submission where possible.

## Gmail OAuth redirect URIs (this app’s **Google** OAuth client, not Supabase Auth)

The CRM uses redirect URI `${window.location.origin}/auth/gmail/callback` ([`getGmailRedirectUri()`](../src/services/gmailService.ts)). **Google Cloud Console → your OAuth Web client → Authorized redirect URIs** must list every origin you use.

| Surface | Typical origin | Example redirect URI to register |
|--------|----------------|-----------------------------------|
| Local dev | `http://localhost:5173` (or Vite’s port) | `http://localhost:5173/auth/gmail/callback` — add each port you use |
| Preview / staging | Static host preview URL | `https://<your-preview-host>/auth/gmail/callback` |
| Production | Your HTTPS domain | `https://<your-domain>/auth/gmail/callback` |

**Channel alignment:** set `VITE_APP_CHANNEL` per environment as in [`deployment-spa-and-env.md`](./deployment-spa-and-env.md) so staging previews do not point at production Supabase or production-only Google settings by mistake.

**Track:** keep verification status and dates in [`project-state.md`](./project-state.md) (Gaps table) while Google processes the application.

## Production / Google review

Sensitive Gmail/Calendar scopes typically require [Google verification](https://support.google.com/cloud/answer/10311615) before broad production use; plan for a public privacy policy and a multi-week timeline.

## Repo alignment

- **Security narrative:** [`master-security-compliance.md`](./master-security-compliance.md) (OAuth redirects, external checklist).
- **Email / outbound / inbox product behavior:** [`master-email-operations.md`](./master-email-operations.md#in-app-outbound-and-gmail).

---

<a id="outstanding-google-integration"></a>

## Outstanding work (checklist)

Use this section as the **single “what is still to do”** list for Google integration: operator tasks in Cloud Console, environment hygiene, and **product/engineering** items beyond OAuth wiring.

### A. Google Cloud Console (operator — not in repo)

| # | Task | Why |
|---|------|-----|
| A1 | **OAuth consent screen → Scopes:** add the **full union** of scopes the app may request over time (primary Gmail bundle **and** Calendar bundle). | Incremental OAuth requests a subset per step, but Google still requires every possible scope to be **declared** on the consent screen. Code reference for the union: `allProductScopesJoined()` in [`supabase/functions/_shared/google-scopes.ts`](../supabase/functions/_shared/google-scopes.ts). |
| A2 | **Branding:** app name, logo, support email, **privacy policy URL**, **terms** (if you show them), authorized domains. | Required for verification and user trust; not implemented in application code. |
| A3 | **Test users** (while app is in *Testing*). | Only listed users can complete OAuth until the app is published / verified. |
| A4 | **Submit for restricted-scope verification** (Gmail + Calendar sensitive scopes) when you need **non–test-user** access at scale. | Often multi-week; track status in [`.planning/STATE.md`](../.planning/STATE.md) Notes and the [Gaps table](./project-state.md#gaps-not-fully-owned-by-a-single-master-today) in `project-state.md`. |
| A5 | **Authorized redirect URIs** for **every** SPA origin (local ports, preview, production): `{origin}/auth/gmail/callback`. | Must match `getGmailRedirectUri()` and Edge secret `GOOGLE_OAUTH_REDIRECT_URIS` / `GOOGLE_OAUTH_REDIRECT_URI`. |
| A6 | **Authorized JavaScript origins** for the same origins (scheme + host + port only). | Web client OAuth requirement for browser-based flows. |

### B. Supabase (operator — per environment)

| # | Task | Why |
|---|------|-----|
| B1 | Edge secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY` (64 hex), redirect URI list. | Without these, `google-oauth-start` / `gmail-oauth-exchange` fail at runtime. |
| B2 | After **schema** changes: `supabase db push` (or CI migration) on **each** linked project (staging vs production). | Example: `google_oauth_states.bundle` must exist before new OAuth starts. |
| B3 | After **function** changes: `npm run supabase:deploy:google` (or your deploy workflow). | Browser calls `…/functions/v1/google-oauth-start`; stale deploys cause “Failed to send a request to the Edge Function”. |

### C. Product / engineering (repo — beyond “connect” UI)

These are **not** finished just because Settings → Integrations shows “Connected”:

| # | Task | Notes |
|---|------|--------|
| C1 | **Calendar features using granted scopes** | The second OAuth step stores Calendar scopes on `gmail_tokens` and surfaces status in the UI. **End-to-end Calendar sync** (read/write events, webhooks, conflict handling) is separate work unless already implemented elsewhere in the app. Columns such as `calendar_sync_token` on `gmail_tokens` are placeholders for future sync — confirm design in roadmap / email master before building. |
| C2 | **Gmail sync depth** | Policy remains: **metadata-first** where applicable; any bulk body ingestion needs explicit product sign-off and retention alignment ([`master-email-operations.md`](./master-email-operations.md)). |
| C3 | **Optional hardening** | Rate limits, backoff, and observability for Edge Gmail/Calendar callers; Sentry or structured logs if not already wired for these functions. |

### D. Evidence / release (when closing verification or a major release)

| # | Task | Notes |
|---|------|--------|
| D1 | Record **smoke** outcome: primary connect → Enable Calendar → disconnect, per [§7 smoke test](#operator-setup-google-oauth) above. | Paste or link evidence in release ticket or [`.planning/STATE.md`](../.planning/STATE.md). |
| D2 | Update **“Last doc review”** in the [Verification status](#verification-status-product--ops-track) table when Google submission state changes. | Keeps `project-state.md` and this file aligned. |

---

*Operational detail only; not legal advice. Keep privacy policy and in-product disclosures aligned with actual data processing.*

*Last updated (git): **2026-04-22***
