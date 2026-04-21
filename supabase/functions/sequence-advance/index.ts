/**
 * Stub for future sequence execution: advance active enrollments along `flow_definition`.
 * Deploy with `supabase functions deploy sequence-advance` and invoke on a schedule (pg_cron, external worker).
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
      ok: true,
      message:
        'sequence-advance stub: implement enrollment traversal, sends (respect SequenceStep.emailThreadMode and enrollment last_sent_* ids), stop_on_contact_reply / markEnrollmentReplied on inbound reply, and sequence_step_events before scheduling this function.',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
