/**
 * Hover-prefetch for lazy routes (mirrors `App.tsx` dynamic imports).
 * Best-effort; safe to call many times (module graph is cached).
 */
const loaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('../views/Dashboard').then((m) => m.Dashboard),
  '/contacts': () => import('../views/Contacts').then((m) => m.Contacts),
  '/leads': () => import('../views/Leads').then((m) => m.Leads),
  '/companies': () => import('../views/Companies').then((m) => m.Companies),
  '/deals': () => import('../views/Deals').then((m) => m.Deals),
  '/inbox': () => import('../views/Inbox').then((m) => m.Inbox),
  '/settings': () => import('../views/Settings').then((m) => m.Settings),
  '/activities': () => import('../views/Activities').then((m) => m.Activities),
  '/calendar': () => import('../views/Calendar').then((m) => m.Calendar),
  '/sequences': () => import('../views/Sequences').then((m) => m.Sequences),
  '/reports': () => import('../views/Reports').then((m) => m.Reports),
}

export function preloadAppRoute(path: string): void {
  const fn = loaders[path]
  if (fn) void fn().catch(() => {})
}
