# Smoke checklist — production

Use after a production deploy. Record pass/fail and who ran it.

## Preconditions

- [ ] Both frontend and api running (via `docker compose up -d` from repo root, or equivalent deployment)
- [ ] `VITE_API_URL` points to the production `n0crm-api` instance (or `/api` for Docker nginx proxy)
- [ ] SPA deep links work (nginx `try_files` or equivalent — see [`deployment-spa-and-env.md`](./deployment-spa-and-env.md))
- [ ] `n0crm-api` running and healthy; api/docker-entrypoint.sh auto-ran migrations on container start
- [ ] Database seeded (if needed; migrations idempotent)
- [ ] JWT_SECRET set (min 32 chars), CORS_ORIGIN parsed and validated, Redis available for JWT denylist
- [ ] `INTERNAL_KEY` set (min 16 chars) for `/internal/*` routes
- [ ] **PgBouncer running** (`docker compose ps pgbouncer` shows healthy); `infra/pgbouncer/userlist.txt` has real MD5 password hash
- [ ] E2E test environment variables configured: `E2E_API_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` (n0crm-api endpoints)

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
15. **Rate limiting (auth)** — Attempt `/auth/login` 21+ times in 1 minute from the same IP; verify 429 after 20 requests (per-IP limit on auth routes)
16. **Rate limiting (global)** — Authenticated client sends 501+ requests in 1 minute; verify 429 after 500 req/min per org
17. **MFA login** — In Settings > Security, enroll TOTP (scan QR with authenticator app); log out; log back in → verify TOTP prompt appears; enter correct code → access granted; enter wrong code → rejected
18. **SSO round-trip** *(if `OIDC_ISSUER` configured)* — Visit `/login`; confirm SSO button visible (gated by `GET /auth/sso/status`); click → redirected to IdP → complete login → land on dashboard with JIT-provisioned account
19. **SCIM provisioning** *(if scim-scoped API key configured)* — `POST /scim/v2/Users` with Bearer scim key → 201 created; `GET /scim/v2/Users/:id` → user returned; `DELETE /scim/v2/Users/:id` → user soft-deprovisioned and sessions revoked; verify `GET /scim/v2/ServiceProviderConfig` returns 200
20. **GDPR export** — As owner/admin, call `GET /privacy/export` → 200 with org-level data export (Art. 20)
21. **GDPR subject erasure** — As owner/admin, call `POST /privacy/subject/:contactId/erase` → 200; verify contact data anonymized in database (Art. 17)

## Optional (if configured)

- **Gmail** — Connect Gmail; threads load in Inbox; disconnect clears token
- **AI features** — Chat widget responds if `ANTHROPIC_API_KEY` set in n0crm-api

## Infrastructure checks

- [ ] PgBouncer healthy: `docker compose ps pgbouncer` shows healthy status
- [ ] Prometheus up: `http://localhost:9090/targets` shows all targets (api, postgres-exporter, node-exporter) as UP
- [ ] Grafana up: `http://localhost:3002` loads; login with admin / `$GRAFANA_PASSWORD`; Prometheus datasource shows green checkmark
- [ ] Backup service running: `docker compose ps backup` shows healthy; verify `./backups/` contains gzipped dumps after 6+ hours
- [ ] `/health` endpoint returns healthy: `curl http://localhost:3001/health` returns `{"status":"ok","db":"ok","redis":"ok"}`
- [ ] `/metrics` accessible from localhost: `curl http://localhost:3001/metrics` returns 200 with Prometheus metrics
- [ ] `/metrics` restricted externally: `curl http://<external-ip>:3001/metrics` returns 403 Forbidden

## Sequence runner

- [ ] `POST /internal/sequences/run` with `x-internal-key` header returns 200 with `{ ok: true, message: "...", elapsedMs: number }`
- [ ] Sequence runner auto-starts on API boot (check logs for `[sequenceRunner] Starting (tick every 60s)`)
- [ ] Enroll a contact in an active sequence; wait for runner tick (60s); verify enrollment `current_step` advances in database

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

*Last updated: 2026-06-11*

## Deployment checklist

- [ ] Root `docker-compose.yml` configured and tested (includes pgbouncer, prometheus, grafana, backup services)
- [ ] api/docker-entrypoint.sh auto-runs migrations (verified in container logs)
- [ ] api/.dockerignore excludes `.env` (verified Docker layer inspection)
- [ ] Non-root `USER node` in api/Dockerfile (verified `docker compose exec api id`)
- [ ] JWT algorithm pinned to HS256 in api/config/env.ts (verified source code)
- [ ] Password reset tokens stored as SHA-256 hashes (verified DB schema and login code)
- [ ] Rate limiting active on auth routes (verified config in api/src/routes)
- [ ] Redis denylist for JWT revocation operational (verified with logout test flow)
- [ ] Tenant isolation: app-layer org scoping is the authoritative control; RLS is opt-in defense-in-depth (see docs/adr/0001-tenant-isolation-and-rls.md)
- [ ] PgBouncer MD5 hash in `userlist.txt` is correct (verified: `echo -n "password" | md5sum` matches userlist entry)
