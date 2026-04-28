export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonOrPublishableKey =
    process.env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !anonOrPublishableKey) {
    res.status(500).json({ error: 'Supabase env vars missing in Vercel runtime' })
    return
  }

  const body = req.body ?? {}
  const payload = {
    redirect_uri: body.redirect_uri,
    bundle: body.bundle,
  }

  try {
    const upstream = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/functions/v1/google-oauth-start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonOrPublishableKey,
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    })

    const text = await upstream.text()
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to proxy google-oauth-start request'
    res.status(502).json({ error: message })
  }
}
