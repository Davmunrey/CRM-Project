# Smoke checklist — production (Phase 10 gate)

Use this after a production deploy (or before marking **`DEPLOY-04`** done). Record pass/fail and who ran it.

## Preconditions

- [ ] `VITE_APP_CHANNEL` is **`production`** for this deploy (not `staging` or `demo`).
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` match the **production** Supabase project for this build.
- [ ] SPA deep links work ([`deployment-spa-and-env.md`](./deployment-spa-and-env.md)).
- [ ] Optional: Gmail restricted-scope verification status noted ([`google-gmail-oauth-verification.md`](./google-gmail-oauth-verification.md)).

## Core flows

1. **Signup (or invite)** — Create a user; confirm email if verification is enabled in Supabase.
2. **Login** — Sign in; no flash redirect loop on hard refresh of `/`.
3. **Organization** — User lands in org context (org setup or home); JWT carries `organization_id` where expected.
4. **Create contact** — Create a contact; reload page; record still visible.
5. **Log activity** — Attach activity to contact or deal; visible after navigation away and back.
6. **Team directory** — Open team / users UI; peer emails and names appear (backed by `list_organization_members_with_identity` RPC after migration `20260415120000_*`).
7. **Optional — Gmail** — Connect Gmail on production domain only if OAuth verification allows your test user.

## Automated smoke (local / CI)

```bash
npm run test:e2e
```

Uses Playwright against the dev server by default. For an optional **hosted** URL, set `E2E_STAGING_URL` (see [`e2e/smoke.spec.ts`](../e2e/smoke.spec.ts)).

---

*Aligns with Phase 10.4 narrative in [`.planning/ROADMAP.md`](../.planning/ROADMAP.md).*
