/**
 * Server-side RBAC permission matrix.
 *
 * The frontend has a granular permission UI, but the backend historically used
 * ad-hoc role-string checks. This module is the single source of truth for what
 * each role may do, exposed as a pure, unit-testable `roleHasPermission()` that
 * the `requirePermission()` middleware (middleware/rbac.ts) enforces per-route.
 *
 * Permissions are `resource:action` strings. `owner` implicitly has every
 * permission. Roles: owner, admin, manager, sales_rep, viewer.
 */

export type Role = 'owner' | 'admin' | 'manager' | 'sales_rep' | 'viewer'

// CRM record resources every selling role touches.
const CRM = ['contacts', 'companies', 'deals', 'activities', 'leads', 'tickets', 'updates'] as const

function crm(actions: string[]): string[] {
  return CRM.flatMap((r) => actions.map((a) => `${r}:${a}`))
}

/**
 * Explicit permission sets per non-owner role. `owner` is intentionally omitted —
 * it is granted everything by `roleHasPermission`.
 */
const MATRIX: Record<Exclude<Role, 'owner'>, ReadonlySet<string>> = {
  // Admin: full operational control (everything an owner can do day-to-day).
  admin: new Set<string>([
    ...crm(['read', 'write', 'delete']),
    'reports:read',
    'settings:read', 'settings:manage',
    'members:read', 'members:manage',
    'apikeys:manage', 'webhooks:manage', 'automations:manage',
    'billing:manage',
    'ai:use',
  ]),
  // Manager: manages the team's CRM data + reads settings, no billing/keys.
  manager: new Set<string>([
    ...crm(['read', 'write', 'delete']),
    'reports:read',
    'settings:read',
    'members:read',
    'automations:manage',
    'ai:use',
  ]),
  // Sales rep: works their pipeline (no destructive bulk delete, no config).
  sales_rep: new Set<string>([
    ...crm(['read', 'write']),
    'reports:read',
    'ai:use',
  ]),
  // Viewer: read-only across CRM + reports.
  viewer: new Set<string>([
    ...crm(['read']),
    'reports:read',
  ]),
}

/** Roles this codebase recognizes, in privilege order. */
export const ROLES: Role[] = ['owner', 'admin', 'manager', 'sales_rep', 'viewer']

/** True if `role` is granted `permission`. Unknown roles get nothing; owner gets all. */
export function roleHasPermission(role: string, permission: string): boolean {
  if (role === 'owner') return true
  const set = MATRIX[role as Exclude<Role, 'owner'>]
  return set ? set.has(permission) : false
}

/** All permissions for a role (owner returns the union of every declared permission). */
export function permissionsForRole(role: string): string[] {
  if (role === 'owner') {
    const all = new Set<string>()
    for (const set of Object.values(MATRIX)) for (const p of set) all.add(p)
    return [...all]
  }
  const set = MATRIX[role as Exclude<Role, 'owner'>]
  return set ? [...set] : []
}
