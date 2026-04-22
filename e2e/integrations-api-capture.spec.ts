import { expect, test } from '@playwright/test'

type AuthResponse = { access_token?: string; error_description?: string; error?: string }
type ApiKeyCreateResponse = { apiKey?: string; error?: string }
type LeadTokenCreateResponse = { token?: string; error?: string }

const requiredEnv = [
  'E2E_SUPABASE_URL',
  'E2E_SUPABASE_ANON_KEY',
  'E2E_USER_EMAIL',
  'E2E_USER_PASSWORD',
  'E2E_ORGANIZATION_ID',
] as const

test.describe('API & capture smoke', () => {
  test('creates, uses, and invalidates API key and lead token', async ({ request }) => {
    const missing = requiredEnv.filter((name) => !process.env[name])
    test.skip(missing.length > 0, `Missing env vars: ${missing.join(', ')}`)

    const supabaseUrl = process.env.E2E_SUPABASE_URL!
    const anonKey = process.env.E2E_SUPABASE_ANON_KEY!
    const organizationId = process.env.E2E_ORGANIZATION_ID!

    const authRes = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      data: {
        email: process.env.E2E_USER_EMAIL!,
        password: process.env.E2E_USER_PASSWORD!,
      },
    })
    expect(authRes.ok()).toBeTruthy()
    const auth = (await authRes.json()) as AuthResponse
    expect(auth.error_description ?? auth.error ?? '').toBe('')
    const accessToken = auth.access_token
    expect(accessToken).toBeTruthy()

    const edgeHeaders = {
      Authorization: `Bearer ${accessToken!}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    }

    const apiKeyLabel = `e2e-key-${Date.now()}`
    const createKeyRes = await request.post(`${supabaseUrl}/functions/v1/api-keys`, {
      headers: edgeHeaders,
      data: { action: 'create', organizationId, name: apiKeyLabel },
    })
    expect(createKeyRes.ok()).toBeTruthy()
    const createKeyBody = (await createKeyRes.json()) as ApiKeyCreateResponse
    expect(createKeyBody.error ?? '').toBe('')
    const apiKey = createKeyBody.apiKey
    expect(apiKey).toBeTruthy()

    const listKeysRes = await request.post(`${supabaseUrl}/functions/v1/api-keys`, {
      headers: edgeHeaders,
      data: { action: 'list', organizationId },
    })
    expect(listKeysRes.ok()).toBeTruthy()
    const listKeysBody = (await listKeysRes.json()) as { keys?: Array<{ id: string; name: string }> }
    const createdKeyRow = (listKeysBody.keys ?? []).find((row) => row.name === apiKeyLabel)
    expect(createdKeyRow).toBeTruthy()

    const publicReadRes = await request.get(
      `${supabaseUrl}/functions/v1/crm-public-api?collection=deals&limit=1`,
      {
        headers: { Authorization: `Bearer ${apiKey!}`, apikey: anonKey },
      },
    )
    expect(publicReadRes.ok()).toBeTruthy()

    const deleteKeyRes = await request.post(`${supabaseUrl}/functions/v1/api-keys`, {
      headers: edgeHeaders,
      data: { action: 'delete', organizationId, keyId: createdKeyRow!.id },
    })
    expect(deleteKeyRes.ok()).toBeTruthy()

    const readAfterDeleteRes = await request.get(
      `${supabaseUrl}/functions/v1/crm-public-api?collection=deals&limit=1`,
      {
        headers: { Authorization: `Bearer ${apiKey!}`, apikey: anonKey },
      },
    )
    expect(readAfterDeleteRes.status()).toBe(401)

    const tokenLabel = `e2e-token-${Date.now()}`
    const createTokenRes = await request.post(`${supabaseUrl}/functions/v1/lead-capture-tokens`, {
      headers: edgeHeaders,
      data: { action: 'create', organizationId, label: tokenLabel },
    })
    expect(createTokenRes.ok()).toBeTruthy()
    const createTokenBody = (await createTokenRes.json()) as LeadTokenCreateResponse
    expect(createTokenBody.error ?? '').toBe('')
    const leadToken = createTokenBody.token
    expect(leadToken).toBeTruthy()

    const listTokensRes = await request.post(`${supabaseUrl}/functions/v1/lead-capture-tokens`, {
      headers: edgeHeaders,
      data: { action: 'list', organizationId },
    })
    expect(listTokensRes.ok()).toBeTruthy()
    const listTokensBody = (await listTokensRes.json()) as { tokens?: Array<{ id: string; label: string }> }
    const createdTokenRow = (listTokensBody.tokens ?? []).find((row) => row.label === tokenLabel)
    expect(createdTokenRow).toBeTruthy()

    const leadCaptureRes = await request.post(`${supabaseUrl}/functions/v1/lead-capture`, {
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      data: {
        token: leadToken,
        first_name: 'E2E',
        last_name: 'Contact',
        email: `e2e-${Date.now()}@example.com`,
      },
    })
    expect(leadCaptureRes.ok()).toBeTruthy()

    const deleteTokenRes = await request.post(`${supabaseUrl}/functions/v1/lead-capture-tokens`, {
      headers: edgeHeaders,
      data: { action: 'delete', organizationId, tokenId: createdTokenRow!.id },
    })
    expect(deleteTokenRes.ok()).toBeTruthy()

    const leadAfterDeleteRes = await request.post(`${supabaseUrl}/functions/v1/lead-capture`, {
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      data: {
        token: leadToken,
        first_name: 'E2E',
        last_name: 'AfterDelete',
        email: `e2e-after-${Date.now()}@example.com`,
      },
    })
    expect(leadAfterDeleteRes.status()).toBe(401)
  })
})
