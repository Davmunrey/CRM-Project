#!/bin/sh
set -e

# ---- Resolve DATABASE_URL --------------------------------------------------
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
  echo "ERROR: DATABASE_URL is not configured."
  echo "  Set DATABASE_URL or POSTGRES_PASSWORD env vars."
  exit 1
fi

# ---- Apply migrations with retry (postgres may still be starting) -----------
echo "[velo-api] Waiting for postgres and applying migrations..."
MIGRATE_OK=0
MIGRATE_ATTEMPT=0
MIGRATE_MAX=30
LAST_ERROR=""
while [ $MIGRATE_ATTEMPT -lt $MIGRATE_MAX ]; do
  MIGRATE_ATTEMPT=$((MIGRATE_ATTEMPT + 1))
  LAST_ERROR=$(node --import tsx/esm scripts/migrate.ts 2>&1) && { MIGRATE_OK=1; break; }
  echo "[velo-api] Attempt $MIGRATE_ATTEMPT/$MIGRATE_MAX failed — retrying in 2s..."
  sleep 2
done

if [ $MIGRATE_OK -eq 0 ]; then
  echo "ERROR: Database migrations failed after $MIGRATE_MAX attempts."
  echo "  DATABASE_URL: $(echo $DATABASE_URL | sed 's/\/\/.*/\/\//g')"
  echo "  Last error: $LAST_ERROR"
  echo ""
  echo "  Fix: In PrivatePrompt → Secrets, set POSTGRES_PASSWORD in the api"
  echo "  service to the same value as the postgres service password."
  exit 1
fi
echo "[velo-api] Migrations applied successfully."

# ---- Start server ----------------------------------------------------------
echo "[velo-api] Starting server on port ${PORT:-3001}..."
exec "$@"
