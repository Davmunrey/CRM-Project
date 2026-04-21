/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/** Keep aligned with `src/lib/envChannel.ts` `resolveAppChannel` logic (no `test` mode in builds). */
function resolveBuildChannel(mode: string, env: Record<string, string>): string {
  const explicit = (env.VITE_APP_CHANNEL ?? '').trim().toLowerCase()
  if (explicit === 'production' || explicit === 'staging' || explicit === 'demo') return explicit
  if (mode === 'staging') return 'staging'
  if (mode === 'production') return 'production'
  return 'development'
}

function isSupabaseEnvValid(env: Record<string, string>): boolean {
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  return (
    typeof url === 'string' &&
    url.startsWith('https://') &&
    typeof key === 'string' &&
    key.length > 10
  )
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const channel = resolveBuildChannel(mode, env)

  if (command === 'build' && (channel === 'production' || channel === 'staging') && !isSupabaseEnvValid(env)) {
    throw new Error(
      `[CRM] Build rejected: VITE_APP_CHANNEL is "${channel}" but VITE_SUPABASE_URL (https://…) and ` +
        'VITE_SUPABASE_ANON_KEY are missing or invalid. Use VITE_APP_CHANNEL=demo for offline demo bundles.',
    )
  }

  return {
    plugins: [react()],
    server: {
      port: 5174,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react') || id.includes('react-router-dom')) return 'react'
            if (id.includes('lucide-react') || id.includes('@hello-pangea/dnd')) return 'ui'
            if (id.includes('@supabase/supabase-js')) return 'supabase'
            if (id.includes('node_modules/recharts')) return 'recharts'
            if (id.includes('node_modules/date-fns')) return 'date-fns'
            return undefined
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      /** `forks` avoids thread-pool hangs on Windows with Vitest 4 + jsdom. */
      pool: 'forks',
      maxWorkers: 4,
      minWorkers: 1,
      testTimeout: 30_000,
      hookTimeout: 30_000,
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.{test,spec}.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        include: ['src/store/**', 'src/utils/**', 'src/lib/schemas/**'],
        exclude: ['src/utils/seedData.ts'],
      },
    },
  }
})
