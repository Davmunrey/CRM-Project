#!/bin/sh
set -e

# ---- Resolve DATABASE_URL --------------------------------------------------
#
# Priority:
#   1. DATABASE_URL if already set explicitly
#   2. POSTGRES_PASSWORD + defaults
#   3. Try known default passwords until one works
#
if [ -z "${DATABASE_URL}" ]; then
  DB_USER="${DATABASE_USER:-velo}"
  DB_HOST="${DATABASE_HOST:-postgres}"
  DB_PORT="${DATABASE_PORT:-5432}"
  DB_NAME="${DATABASE_NAME:-velo}"
  DB_PASS="${POSTGRES_PASSWORD:-velo_db_2026_secure}"
  DATABASE_URL="postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  export DATABASE_URL
  echo "[velo-api] DATABASE_URL built: ${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

# ---- Validate --------------------------------------------------------------
if [ -z "${DATABASE_URL}" ]; then
  echo "ERROR: DATABASE_URL is not configured and cannot be built from env vars."
  exit 1
fi

# ---- Apply migrations ------------------------------------------------------
echo "[velo-api] Applying database migrations..."
node --import tsx/esm scripts/migrate.ts

# ---- Start server ----------------------------------------------------------
echo "[velo-api] Starting server..."
exec "$@"
