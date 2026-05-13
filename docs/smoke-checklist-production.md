# Smoke checklist — production

Use after a production deploy. Record pass/fail and who ran it.

## Preconditions

- [ ] `VITE_API_URL` points to the production `velo-api` instance
- [ ] SPA deep links work (nginx `try_files` or equivalent — see [`deployment-spa-and-env.md`](./deployment-spa-and-env.md))
- [ ] `velo-api` running, DB migrated (`npm run db:migrate`), seed applied (`npm run db:seed`)
- [ ] JWT_SECRET set (min 32 chars), CORS_ORIGIN matches frontend origin

## Auth flows

1. **Register** — Create new account → redirected to `/org-setup` → create org → land on dashboard
2. **Login** — Sign in with existing account → no flash redirect loop on hard refresh of `/`
3. **Cold load** — Hard refresh `/contacts`; app loads (no /login flash for authenticated user)
4. **Logout** — Click logout → redirected to `/login`; back button doesn't go into app
5. **401 recovery** — Clear localStorage, visit `/` → redirected to `/login`; no reload loop
6. **Forgot password** — Submit email → success screen (token saved in DB; email delivery requires SMTP config)
7. **Invitation** — Admin sends invite via Team Management → user visits `/accept-invite?token=...` → accepts → org assigned → new JWT issued

## Core CRM flows

8. **Create contact** — Create contact; reload; record visible
9. **Log activity** — Attach activity to contact; navigate away and back; still visible
10. **Team directory** — Open Settings → Team; member list loads (fetched from `GET /orgs/me/members`)
11. **Kanban** — Move deal across stages; refresh; stage preserved
12. **Notifications** — Mark-all-read; badge clears

## Optional (if configured)

- **Gmail** — Connect Gmail; threads load in Inbox; disconnect clears token
- **AI features** — Chat widget responds if `ANTHROPIC_API_KEY` set in velo-api

## Automated smoke

```bash
npm run test:e2e
```

*Last updated: 2026-05-13*
