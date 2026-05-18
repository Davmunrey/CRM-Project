/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const analyze = process.env.ANALYZE === '1' || process.env.ANALYZE === 'true'
  return {
    plugins: [
      react(),
      ...(analyze
        ? [
            visualizer({
              filename: 'dist/stats.html',
              gzipSize: true,
              brotliSize: true,
              open: false,
            }),
          ]
        : []),
    ],
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
        exclude: [],
        thresholds: {
          lines: 50,
          functions: 50,
          branches: 45,
          statements: 50,
        },
      },
    },
  }
})
