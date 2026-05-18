/**
 * Operator/cron: hard-delete rows that have been soft-deleted longer than RETENTION_DAYS.
 * Auth: header `x-purge-secret` must match env PURGE_SOFT_DELETED_SECRET.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { edgeLog, getRequestId } from '../_shared/requestLog.ts'
import { jsonError, jsonResponse } from '../_shared/edgeHttp.ts'
import { getServiceRoleKey } from '../_shared/supabase-keys.ts'

const TABLES = ['contacts', 'companies', 'deals', 'activities', 'leads'] as const

Deno.serve(async (req) => {
  const request_id = getRequestId(req)
  const secret = Deno.env.get('PURGE_SOFT_DELETED_SECRET')?.trim()
  if (!secret) {
    return jsonError('Purge not configured', 501)
  }
  const hdr = req.headers.get('x-purge-secret') ?? ''
  if (req.method !== 'POST' || hdr !== secret) {
    return jsonError('Unauthorized', 401)
  }

  const days = Math.max(1, Math.min(3650, Number(Deno.env.get('PURGE_RETENTION_DAYS') ?? '90') || 90))
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()

  const url = Deno.env.get('SUPABASE_URL')!
  const key = getServiceRoleKey()
  const admin = createClient(url, key)

  const report: Record<string, number> = {}
  try {
    for (const t of TABLES) {
      const { data, error } = await admin
        .from(t)
        .delete()
        .not('deleted_at', 'is', null)
        .lt('deleted_at', cutoff)
        .select('id')
      if (error) throw error
      report[t] = Array.isArray(data) ? data.length : 0
    }
    edgeLog({
      function: 'purge-soft-deleted',
      level: 'info',
      msg: 'purged',
      request_id,
      days,
      cutoff,
      report,
    })
    return jsonResponse({ ok: true, request_id, days, cutoff, deleted_approx: report })
  } catch (e) {
    edgeLog({
      function: 'purge-soft-deleted',
      level: 'error',
      msg: (e as Error).message,
      request_id,
    })
    return jsonError((e as Error).message, 500)
  }
})
