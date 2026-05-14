import { expect, test } from '@playwright/test'

type LoginResponse = { token?: string; error?: string }
type ApiKeyCreateResponse = { key?: { id: string; name: string; key_prefix: string }; apiKey?: string; error?: string }
type ApiKeyListResponse = { keys?: Array<{ id: string; name: string; key_prefix: string }> }
type LeadTokenCreateResponse = { token_row?: { id: string; label: string; token_prefix: string }; token?: string; error?: string }
type LeadTokenListResponse = { tokens?: Array<{ id: string; label: string }> }

const requiredEnv = ['E2E_API_URL', 'E2E_USER_EMAIL', 'E2E_USER_PASSWORD'] as const

test.describe('API keys & lead capture tokens smoke', () => {
  test('API key lifecycle: create → use → delete → 401', async ({ request }) => {
    const missing = requiredEnv.filter((name) => !process.env[name])
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`)

    const base = process.env.E2E_API_URL!.replace(/\/$/, '')

    // 1. Login
    const loginRes = await request.post(`${base}/auth/login`, {
      data: { email: process.env.E2E_USER_EMAIL!, password: process.env.E2E_USER_PASSWORD! },
    })
    expect(loginRes.ok(), `Login failed: ${loginRes.status()}`).toBeTruthy()
    const login = (await loginRes.json()) as LoginResponse
    expect(login.token).toBeTruthy()
    const bearerHeaders = {
      Authorization: `Bearer ${login.token!}`,
      'Content-Type': 'application/json',
    }

    // 2. Create API key
    const keyName = `e2e-key-${Date.now()}`
    const createKeyRes = await request.post(`${base}/integrations/api-keys`, {
      headers: bearerHeaders,
      data: { name: keyName },
    })
    expect(createKeyRes.status()).toBe(201)
    const createKeyBody = (await createKeyRes.json()) as ApiKeyCreateResponse
    expect(createKeyBody.apiKey).toBeTruthy()
    expect(createKeyBody.key?.id).toBeTruthy()
    const apiKey = createKeyBody.apiKey!
    const keyId = createKeyBody.key!.id

    // 3. List — confirm key present
    const listKeysRes = await request.get(`${base}/integrations/api-keys`, { headers: bearerHeaders })
    expect(listKeysRes.ok()).toBeTruthy()
    const listKeysBody = (await listKeysRes.json()) as ApiKeyListResponse
    expect((listKeysBody.keys ?? []).some((k) => k.id === keyId)).toBeTruthy()

    // 4. Use API key to create a lead
    const leadEmail = `e2e-lead-${Date.now()}@example.com`
    const leadRes = await request.post(`${base}/public/v1/leads`, {
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      data: { email: leadEmail, first_name: 'E2E', last_name: 'Smoke' },
    })
    expect(leadRes.status()).toBe(201)

    // 5. Delete API key
    const deleteKeyRes = await request.delete(`${base}/integrations/api-keys/${keyId}`, {
      headers: bearerHeaders,
    })
    expect(deleteKeyRes.ok()).toBeTruthy()

    // 6. Deleted key → 401 on public API
    const leadAfterDeleteRes = await request.post(`${base}/public/v1/leads`, {
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      data: { email: `e2e-after-${Date.now()}@example.com` },
    })
    expect(leadAfterDeleteRes.status()).toBe(401)
  })

  test('Lead capture token lifecycle: create → list → delete', async ({ request }) => {
    const missing = requiredEnv.filter((name) => !process.env[name])
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`)

    const base = process.env.E2E_API_URL!.replace(/\/$/, '')

    // 1. Login
    const loginRes = await request.post(`${base}/auth/login`, {
      data: { email: process.env.E2E_USER_EMAIL!, password: process.env.E2E_USER_PASSWORD! },
    })
    expect(loginRes.ok()).toBeTruthy()
    const login = (await loginRes.json()) as LoginResponse
    const bearerHeaders = {
      Authorization: `Bearer ${login.token!}`,
      'Content-Type': 'application/json',
    }

    // 2. Create lead capture token
    const tokenLabel = `e2e-lct-${Date.now()}`
    const createTokenRes = await request.post(`${base}/integrations/lead-capture-tokens`, {
      headers: bearerHeaders,
      data: { label: tokenLabel },
    })
    expect(createTokenRes.status()).toBe(201)
    const createTokenBody = (await createTokenRes.json()) as LeadTokenCreateResponse
    expect(createTokenBody.token).toBeTruthy()
    expect(createTokenBody.token_row?.id).toBeTruthy()
    const tokenId = createTokenBody.token_row!.id

    // 3. List — confirm token present
    const listTokensRes = await request.get(`${base}/integrations/lead-capture-tokens`, {
      headers: bearerHeaders,
    })
    expect(listTokensRes.ok()).toBeTruthy()
    const listTokensBody = (await listTokensRes.json()) as LeadTokenListResponse
    expect((listTokensBody.tokens ?? []).some((t) => t.id === tokenId)).toBeTruthy()

    // 4. Delete token
    const deleteTokenRes = await request.delete(
      `${base}/integrations/lead-capture-tokens/${tokenId}`,
      { headers: bearerHeaders },
    )
    expect(deleteTokenRes.ok()).toBeTruthy()

    // 5. List — confirm token gone
    const listAfterRes = await request.get(`${base}/integrations/lead-capture-tokens`, {
      headers: bearerHeaders,
    })
    expect(listAfterRes.ok()).toBeTruthy()
    const listAfterBody = (await listAfterRes.json()) as LeadTokenListResponse
    expect((listAfterBody.tokens ?? []).some((t) => t.id === tokenId)).toBeFalsy()
  })
})
