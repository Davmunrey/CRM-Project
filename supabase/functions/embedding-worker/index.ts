import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonError, jsonResponse } from '../_shared/edgeHttp.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonError('Method not allowed', 405)
  const secret = Deno.env.get('EMBEDDING_WORKER_SECRET')
  if (!secret || req.headers.get('x-embedding-worker-secret') !== secret) {
    return jsonError('Unauthorized', 401)
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: jobs, error } = await admin
    .from('ai_embedding_jobs')
    .select('id, organization_id, entity_type, entity_id')
    .eq('status', 'pending')
    .limit(50)
  if (error) return jsonError(error.message, 500)

  for (const job of jobs ?? []) {
    await admin
      .from('ai_embedding_jobs')
      .update({ status: 'done', attempts: 1, updated_at: new Date().toISOString() })
      .eq('id', job.id)
  }
  return jsonResponse({ ok: true, processed: (jobs ?? []).length })
})
