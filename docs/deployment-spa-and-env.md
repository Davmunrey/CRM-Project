# Static hosting: SPA routing and build-time env

Backend is **velo-api** (self-hosted Fastify + PostgreSQL). No Supabase dependency.

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

```bash
# 1. Build frontend with nginx proxy path
cd velo-crm
VITE_API_URL=/api npm run build

# 2. Start everything
cd ../velo-api
cp .env.example .env
# Edit JWT_SECRET (openssl rand -hex 32)
docker-compose up -d
```

Frontend: `http://localhost`. API: `http://localhost:3001`.

Services: `postgres` (5432), `redis` (6379), `migrate` (runs on boot), `api` (3001), `frontend` (80).

## Staging vs production

- Point `VITE_API_URL` at the correct API instance per environment
- Use separate DBs (separate `DATABASE_URL`) for staging vs production
- Add allowed CORS origins in `CORS_ORIGIN` env on the API side

## Smoke

After deploy: run through [smoke-checklist-production.md](./smoke-checklist-production.md).

*Last updated: 2026-05-13*
