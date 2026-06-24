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

# Derive host:port for the upstream keepalive block (strip scheme, keep port if present)
N0CRM_API_URL_HOST_PORT=$(echo "${N0CRM_API_URL}" | sed -E 's|^https?://||; s|/.*$||')

# ── Qualify a bare in-cluster API host to its FQDN ──────────────────────────
# nginx proxies with `proxy_pass $api` (a variable), so it resolves the host at
# request time via the `resolver` directive. Unlike libc/Node, nginx's resolver
# does NOT apply the /etc/resolv.conf `search` domains — it queries the name
# verbatim. So a bare Kubernetes Service name like "api" returns NXDOMAIN
# ("api could not be resolved (Host not found)"), even though the api→postgres
# Node client resolves "postgres" fine. Promote a single-label host to its
# cluster FQDN "<host>.<namespace>.svc.cluster.local". No-op for hosts that are
# already qualified and for docker-compose (its embedded DNS resolves bare names).
case "${API_HOST}" in
  *.*) : ;;  # already an FQDN — leave as-is
  *)
    K8S_NS=""
    if [ -f /var/run/secrets/kubernetes.io/serviceaccount/namespace ]; then
      K8S_NS=$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace)
    else
      # No serviceaccount mounted: derive the namespace from the first k8s search domain.
      K8S_SEARCH=$(grep -i '^search' /etc/resolv.conf | tr -s ' \t' '\n' | grep -E '^[^.]+\.svc\.cluster\.local$' | head -1)
      [ -n "${K8S_SEARCH}" ] && K8S_NS=$(echo "${K8S_SEARCH}" | sed -E 's|\.svc\.cluster\.local$||')
    fi
    if [ -n "${K8S_NS}" ]; then
      FQDN="${API_HOST}.${K8S_NS}.svc.cluster.local"
      PORT_PART=$(echo "${N0CRM_API_URL_HOST_PORT}" | sed -E 's|^[^:]*||')   # ":3001" or ""
      SCHEME=$(echo "${N0CRM_API_URL}" | sed -E 's|^(https?://).*|\1|')
      echo "[n0crm-web] nginx resolver needs an FQDN — qualifying '${API_HOST}' -> '${FQDN}'"
      API_HOST="${FQDN}"
      N0CRM_API_URL_HOST_PORT="${FQDN}${PORT_PART}"
      N0CRM_API_URL="${SCHEME}${FQDN}${PORT_PART}"
    fi
    ;;
esac
export API_HOST N0CRM_API_URL_HOST_PORT N0CRM_API_URL

envsubst '${N0CRM_API_URL} ${N0CRM_API_URL_HOST_PORT} ${API_HOST} ${NAMESERVER}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "n0CRM starting — proxying /api → ${N0CRM_API_URL} (SNI/Host: ${API_HOST}, resolver: ${NAMESERVER})"
exec nginx -g 'daemon off;'
