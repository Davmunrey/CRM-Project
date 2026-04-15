import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured =
  typeof supabaseUrl === 'string' && supabaseUrl.startsWith('https://') &&
  typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 10

/** Production builds require real Supabase configuration (fail-closed). */
export const isBootstrapFatalError = Boolean(import.meta.env.PROD && !isSupabaseConfigured)

function readDemoModeFlag(): boolean {
  const raw = import.meta.env.VITE_ALLOW_DEMO_MODE as string | undefined
  return raw === '1' || raw?.toLowerCase() === 'true'
}

/**
 * Local-only demo (seed users, mock auth). Never enabled in production builds.
 * Set `VITE_ALLOW_DEMO_MODE=true` in non-production `.env.local` when you need offline demo.
 */
export const isOfflineDemoMode =
  !isSupabaseConfigured && !import.meta.env.PROD && readDemoModeFlag()

if (!isSupabaseConfigured && import.meta.env.DEV) {
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
