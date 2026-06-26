/** Next.js-compatible env helpers (replaces Vite import.meta.env). */

export function env(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env[key]) {
    return process.env[key]
  }
  return undefined
}

export const isDev = process.env.NODE_ENV === 'development'
export const isProd = process.env.NODE_ENV === 'production'

export type AppChannel = 'development' | 'staging' | 'production'

export function getAppChannel(): AppChannel {
  const explicit = env('NEXT_PUBLIC_APP_CHANNEL')?.toLowerCase()
  if (explicit === 'staging' || explicit === 'production' || explicit === 'development') {
    return explicit
  }
  if (isProd) return 'production'
  return 'development'
}
