import { afterEach, describe, expect, it, vi } from 'vitest'

describe('envChannel', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('defaults to development in Vitest (MODE=test)', async () => {
    vi.stubEnv('VITE_APP_CHANNEL', '')
    const { appChannel } = await import('../../src/lib/envChannel')
    expect(appChannel).toBe('development')
  })

  it('defaults to production when PROD and channel unset', async () => {
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('PROD', 'true')
    vi.stubEnv('VITE_APP_CHANNEL', '')
    const { appChannel } = await import('../../src/lib/envChannel')
    expect(appChannel).toBe('production')
  })

  it('respects explicit staging', async () => {
    vi.stubEnv('VITE_APP_CHANNEL', 'staging')
    const { appChannel } = await import('../../src/lib/envChannel')
    expect(appChannel).toBe('staging')
  })

  it('respects explicit demo', async () => {
    vi.stubEnv('VITE_APP_CHANNEL', 'demo')
    const { appChannel, isHostedDemoChannel } = await import('../../src/lib/envChannel')
    expect(appChannel).toBe('demo')
    expect(isHostedDemoChannel).toBe(true)
  })

  it('uses MODE=staging when channel unset', async () => {
    vi.stubEnv('MODE', 'staging')
    vi.stubEnv('PROD', 'false')
    vi.stubEnv('VITE_APP_CHANNEL', '')
    const { appChannel } = await import('../../src/lib/envChannel')
    expect(appChannel).toBe('staging')
  })
})
