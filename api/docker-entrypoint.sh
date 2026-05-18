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

# ---- Validate DATABASE_URL -------------------------------------------------
if [ -z "${DATABASE_URL}" ] || [ "${DATABASE_URL}" = "postgres://velo:@postgres:5432/velo" ]; then
  echo "ERROR: DATABASE_URL is not configured and POSTGRES_PASSWORD is missing."
  echo "       Please set DATABASE_URL, e.g.:"
  echo "         postgres://velo:<your-postgres-password>@postgres:5432/velo"
  echo "       Or set POSTGRES_PASSWORD to match the postgres service password."
  exit 1
fi

# ---- Apply migrations ------------------------------------------------------
echo "[velo-api] Running database migrations..."
node --import tsx/esm scripts/migrate.ts

# ---- Start server ----------------------------------------------------------
echo "[velo-api] Starting server..."
exec "$@"
