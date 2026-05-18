#!/bin/sh
set -e

NAMESERVER=$(grep -i '^nameserver' /etc/resolv.conf | head -1 | awk '{print $2}')
NAMESERVER="${NAMESERVER:-127.0.0.11}"
export NAMESERVER

envsubst '${VELO_API_URL} ${NAMESERVER}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "Velo CRM starting — proxying /api → ${VELO_API_URL} (resolver: ${NAMESERVER})"
exec nginx -g 'daemon off;'
