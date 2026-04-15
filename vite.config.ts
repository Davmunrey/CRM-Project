/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('react-router-dom')) return 'react'
          if (id.includes('lucide-react') || id.includes('@hello-pangea/dnd')) return 'ui'
          if (id.includes('@supabase/supabase-js')) return 'supabase'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'threads',
    /** Single worker: stable Vitest runs and avoids intermittent pool "Timeout waiting for worker to respond" under load. */
    maxWorkers: 50,
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
})
