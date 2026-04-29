import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonError, jsonResponse } from '../_shared/edgeHttp.ts'
import { edgeLog, getRequestId } from '../_shared/requestLog.ts'
import { rateLimitHit } from '../_shared/rateLimit.ts'
import { withTraceLog } from '../_shared/tracing.ts'
import { getAnonKey } from '../_shared/supabase-keys.ts'

type Action = 'summarizeThread' | 'draftReply' | 'nextBestAction' | 'semanticSearch'

Deno.serve(async (req) => withTraceLog(req, async (trace) => {
  const request_id = getRequestId(req)
  if (req.method !== 'POST') return jsonError('Method not allowed', 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = getAnonKey()
  const client = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await client.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const key = `ai:${user.id}`
  if (rateLimitHit(key, 20, 60_000)) return jsonError('Rate limited', 429)

  const body = await req.json().catch(() => ({})) as { action?: Action; payload?: Record<string, unknown> }
  const action = body.action
  if (!action) return jsonError('action is required', 400)

  // Phase-2 baseline: wiring endpoint + audit surface; provider/model execution comes in W11 hardening.
  edgeLog({
    function: 'ai-orchestrator',
    level: 'info',
    msg: 'ai_request_stub',
    request_id,
    action,
    user_id: user.id,
    traceparent: trace.traceparent,
  })
  return jsonResponse({
    ok: true,
    request_id,
    action,
    result: { message: 'AI orchestration scaffold ready; provider execution pending final model routing.' },
  })
}))
