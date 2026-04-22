/**
 * Deployment channel (set `VITE_APP_CHANNEL` in CI per environment).
 * - `production` - live customers; requires Supabase at build time.
 * - `staging` - pre-prod / preview; requires Supabase (staging project).
 * - `development` - local `npm run dev` when channel unset (default).
 */
export type AppChannel = 'production' | 'staging' | 'development'

const explicit = (import.meta.env.VITE_APP_CHANNEL as string | undefined)?.trim().toLowerCase()

function resolveAppChannel(): AppChannel {
  if (explicit === 'production' || explicit === 'staging') return explicit
  const mode = import.meta.env.MODE
  /** Vitest uses `MODE=test` with `PROD` sometimes true; treat as local dev for channel semantics. */
  if (mode === 'test') return 'development'
  if (mode === 'staging') return 'staging'
  if (import.meta.env.PROD) return 'production'
  return 'development'
}

export const appChannel: AppChannel = resolveAppChannel()
