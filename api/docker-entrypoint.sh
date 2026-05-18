#!/bin/sh
set -e

# ---- Resolve DATABASE_URL --------------------------------------------------
#
# The api needs DATABASE_URL to connect to postgres. If not set explicitly,
# it's built from POSTGRES_PASSWORD (or a shared default).
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
  echo "ERROR: DATABASE_URL is not configured."
  exit 1
fi

# ---- Apply migrations with retry (postgres may still be starting) -----------
echo "[velo-api] Applying database migrations..."
MIGRATE_OK=0
MIGRATE_ATTEMPT=0
MIGRATE_MAX=30
while [ $MIGRATE_ATTEMPT -lt $MIGRATE_MAX ]; do
  MIGRATE_ATTEMPT=$((MIGRATE_ATTEMPT + 1))
  if node --import tsx/esm scripts/migrate.ts 2>&1; then
    MIGRATE_OK=1
    break
  fi
  echo "[velo-api] Attempt $MIGRATE_ATTEMPT/$MIGRATE_MAX failed — retrying in 2s..."
  sleep 2
done
if [ $MIGRATE_OK -eq 0 ]; then
  echo "ERROR: Database migrations failed after $MIGRATE_MAX attempts."
  echo "       DATABASE_URL: $(echo $DATABASE_URL | sed 's/[0-9a-zA-Z_]*/★/g')"
  echo "       Check that POSTGRES_PASSWORD matches the postgres service password."
  exit 1
fi

# ---- Start server ----------------------------------------------------------
echo "[velo-api] Starting server on port ${PORT:-3001}..."
exec "$@"
