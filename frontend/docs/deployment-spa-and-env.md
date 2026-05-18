# Static hosting: SPA routing and build-time env

Backend is **api/** (self-hosted Fastify + PostgreSQL) in the velo-crm monorepo. No Supabase dependency.

## SPA fallback

Configure your reverse proxy so unknown paths serve `index.html` (React Router).

| Pattern | Where |
|---------|-------|
| nginx `location / { try_files $uri $uri/ /index.html; }` | VPS / VM |
| Caddy `try_files { path } /index.html` | VPS |
| S3 + CloudFront custom error → `/index.html` | Bucket + CDN |

Optional checked-in artifacts:

| Artifact | Host |
|----------|------|
| `public/_redirects` (`/*` → `/index.html` `200`) | Netlify |
| `public/_headers` | Netlify — baseline security headers |
| `vercel.json` | Vercel — SPA rewrites + security headers |

**Verify:** open `/deals` and `/settings` in a new tab (hard refresh). Must show app shell, never a `404`.

## Build-time environment

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✓ | Fastify API base URL. Docker: omit (nginx proxies `/api/*`). Local: `http://localhost:3001` |
| `VITE_APP_CHANNEL` | — | `production` or `staging` (optional; defaults to Vite `MODE`) |
| `VITE_GMAIL_CLIENT_ID` | — | Google OAuth client ID (Gmail integration) |
| `VITE_GMAIL_REDIRECT_URI` | — | Gmail OAuth redirect URI |
| `VITE_WORKSPACE_ROOT_DOMAIN` | — | Multi-tenant subdomain root (optional) |

**Build:** `npm run build` — no special mode needed. Output goes to `dist/`.

## Docker full stack

From repo root:

```bash
# 1. Configure API environment
cp api/.env.example api/.env
# Edit JWT_SECRET (openssl rand -hex 32) and TOKEN_ENCRYPTION_KEY

# 2. Start full stack (compose orchestrates frontend build, migrations, all services)
docker-compose up -d
```

Frontend: `http://localhost`. API: `http://localhost:3001`.

Services: `postgres` (5432 internal), `redis` (6379 internal), `api` (3001 internal), `web` (nginx + frontend on 80).

## Staging vs production

- Point `VITE_API_URL` at the correct API instance per environment
- Use separate DBs (separate `DATABASE_URL`) for staging vs production
- Add allowed CORS origins in `CORS_ORIGIN` env on the API side

## Private Prompt deployment

A single `privateprompt-app.json` manifest at repo root deploys the full Velo CRM stack:
- Postgres 16 + Redis
- `api/` service (Fastify, runs migrations on boot)
- `frontend/` service (React SPA with nginx proxy)

All environment variables (`JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `CORS_ORIGIN`, etc.) are configured via Private Prompt secrets interface.

## Smoke

After deploy: run through [smoke-checklist-production.md](./smoke-checklist-production.md).

*Last updated: 2026-05-18*
