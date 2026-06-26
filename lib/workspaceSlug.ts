/**
 * Extracts the workspace slug from the browser hostname when the app is served on
 * `{slug}.{rootDomain}` (per-tenant subdomains).
 *
 * @param hostname e.g. window.location.hostname (no port)
 * @param rootDomain e.g. `crm.example.com` (lowercase recommended)
 * @returns slug or null when on apex host or hostname does not match the pattern
 */
export function extractWorkspaceSlugFromHost(hostname: string, rootDomain: string): string | null {
  const host = hostname.trim().toLowerCase()
  const root = rootDomain.trim().toLowerCase()
  if (!root || !host) return null
  if (host === root) return null
  const suffix = `.${root}`
  if (!host.endsWith(suffix)) return null
  const prefix = host.slice(0, -suffix.length)
  if (!prefix || prefix.includes('.')) return null
  return prefix
}

/** First hostname label is ignored for workspace inference (common infra / marketing hosts). */
const RESERVED_FIRST_LABELS = new Set([
  'www',
  'app',
  'apps',
  'api',
  'cdn',
  'static',
  'assets',
  'mail',
  'smtp',
  'ftp',
  'web',
  'dashboard',
  'portal',
])

/** Known PaaS / preview hosts: first label is not a customer workspace slug. */
const AUTO_INFER_DISABLED_SUFFIXES = [
  'vercel.app',
  'netlify.app',
  'pages.dev',
  'workers.dev',
  'github.io',
  'herokuapp.com',
  'azurewebsites.net',
  'onrender.com',
  'supabase.co',
]

function hostnameMatchesDisabledSuffix(host: string): boolean {
  const h = host.toLowerCase()
  return AUTO_INFER_DISABLED_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`))
}

function isValidWorkspaceSlugLabel(label: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
}

/**
 * When `NEXT_PUBLIC_WORKSPACE_ROOT_DOMAIN` is not set, infers tenant slug from the leftmost DNS label
 * (e.g. `acme.example.com` → `acme`, like `tenant.crm.example.com`).
 * Skips preview/PaaS hosts and reserved first labels.
 */
export function inferWorkspaceSlugFromHostname(hostname: string): string | null {
  const host = hostname.trim().toLowerCase()
  if (!host || host === 'localhost') return null
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null
  if (host.includes(':')) return null
  if (hostnameMatchesDisabledSuffix(host)) return null

  const parts = host.split('.').filter(Boolean)
  if (parts.length < 2) return null

  // e.g. acme.localhost
  if (parts.length === 2 && parts[1] === 'localhost') {
    const first = parts[0]
    if (RESERVED_FIRST_LABELS.has(first) || !isValidWorkspaceSlugLabel(first)) return null
    return first
  }

  if (parts.length < 3) return null

  const first = parts[0]
  if (!first || RESERVED_FIRST_LABELS.has(first) || !isValidWorkspaceSlugLabel(first)) return null
  return first
}

/**
 * Explicit `NEXT_PUBLIC_WORKSPACE_ROOT_DOMAIN` wins (strict suffix match).
 * Otherwise uses {@link inferWorkspaceSlugFromHostname}.
 */
export function resolveWorkspaceSlugFromWindowHostname(
  hostname: string,
  explicitRootDomain: string | undefined,
): string | null {
  const root = explicitRootDomain?.trim()
  if (root) {
    return extractWorkspaceSlugFromHost(hostname, root)
  }
  return inferWorkspaceSlugFromHostname(hostname)
}
