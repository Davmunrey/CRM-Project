#!/bin/sh
set -e

# ── Write nginx config from template ──────────────────────────────────────────
# (no longer needs VELO_API_URL / NAMESERVER — uses hardcoded localhost:3001)
if [ -f /etc/nginx/conf.d/default.conf.template ]; then
  envsubst '${VELO_API_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
fi

# ── Start the API in background ──────────────────────────────────────────────
echo "[velo-web] Starting API on port 3001..."

# Run the API entrypoint (handles migrations + server start) in background
cd /opt/velo-api
/opt/velo-api/docker-entrypoint.sh node dist/index.js &
API_PID=$!

# Wait for API to become healthy
echo "[velo-web] Waiting for API to be ready..."
API_OK=0
for i in $(seq 1 30); do
  if wget -qO- --spider http://localhost:3001/health 2>/dev/null; then
    API_OK=1
    echo "[velo-web] API is ready (attempt $i/30)"
    break
  fi
  sleep 2
done

if [ $API_OK -eq 0 ]; then
  echo "[velo-web] WARNING: API did not become ready within 60s. Starting nginx anyway."
  echo "[velo-web] Check API logs above for migration/connection errors."
fi

cd /
echo "[velo-web] Starting nginx..."
exec nginx -g 'daemon off;'
