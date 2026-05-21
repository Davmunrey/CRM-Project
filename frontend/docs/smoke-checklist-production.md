# Smoke checklist — production

Use after a production deploy. Record pass/fail and who ran it.

## Preconditions

- [ ] Both frontend and api running (via `docker compose up -d` from repo root, or equivalent deployment)
- [ ] `VITE_API_URL` points to the production `n0crm-api` instance (or `/api` for Docker nginx proxy)
- [ ] SPA deep links work (nginx `try_files` or equivalent — see [`deployment-spa-and-env.md`](./deployment-spa-and-env.md))
- [ ] `n0crm-api` running and healthy; api/docker-entrypoint.sh auto-ran migrations on container start
- [ ] Database seeded (if needed; migrations idempotent)
- [ ] JWT_SECRET set (min 32 chars), CORS_ORIGIN parsed and validated, Redis available for JWT denylist
- [ ] E2E test environment variables configured: `E2E_API_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` (n0crm-api endpoints, not Supabase)

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
10. **Team directory** — Open Settings → Team; member list loads (fetched from n0crm-api `/orgs/me/members`)
11. **Kanban** — Move deal across stages; refresh; stage preserved
12. **Notifications** — Mark-all-read; badge clears

## Auth and security flows

13. **Password reset** — Use forgot-password flow; verify token is single-use; verify email not enumerated (always 200 response)
14. **Logout revocation** — Logout; verify old JWT token cannot re-access protected routes (Redis denylist active)
15. **Rate limiting** — Attempt `/auth/reset-password` 11+ times in 15 minutes; verify rate limit response (429) after 10 requests

## Optional (if configured)

- **Gmail** — Connect Gmail; threads load in Inbox; disconnect clears token
- **AI features** — Chat widget responds if `ANTHROPIC_API_KEY` set in n0crm-api

## Automated smoke

From repo root:
```bash
# Run E2E tests against production (uses E2E_API_URL, E2E_USER_EMAIL, E2E_USER_PASSWORD)
npm run test:e2e
```

From frontend/ directory:
```bash
# Frontend unit tests and integration tests
npm run test:run
```

From api/ directory:
```bash
# Backend tests (if applicable)
npm test
```

*Last updated: 2026-05-18*

## Deployment checklist

- [ ] Root `docker-compose.yml` configured and tested
- [ ] api/docker-entrypoint.sh auto-runs migrations (verified in container logs)
- [ ] api/.dockerignore excludes `.env` (verified Docker layer inspection)
- [ ] Non-root `USER node` in api/Dockerfile (verified `docker compose exec api id`)
- [ ] JWT algorithm pinned to HS256 in api/config/env.ts (verified source code)
- [ ] Password reset tokens stored as SHA-256 hashes (verified DB schema and login code)
- [ ] Rate limiting active on `/auth/reset-password` (verified config in api/src/routes)
- [ ] Redis denylist for JWT revocation operational (verified with logout test flow)
