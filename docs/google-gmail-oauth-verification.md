# Google Gmail OAuth: restricted-scope verification (kickoff)

Google treats Gmail-related scopes as **restricted** or **sensitive**. For production users outside your test allowlist, you must complete **OAuth consent screen verification** and, where required, **restricted scope verification**. Lead time is often **several weeks** — start early ([`.planning/STATE.md`](../.planning/STATE.md) Notes).

This repo’s Gmail flow uses **Auth Code + PKCE** and Edge Functions (e.g. [`supabase/functions/gmail-oauth-exchange`](../supabase/functions/gmail-oauth-exchange), refresh token storage in `gmail_tokens`). Browser code must never hold long-lived refresh tokens.

## Verification status (product / ops track)

| Field | Value |
|-------|--------|
| **Console submission** | Owned by humans on the Google Cloud + legal side — not automatable from this repo. |
| **Repo readiness** | Redirect URI matrix + channel alignment documented below (B1); keep **Authorized redirect URIs** in sync with every deployed origin. |
| **Last doc review** | 2026-04-21 — cross-check [`project-state.md`](./project-state.md) (Gaps) when submission state changes. |

## Checklist (Google Cloud Console)

1. **Project** — Same Google Cloud project as the OAuth client ID configured for Supabase / your app (`VITE_GOOGLE_CLIENT_ID` if used from the client).
2. **OAuth consent screen** — User type (Internal vs External). External apps need the full verification path for broad release.
3. **Scopes** — Declare only what the product uses (read/send mail, modify labels, etc.). Remove unused scopes before submission.
4. **App domain & branding** — Homepage, privacy policy URL, terms (if applicable). URLs must be **HTTPS** on the production domain you will ship.
5. **Demo video / justification** — Google often requires a short screen recording showing scope usage and data handling; prepare a script that shows opt-in, disconnect, and token storage only on the server.
6. **Supabase Auth redirect URIs** — Add production and staging callback URLs exactly as Supabase issues them (and any static-host preview URLs you rely on for QA).
7. **Submit for verification** — After deploy (`DEPLOY-*`), use the production URL in the submission where possible.

## Gmail OAuth redirect URIs (this app, not Supabase Auth)

The CRM Gmail flow uses **Auth Code + PKCE** with redirect URI `${window.location.origin}/auth/gmail/callback` ([`getGmailRedirectUri()`](../src/services/gmailService.ts)). **Google Cloud Console → OAuth client → Authorized redirect URIs** must list **every origin** you will use, or the consent screen will fail after redirect.

| Surface | Typical origin | Example redirect URI to register |
|--------|----------------|-----------------------------------|
| Local dev | `http://localhost:5173` (or other port) | `http://localhost:5173/auth/gmail/callback` — add each port if you change it |
| Preview / staging | Static host preview URL | `https://<your-preview-host>/auth/gmail/callback` |
| Production | Your HTTPS domain | `https://<your-domain>/auth/gmail/callback` |

**Channel alignment:** set `VITE_APP_CHANNEL` per environment as in [`deployment-spa-and-env.md`](./deployment-spa-and-env.md) so staging previews never point at production Supabase or production-only Google settings by mistake.

**Track:** keep verification status and dates in [`project-state.md`](./project-state.md) (Gaps table) while Google processes the application.

## Repo alignment

- **Security narrative:** [`master-security-compliance.md`](./master-security-compliance.md) (OAuth redirects, external checklist).
- **Email operations:** [`master-email-operations.md`](./master-email-operations.md).

---

*Operational detail only; not legal advice. Keep privacy policy and in-product disclosures aligned with actual data processing.*
---

*Last updated (git): **2026-04-21***
