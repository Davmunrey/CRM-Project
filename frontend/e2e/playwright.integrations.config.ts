import { defineConfig, devices } from '@playwright/test'

/**
 * API-only smoke: hits n0crm-api directly (no app preview server).
 * Run with env vars from `.env.e2e` (see `.env.e2e.example`) or CI secrets.
 */
export default defineConfig({
  // Paths are relative to this config file (`e2e/`).
  testDir: '.',
  testMatch: 'integrations-api-capture.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  forbidOnly: !!process.env.CI,
  use: {
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium-api',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
})
