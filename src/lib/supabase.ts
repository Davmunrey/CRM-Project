import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.gen'
import { devConsole } from './devConsole'

/**
 * Resolved data backend for this bundle:
 * - `supabase`: real project (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY).
 * - `unconfigured`: no backend; production shows bootstrap fatal screen.
 */
export type DataRuntime = 'supabase' | 'unconfigured'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)

export const isSupabaseConfigured =
  typeof supabaseUrl === 'string' &&
  supabaseUrl.startsWith('https://') &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.length > 10

/** Production and staging bundles require Supabase at build time. */
export const isBootstrapFatalError = Boolean(import.meta.env.PROD && !isSupabaseConfigured)

export const dataRuntime: DataRuntime = isSupabaseConfigured ? 'supabase' : 'unconfigured'

const isVitest = import.meta.env.MODE === 'test'

if (dataRuntime === 'unconfigured' && import.meta.env.DEV && !isVitest) {
  devConsole.warn(
    '[Velo] Supabase env vars missing or invalid. Auth and data are disabled until you set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).',
  )
}

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : null
