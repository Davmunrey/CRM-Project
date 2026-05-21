# Google Gmail & Calendar: OAuth operator setup and restricted-scope verification

> **Implementation note (2026-05-18):** Gmail and Calendar OAuth are fully self-hosted via **api/** routes (`/gmail/*`, `/calendar/*`). The routes are in `api/src/routes/gmail.ts` and `api/src/routes/calendar.ts`. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in `api/.env`.

This document is the **single repo source** for: (1) **how to obtain Google OAuth credentials** (Client ID + Client Secret — not a simple “API key”) and configure the Cloud project; (2) **redirect URI** requirements for this SPA; (3) **Google’s restricted-scope verification** for production. End users connect from **Settings → Integrations** (`/settings/integrations`) after **email/password** sign-in.

**Code references:** OAuth scope bundles and token management are handled by the self-hosted routes: `api/src/routes/gmail.ts` handles OAuth start, token exchange, and refresh; `api/src/routes/calendar.ts` manages Calendar-specific OAuth. Long-lived refresh tokens stay **server-side** (encrypted with `TOKEN_ENCRYPTION_KEY`).

**Incremental UX:** Users connect **Gmail** first (primary bundle). **Calendar** is a second OAuth step that requests only Calendar scopes with `include_granted_scopes=true` so Google can show the shorter “n0CRM already has some access” style screen. **Branding** (logo, privacy policy, terms) is configured only in **Google Cloud Console** on the OAuth consent screen, not in application code.

---

<a id="operator-setup-google-oauth"></a>

## Operator setup: Google Cloud + Supabase

### What you need from Google (OAuth 2.0 “Web client”, not a generic API key)

n0CRM does **not** use a Google “API key” for this flow. You create an **OAuth 2.0 Client ID** of type **Web application** in [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**. You will get:

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

### 4. Backend environment variables

Set these variables in `api/.env` for the self-hosted Gmail and Calendar OAuth routes:

| Variable | Description |
|----------|--------------|
| `GOOGLE_CLIENT_ID` | Web client ID from Google |
| `GOOGLE_CLIENT_SECRET` | Web client secret |
| `TOKEN_ENCRYPTION_KEY` | **64 hex characters** (32 bytes). Generate: `openssl rand -hex 32` |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI: `{api_origin}/auth/gmail/callback` (e.g. `http://localhost:3000/auth/gmail/callback` for local dev, `https://api.yourdomain.com/auth/gmail/callback` for production) |

### 5. Database

Apply migrations in `api/migrations/` that include tables for Gmail token storage and related data. Run database migrations via your deployment process.

### 6. API server startup

The backend (Fastify 5) runs at `http://localhost:3000` (or your configured port) and serves the Gmail and Calendar OAuth routes at:
- `/auth/gmail/callback` — OAuth callback handler
- `/auth/gmail/refresh` — Token refresh endpoint
- `/integrations/gmail/*` — Gmail integration endpoints
- `/integrations/calendar/*` — Calendar integration endpoints

Ensure `api/.env` is configured and the server is running before testing OAuth from the frontend.

### 7. Smoke test (operator)

1. Start the backend: `cd api && npm run dev` (or your configured startup).
2. Start the frontend: `cd frontend && npm run dev`.
3. Sign in with email + password; open `/settings/integrations`.
4. **Connect Google** (Gmail) → OAuth popup opens and redirects to Google → approved → returns to callback → **Connected** with the same email as the CRM user.
5. **Enable Calendar** → second popup requests Calendar scopes (incremental); approve → Calendar card shows **Active**.
6. Disconnect Google → both Gmail and Calendar access are cleared in n0CRM until the user connects again.

### Troubleshooting (operator)

- **OAuth flow fails or callback does not execute:** Check that `api/.env` has valid `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`. The backend routes log detailed errors to `stdout`.
- **Redirect URI mismatch:** the value in `api/.env` `GOOGLE_REDIRECT_URI` must match exactly the **Authorized redirect URIs** in Google Cloud Console.
- **`TOKEN_ENCRYPTION_KEY` errors:** must be exactly 64 hex chars; rotating it invalidates existing encrypted refresh tokens (users must reconnect).
- **No `refresh_token`:** the **first** Gmail connection must use `access_type=offline` and `prompt=consent`. Reconnects use `prompt=select_account`. Calendar incremental grants often omit a new refresh token; the backend keeps the existing encrypted refresh when that happens.
- **Popup blocked:** the UI falls back to full-page navigation to the same Google URL.

### Verification status (product / ops track)

| Field | Value |
|-------|--------|
| **Console submission** | Owned on the Google Cloud + legal side — not automatable from this repo. |
| **Backend readiness** | Redirect URI in `api/.env` must match Google Cloud Console exactly; keep **Authorized redirect URIs** in sync with every deployed origin. |
| **Last doc review** | 2026-05-18 — Monorepo structure finalized with self-hosted API routes. Backend environment variables configured. Cross-check [`project-state.md`](./project-state.md) (Gaps) when Google submission state changes. |

### Checklist (Google Cloud Console — verification)

1. **Project** — Same Google Cloud project as the **Web** OAuth client used for `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in Supabase Edge (not a `VITE_` client secret in the SPA).
2. **OAuth consent screen** — User type (Internal vs External). External apps need the full verification path for broad release.
3. **Scopes** — Declare only what the product uses. Remove unused scopes before submission.
4. **App domain & branding** — Homepage, privacy policy URL, terms (if applicable). Production URLs should be **HTTPS**.
5. **Demo video / justification** — Google often requires a short screen recording showing scope usage and data handling; show opt-in, disconnect, and server-only token storage.
6. **Supabase Auth redirect URIs** — Add production and staging callback URLs exactly as Supabase Auth requires (separate from Gmail’s `/auth/gmail/callback` — that is for Google’s OAuth client, not Supabase Auth’s).
7. **Submit for verification** — After deploy, use the production URL in the submission where possible.

## Gmail OAuth redirect URIs (backend callback)

The OAuth callback is handled by the backend at `{api_origin}/auth/gmail/callback`. **Google Cloud Console → your OAuth Web client → Authorized redirect URIs** must list every origin you use.

| Surface | Typical API origin | Example redirect URI to register |
|--------|-------------------|-----------------------------------|
| Local dev | `http://localhost:3000` (or your configured port) | `http://localhost:3000/auth/gmail/callback` — add each port you use |
| Staging | Your staging API domain | `https://<api-staging>.yourdomain.com/auth/gmail/callback` |
| Production | Your HTTPS API domain | `https://<api.yourdomain.com>/auth/gmail/callback` |

**Frontend origins:** Set the frontend’s API base URL in its environment (e.g. `VITE_API_URL`). The frontend redirects the user to Google’s OAuth consent, which then redirects to the backend callback.

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
| A1 | **OAuth consent screen → Scopes:** add the **full union** of scopes the app may request over time (Gmail + Calendar). | Google requires every possible scope to be **declared** on the consent screen even if requested incrementally. Check `api/src/routes/gmail.ts` for the exact scopes used. |
| A2 | **Branding:** app name, logo, support email, **privacy policy URL**, **terms** (if you show them), authorized domains. | Required for verification and user trust; not implemented in application code. |
| A3 | **Test users** (while app is in *Testing*). | Only listed users can complete OAuth until the app is published / verified. |
| A4 | **Submit for restricted-scope verification** (Gmail + Calendar sensitive scopes) when you need **non–test-user** access at scale. | Often multi-week; track status in [`.planning/STATE.md`](../.planning/STATE.md) Notes and the [Gaps table](./project-state.md#gaps-not-fully-owned-by-a-single-master-today) in `project-state.md`. |
| A5 | **Authorized redirect URIs:** `{api_origin}/auth/gmail/callback` for backend (e.g. `http://localhost:3000/auth/gmail/callback` for local dev). | Must match `GOOGLE_REDIRECT_URI` in `api/.env`. Register every environment (local, staging, production). |
| A6 | **Authorized JavaScript origins:** the **origin** of the **frontend** (e.g. `http://localhost:5173`, `https://app.yourdomain.com`). | Web client OAuth requirement for the browser to call Google's authorization endpoint. |

### B. Backend (api/) — per environment

| # | Task | Why |
|---|------|-----|
| B1 | **Environment variables:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY` (64 hex), `GOOGLE_REDIRECT_URI`. | Without these, OAuth routes fail at runtime. Set in `api/.env` and ensure they match Google Cloud Console values. |
| B2 | After **schema** changes: Apply migrations in `api/migrations/`. | Example: changes to token storage tables must be applied before the backend processes OAuth tokens. |
| B3 | **API server deployment:** Ensure `api/` is running and routes are accessible at the configured `GOOGLE_REDIRECT_URI` origin. | Frontend OAuth callback needs a reachable backend endpoint. Local dev: `http://localhost:3000`; production: your API domain. |

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
| D2 | Update **”Last doc review”** in the [Verification status](#verification-status-product--ops-track) table when Google submission state changes. | Keeps `project-state.md` and this file aligned. |

---

*Operational detail only; not legal advice. Keep privacy policy and in-product disclosures aligned with actual data processing.*

*Last updated (git): **2026-05-18***

## TOKEN_ENCRYPTION_KEY rotation

⚠️ Rotating this key invalidates all AES-256-GCM encrypted refresh tokens. All users must reconnect their Google account. Plan a maintenance window and notify users before rotating. Update `api/.env` and restart the backend.
