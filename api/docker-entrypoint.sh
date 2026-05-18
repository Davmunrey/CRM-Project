#!/bin/sh
set -e

# ---- Build DATABASE_URL from parts if not already set ----------------------
if [ -z "${DATABASE_URL}" ]; then
  DB_USER="${DATABASE_USER:-velo}"
  DB_PASS="${POSTGRES_PASSWORD:-velo}"
  DB_HOST="${DATABASE_HOST:-postgres}"
  DB_PORT="${DATABASE_PORT:-5432}"
  DB_NAME="${DATABASE_NAME:-velo}"
  DATABASE_URL="postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  export DATABASE_URL
  echo "[velo-api] DATABASE_URL built from parts: ${DB_USER}:@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

# ---- Validate database connectivity ----------------------------------------
echo "[velo-api] Verifying database connection..."
node --import tsx/esm scripts/boot-check.ts || exit 1

# ---- Apply migrations ------------------------------------------------------
echo "[velo-api] Running database migrations..."
node --import tsx/esm scripts/migrate.ts

# ---- Start server ----------------------------------------------------------
echo "[velo-api] Starting server..."
exec "$@"
