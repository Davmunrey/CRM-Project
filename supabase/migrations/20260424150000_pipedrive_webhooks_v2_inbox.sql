-- Pipedrive Webhooks v2 ingress + processing queue + governance controls.

CREATE TABLE IF NOT EXISTS public.pipedrive_webhook_ingest (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  received_at         timestamptz NOT NULL DEFAULT now(),
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pd_event_id         text NOT NULL,
  correlation_id      text,
  webhook_id          text,
  event_key           text NOT NULL,
  action              text NOT NULL,
  entity              text NOT NULL,
  entity_id           text,
  attempt             integer NOT NULL DEFAULT 1 CHECK (attempt >= 1),
  occurred_at         timestamptz,
  data                jsonb,
  previous            jsonb,
  meta                jsonb NOT NULL DEFAULT '{}'::jsonb,
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'ignored', 'failed')),
  governance_decision text CHECK (governance_decision IN ('forward', 'skip')),
  governance_reason   text,
  process_attempts    integer NOT NULL DEFAULT 0 CHECK (process_attempts >= 0),
  next_retry_at       timestamptz,
  processed_at        timestamptz,
  last_error          text,
  UNIQUE (organization_id, pd_event_id)
);

CREATE INDEX IF NOT EXISTS idx_pd_ingest_pending
  ON public.pipedrive_webhook_ingest (status, next_retry_at, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_pd_ingest_org_created
  ON public.pipedrive_webhook_ingest (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.integration_entity_governance (
  organization_id      uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  deal_source          text NOT NULL DEFAULT 'pipedrive' CHECK (deal_source IN ('pipedrive', 'crm_pro')),
  person_source        text NOT NULL DEFAULT 'pipedrive' CHECK (person_source IN ('pipedrive', 'crm_pro')),
  organization_source  text NOT NULL DEFAULT 'pipedrive' CHECK (organization_source IN ('pipedrive', 'crm_pro')),
  activity_source      text NOT NULL DEFAULT 'pipedrive' CHECK (activity_source IN ('pipedrive', 'crm_pro')),
  lead_source          text NOT NULL DEFAULT 'pipedrive' CHECK (lead_source IN ('pipedrive', 'crm_pro'))
);

CREATE TABLE IF NOT EXISTS public.integration_event_dispatch (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source           text NOT NULL,
  source_event_id  uuid NOT NULL REFERENCES public.pipedrive_webhook_ingest(id) ON DELETE CASCADE,
  target           text NOT NULL DEFAULT 'crm_pro',
  event_key        text NOT NULL,
  entity           text NOT NULL,
  entity_id        text,
  correlation_id   text,
  payload          jsonb NOT NULL,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts         integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_retry_at    timestamptz,
  last_error       text,
  processed_at     timestamptz,
  UNIQUE (source, source_event_id, target)
);

CREATE INDEX IF NOT EXISTS idx_integration_dispatch_pending
  ON public.integration_event_dispatch (status, next_retry_at, created_at)
  WHERE status = 'pending';

ALTER TABLE public.pipedrive_webhook_ingest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_entity_governance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_event_dispatch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_entity_governance_select_org"
  ON public.integration_entity_governance FOR SELECT
  USING (organization_id = public.get_org_id());

CREATE POLICY "integration_entity_governance_insert_privileged"
  ON public.integration_entity_governance FOR INSERT
  WITH CHECK (
    organization_id = public.get_org_id()
    AND public.get_user_role() IN ('admin', 'owner', 'manager')
  );

CREATE POLICY "integration_entity_governance_update_privileged"
  ON public.integration_entity_governance FOR UPDATE
  USING (
    organization_id = public.get_org_id()
    AND public.get_user_role() IN ('admin', 'owner', 'manager')
  );

DROP TRIGGER IF EXISTS set_updated_at_integration_entity_governance ON public.integration_entity_governance;
CREATE TRIGGER set_updated_at_integration_entity_governance
  BEFORE UPDATE ON public.integration_entity_governance
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.integration_entity_governance TO authenticated;
GRANT ALL ON public.pipedrive_webhook_ingest TO service_role;
GRANT ALL ON public.integration_entity_governance TO service_role;
GRANT ALL ON public.integration_event_dispatch TO service_role;
REVOKE ALL ON TABLE public.pipedrive_webhook_ingest FROM authenticated;
REVOKE ALL ON TABLE public.integration_event_dispatch FROM authenticated;

COMMENT ON TABLE public.pipedrive_webhook_ingest IS 'Raw Pipedrive Webhooks v2 events (idempotency on organization_id + pd_event_id).';
COMMENT ON TABLE public.integration_entity_governance IS 'Entity source-of-truth settings used to prevent integration loops.';
COMMENT ON TABLE public.integration_event_dispatch IS 'Normalized integration events queued for downstream processors (iPaaS/ERP/internal workers).';
