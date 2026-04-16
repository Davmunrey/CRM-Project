# Google Gmail OAuth: restricted-scope verification (kickoff)

Google treats Gmail-related scopes as **restricted** or **sensitive**. For production users outside your test allowlist, you must complete **OAuth consent screen verification** and, where required, **restricted scope verification**. Lead time is often **several weeks** — start early ([`.planning/STATE.md`](../.planning/STATE.md) Notes).

This repo’s Gmail flow uses **Auth Code + PKCE** and Edge Functions (e.g. [`supabase/functions/gmail-oauth-exchange`](../supabase/functions/gmail-oauth-exchange), refresh token storage in `gmail_tokens`). Browser code must never hold long-lived refresh tokens.

## Checklist (Google Cloud Console)

1. **Project** — Same Google Cloud project as the OAuth client ID configured for Supabase / your app (`VITE_GOOGLE_CLIENT_ID` if used from the client).
2. **OAuth consent screen** — User type (Internal vs External). External apps need the full verification path for broad release.
3. **Scopes** — Declare only what the product uses (read/send mail, modify labels, etc.). Remove unused scopes before submission.
4. **App domain & branding** — Homepage, privacy policy URL, terms (if applicable). URLs must be **HTTPS** on the production domain you will ship.
5. **Demo video / justification** — Google often requires a short screen recording showing scope usage and data handling; prepare a script that shows opt-in, disconnect, and token storage only on the server.
6. **Supabase Auth redirect URIs** — Add production and staging callback URLs exactly as Supabase issues them (and any static-host preview URLs you rely on for QA).
7. **Submit for verification** — After deploy (`DEPLOY-*`), use the production URL in the submission where possible.

## Repo alignment

- **Security narrative:** [`master-security-compliance.md`](./master-security-compliance.md) (OAuth redirects, external checklist).
- **Email operations:** [`master-email-operations.md`](./master-email-operations.md).

---

*Operational detail only; not legal advice. Keep privacy policy and in-product disclosures aligned with actual data processing.*
