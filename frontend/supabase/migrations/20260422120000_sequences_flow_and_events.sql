-- Sequences: persisted flow graph, enrollment node tracking, step-level analytics events.

ALTER TABLE public.email_sequences
  ADD COLUMN IF NOT EXISTS flow_definition jsonb DEFAULT NULL;

COMMENT ON COLUMN public.email_sequences.flow_definition IS
  'React-flow style graph: { "flowVersion": 2, "nodes": [...], "edges": [...] }. Legacy sequences use steps[] only; app derives graph when null.';

ALTER TABLE public.sequence_enrollments
  ADD COLUMN IF NOT EXISTS current_node_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ab_variant text DEFAULT NULL;

COMMENT ON COLUMN public.sequence_enrollments.current_node_id IS
  'Active node id inside flow_definition when set; legacy enrollments use current_step index only.';
COMMENT ON COLUMN public.sequence_enrollments.ab_variant IS
  'When enrolled contact is on an ab_split branch: a | b.';

CREATE TABLE IF NOT EXISTS public.sequence_step_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sequence_id     uuid        NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  enrollment_id   uuid        REFERENCES public.sequence_enrollments(id) ON DELETE SET NULL,
  node_id         text        NOT NULL,
  event_type      text        NOT NULL,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS sequence_step_events_sequence_idx
  ON public.sequence_step_events (sequence_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sequence_step_events_enrollment_idx
  ON public.sequence_step_events (enrollment_id, created_at DESC);

COMMENT ON TABLE public.sequence_step_events IS
  'Append-only analytics for sequence nodes (entered_step, email_sent, open, click, reply, etc.). Ingestion wired when send pipeline attaches sequence metadata.';

ALTER TABLE public.sequence_step_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_read_sequence_step_events" ON public.sequence_step_events;
DROP POLICY IF EXISTS "org_write_sequence_step_events" ON public.sequence_step_events;

CREATE POLICY "org_read_sequence_step_events"
  ON public.sequence_step_events FOR SELECT
  USING (organization_id = public.get_org_id());

CREATE POLICY "org_write_sequence_step_events"
  ON public.sequence_step_events FOR ALL
  USING (organization_id = public.get_org_id())
  WITH CHECK (organization_id = public.get_org_id());
