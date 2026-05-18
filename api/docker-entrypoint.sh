#!/bin/sh
set -e

echo "[velo-api] Running database migrations..."
node --import tsx/esm scripts/migrate.ts

echo "[velo-api] Starting server..."
exec "$@"
