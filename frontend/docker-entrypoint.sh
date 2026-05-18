#!/bin/sh
set -e

# ── Validate required runtime variables ──────────────────────────────────────
if [ -z "${VELO_API_URL}" ]; then
  echo "ERROR: VELO_API_URL is required."
  echo "       Set it to the URL of your velo-api backend, e.g. http://velo-api:3001"
  exit 1
fi

# Strip any trailing slash to keep proxy_pass clean
VELO_API_URL="${VELO_API_URL%/}"
export VELO_API_URL

# Extract the container's nameserver so nginx can resolve upstream hostnames at
# request time. Works on Docker (127.0.0.11), Kubernetes (CoreDNS), and others.
NAMESERVER=$(grep -i '^nameserver' /etc/resolv.conf | head -1 | awk '{print $2}')
NAMESERVER="${NAMESERVER:-127.0.0.11}"
export NAMESERVER

# ── Render Nginx config from template ────────────────────────────────────────
envsubst '${VELO_API_URL} ${NAMESERVER}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "Velo CRM starting — proxying /api → ${VELO_API_URL} (resolver: ${NAMESERVER})"

exec "$@"
