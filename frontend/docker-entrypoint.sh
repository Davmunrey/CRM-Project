#!/bin/sh
set -e

# Resolver: Docker embedded DNS by default, or the first /etc/resolv.conf entry.
NAMESERVER=$(grep -i '^nameserver' /etc/resolv.conf | head -1 | awk '{print $2}')
NAMESERVER="${NAMESERVER:-127.0.0.11}"
export NAMESERVER

# Normalise N0CRM_API_URL (strip trailing slash) so we never produce //paths in proxy_pass.
N0CRM_API_URL="${N0CRM_API_URL%/}"
export N0CRM_API_URL

# Derive the API hostname for SNI and the upstream Host header.
# Example: https://n0crm-api.apps.privateprompt.tech → n0crm-api.apps.privateprompt.tech
API_HOST=$(echo "${N0CRM_API_URL}" | sed -E 's|^https?://||; s|/.*$||; s|:.*$||')
if [ -z "${API_HOST}" ]; then
  echo "ERROR: could not derive API_HOST from N0CRM_API_URL='${N0CRM_API_URL}'"
  exit 1
fi
export API_HOST

# Derive host:port for the upstream keepalive block (strip scheme, keep port if present)
N0CRM_API_URL_HOST_PORT=$(echo "${N0CRM_API_URL}" | sed -E 's|^https?://||; s|/.*$||')
export N0CRM_API_URL_HOST_PORT

envsubst '${N0CRM_API_URL} ${N0CRM_API_URL_HOST_PORT} ${API_HOST} ${NAMESERVER}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "n0CRM starting — proxying /api → ${N0CRM_API_URL} (SNI/Host: ${API_HOST}, resolver: ${NAMESERVER})"
exec nginx -g 'daemon off;'
