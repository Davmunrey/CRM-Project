const baseUrl = (process.env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
const anonKey = (process.env.SUPABASE_ANON_KEY ?? '').trim()

if (!baseUrl || !anonKey) {
  console.error('[google-smoke] Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  process.exit(1)
}

const checks = [
  { name: 'google-oauth-start', method: 'POST', body: {} },
  { name: 'google-integration-status', method: 'POST', body: {} },
  { name: 'gmail-oauth-exchange', method: 'POST', body: {} },
  { name: 'gmail-refresh-token', method: 'POST', body: {} },
  { name: 'gmail-disconnect', method: 'POST', body: {} },
]

const allowedStatuses = new Set([200, 400, 401, 403, 405])

async function runCheck(check) {
  const url = `${baseUrl}/functions/v1/${check.name}`
  const res = await fetch(url, {
    method: check.method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(check.body),
  })

  let text = ''
  try {
    text = await res.text()
  } catch {
    text = ''
  }

  const sample = text.slice(0, 220).replace(/\s+/g, ' ').trim()
  const ok = allowedStatuses.has(res.status)
  const line = `[google-smoke] ${check.name} -> ${res.status}${sample ? ` :: ${sample}` : ''}`
  if (ok) {
    console.log(line)
    return
  }
  console.error(line)
  throw new Error(`Unexpected status for ${check.name}: ${res.status}`)
}

for (const check of checks) {
  await runCheck(check)
}

console.log('[google-smoke] All Google/Gmail Edge endpoints are reachable')
