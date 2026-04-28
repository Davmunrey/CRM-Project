/**
 * DSR / data-export request (authenticated).
 * Supports async export jobs (`format=zip`) and inline summary fallback.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeadersForRequest, isCorsOriginBlocked } from '../_shared/cors-allowlist.ts'
import { captureEdgeException } from '../_shared/sentryEdge.ts'
import { jsonResponse, jsonError } from '../_shared/edgeHttp.ts'

Deno.serve(async (req) => {
  if (isCorsOriginBlocked(req)) {
    return new Response('Forbidden', { status: 403 })
  }
  const cors = corsHeadersForRequest(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405, cors)
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) {
    return jsonError('Unauthorized', 401, cors)
  }

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  try {
    const body = await req.json().catch(() => ({})) as { format?: 'zip' | 'json'; async?: boolean }
    const orgId =
      (user.app_metadata?.organization_id as string | undefined) ??
      (user.user_metadata?.org_id as string | undefined) ??
      (user.user_metadata?.organization_id as string | undefined)
    if (!orgId) {
      return jsonResponse(
        { ok: true, message: 'No organization in profile; nothing to export yet.', user_id: user.id },
        200,
        cors,
      )
    }
    const [{ count: contactCount }, { count: companyCount }, { count: dealCount }] = await Promise.all([
      admin.from('contacts').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      admin.from('companies').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      admin.from('deals').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    ])
    const summary = { contacts: contactCount ?? 0, companies: companyCount ?? 0, deals: dealCount ?? 0 }
    const format = body.format ?? 'zip'
    if (format === 'zip' || body.async) {
      const { data: job, error: jobErr } = await admin
        .from('data_export_jobs')
        .insert({
          organization_id: orgId,
          user_id: user.id,
          format: 'zip',
          status: 'queued',
        })
        .select('id,status,created_at')
        .single()
      if (jobErr) throw jobErr
      return jsonResponse({
        ok: true,
        organization_id: orgId,
        summary,
        job,
        note: 'ZIP export job queued. Worker should generate CSV bundle and upload to Storage.',
      }, 202, cors)
    }
    return jsonResponse(
      {
        ok: true,
        organization_id: orgId,
        generated_at: new Date().toISOString(),
        summary,
        note: 'JSON summary export completed.',
      },
      200,
      cors,
    )
  } catch (e) {
    captureEdgeException(e, { function: 'data-export' })
    return jsonError((e as Error).message, 500, cors)
  }
})
