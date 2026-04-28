/**
 * Placeholder: automatic sequence execution is not implemented yet.
 * Schedulers should treat HTTP 501 as "not implemented" (do not assume success).
 * See docs/sequences-flow.md (Execution worker section).
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  return new Response(
    JSON.stringify({
      ok: false,
      error: 'not_implemented',
      message:
        'sequence-advance: implement enrollment traversal, sends (SequenceStep.emailThreadMode, last_sent_* ids), stop_on_contact_reply, and sequence_step_events; then return 200.',
    }),
    { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
