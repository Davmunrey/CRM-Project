import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { appChannel } from './envChannel'

/**
 * Resolved data/auth backend for this bundle:
 * - `supabase`: real project (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY).
 * - `offline_demo`: mock auth + seeds — local with `VITE_ALLOW_DEMO_MODE`, or hosted bundle with `VITE_APP_CHANNEL=demo`.
 * - `unconfigured`: no backend; dev shows a console hint; production shows the bootstrap fatal screen.
 */
export type DataRuntime = 'supabase' | 'offline_demo' | 'unconfigured'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured =
  typeof supabaseUrl === 'string' &&
  supabaseUrl.startsWith('https://') &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.length > 10

/**
 * Local `VITE_ALLOW_DEMO_MODE` — ignored on production/staging bundles so a stray env cannot enable mock auth.
 * Hosted **demo** channel uses `appChannel === 'demo'` instead (see `isOfflineDemoMode`).
 */
function readDemoModeFlag(): boolean {
  if (import.meta.env.PROD && appChannel !== 'demo') return false
  const raw = import.meta.env.VITE_ALLOW_DEMO_MODE as string | undefined
  return raw === '1' || raw?.toLowerCase() === 'true'
}

/** Real prod/staging bundles require Supabase; `demo` channel may ship without it (offline mock). */
export const isBootstrapFatalError = Boolean(
  import.meta.env.PROD && !isSupabaseConfigured && appChannel !== 'demo',
)

/**
 * Mock auth + seed data when Supabase is not configured.
 * - Local: `VITE_ALLOW_DEMO_MODE` in non-prod dev server.
 * - Hosted: `VITE_APP_CHANNEL=demo` (production bundle, no Supabase).
 */
const allowOfflineDemoHost = !import.meta.env.PROD || appChannel === 'demo'
const wantsOfflineDemo = readDemoModeFlag() || appChannel === 'demo'

export const isOfflineDemoMode =
  !isSupabaseConfigured && allowOfflineDemoHost && wantsOfflineDemo

export const dataRuntime: DataRuntime = isSupabaseConfigured
  ? 'supabase'
  : isOfflineDemoMode
    ? 'offline_demo'
    : 'unconfigured'

const isVitest = import.meta.env.MODE === 'test'

if (dataRuntime === 'unconfigured' && import.meta.env.DEV && !isVitest) {
  if (readDemoModeFlag()) {
    console.warn(
      '[CRM] Supabase env vars missing. Offline demo mode is ON (VITE_ALLOW_DEMO_MODE).\n' +
        'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use real auth.',
    )
  } else {
    console.warn(
      '[CRM] Supabase env vars missing or invalid. Auth/data are disabled until configured.\n' +
        'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or set VITE_ALLOW_DEMO_MODE=true for local demo only.',
    )
  }
}

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : null
