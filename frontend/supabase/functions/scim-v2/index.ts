import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonError, jsonResponse, sha256Hex } from '../_shared/edgeHttp.ts'
import { getServiceRoleKey } from '../_shared/supabase-keys.ts'

function bearer(req: Request): string {
  const auth = req.headers.get('authorization') ?? ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() ?? ''
}

Deno.serve(async (req) => {
  const token = bearer(req)
  if (!token) return jsonError('Unauthorized', 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, getServiceRoleKey())
  const tokenHash = await sha256Hex(token)
  const { data: scimToken } = await admin
    .from('organization_scim_tokens')
    .select('organization_id')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .maybeSingle()
  if (!scimToken) return jsonError('Unauthorized', 401)

  const url = new URL(req.url)
  const path = url.pathname.toLowerCase()
  if (path.endsWith('/users') && req.method === 'GET') {
    return jsonResponse({ Resources: [], totalResults: 0, startIndex: 1, itemsPerPage: 0 })
  }
  if (path.endsWith('/groups') && req.method === 'GET') {
    return jsonResponse({ Resources: [], totalResults: 0, startIndex: 1, itemsPerPage: 0 })
  }
  return jsonError('Not implemented', 501)
})
