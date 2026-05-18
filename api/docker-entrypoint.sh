#!/bin/sh
set -e

# ---- Resolve DATABASE_URL --------------------------------------------------
# Try POSTGRES_PASSWORD first; if not set, discover it from the postgres container
# via the shared environment (works when both services use the same default).
DB_USER="${DATABASE_USER:-velo}"
DB_HOST="${DATABASE_HOST:-postgres}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-velo}"

if [ -z "${DATABASE_URL}" ]; then
  # Use POSTGRES_PASSWORD if explicitly set, otherwise default
  DB_PASS="${POSTGRES_PASSWORD:-velo_db_2026_secure}"
  DATABASE_URL="postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  export DATABASE_URL
  echo "[velo-api] DATABASE_URL built: ${DB_USER}:***@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

if [ -z "${DATABASE_URL}" ]; then
  echo "ERROR: DATABASE_URL is not configured."
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
  if LAST_ERROR=$(node --import tsx/esm scripts/migrate.ts 2>&1); then
    MIGRATE_OK=1
    break
  fi
  echo "[velo-api] Attempt $MIGRATE_ATTEMPT/$MIGRATE_MAX failed — retrying in 2s..."
  sleep 2
done

if [ $MIGRATE_OK -eq 0 ]; then
  echo "ERROR: Database migrations failed after $MIGRATE_MAX attempts."
  echo "  DATABASE_URL: $(echo $DATABASE_URL | sed 's/\/\/.*/\/\//g')"
  echo "  Last error: $LAST_ERROR"
  echo ""
  echo "  Possible causes:"
  echo "    1. Password mismatch — POSTGRES_PASSWORD in this service must match"
  echo "       the postgres service password. Default: velo_db_2026_secure"
  echo "    2. Postgres volume has an old password. In PrivatePrompt, delete &"
  echo "       recreate the app (not just redeploy) to reset the postgres volume."
  echo "    3. Postgres is still initializing. Check postgres container logs."
  exit 1
fi
echo "[velo-api] Migrations applied successfully."

# ---- Start server ----------------------------------------------------------
echo "[velo-api] Starting server on port ${PORT:-3001}..."
exec "$@"
