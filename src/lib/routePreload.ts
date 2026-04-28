/**
 * Hover-prefetch for lazy routes (mirrors `App.tsx` dynamic imports).
 * Best-effort; safe to call many times (module graph is cached).
 */
const loaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('../pages/Dashboard').then((m) => m.Dashboard),
  '/contacts': () => import('../pages/Contacts').then((m) => m.Contacts),
  '/leads': () => import('../pages/Leads').then((m) => m.Leads),
  '/companies': () => import('../pages/Companies').then((m) => m.Companies),
  '/deals': () => import('../pages/Deals').then((m) => m.Deals),
  '/inbox': () => import('../pages/Inbox').then((m) => m.Inbox),
  '/settings': () => import('../pages/Settings').then((m) => m.Settings),
  '/activities': () => import('../pages/Activities').then((m) => m.Activities),
  '/calendar': () => import('../pages/Calendar').then((m) => m.Calendar),
  '/sequences': () => import('../pages/Sequences').then((m) => m.Sequences),
  '/reports': () => import('../pages/Reports').then((m) => m.Reports),
}

export function preloadAppRoute(path: string): void {
  const fn = loaders[path]
  if (fn) void fn().catch(() => {})
}
