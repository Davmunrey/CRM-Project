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

# ── Render Nginx config from template ────────────────────────────────────────
# Only substitute ${VELO_API_URL} — leave all nginx $variables untouched.
envsubst '${VELO_API_URL}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "Velo CRM starting — proxying /api → ${VELO_API_URL}"

exec "$@"
