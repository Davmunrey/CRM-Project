-- Webhook DELETE payloads: Pipedrive-style (data null on delete, previous = last state).
-- Organization API keys + lead capture tokens.

CREATE OR REPLACE FUNCTION public.webhook_trg_deals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_action text; v_payload jsonb; v_prev jsonb; v_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN v_org := OLD.organization_id; v_action := 'deleted'; v_payload := 'null'::jsonb; v_prev := to_jsonb(OLD); v_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN v_org := NEW.organization_id; v_action := 'updated'; v_payload := to_jsonb(NEW); v_prev := to_jsonb(OLD); v_id := NEW.id;
  ELSE v_org := NEW.organization_id; v_action := 'created'; v_payload := to_jsonb(NEW); v_prev := NULL; v_id := NEW.id; END IF;
  PERFORM public.webhook_enqueue_event(v_org, 'deal.' || v_action, 'deal', v_id, v_payload, v_prev, auth.uid());
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.webhook_trg_contacts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_action text; v_payload jsonb; v_prev jsonb; v_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN v_org := OLD.organization_id; v_action := 'deleted'; v_payload := 'null'::jsonb; v_prev := to_jsonb(OLD); v_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN v_org := NEW.organization_id; v_action := 'updated'; v_payload := to_jsonb(NEW); v_prev := to_jsonb(OLD); v_id := NEW.id;
  ELSE v_org := NEW.organization_id; v_action := 'created'; v_payload := to_jsonb(NEW); v_prev := NULL; v_id := NEW.id; END IF;
  PERFORM public.webhook_enqueue_event(v_org, 'contact.' || v_action, 'contact', v_id, v_payload, v_prev, auth.uid());
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.webhook_trg_companies()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_action text; v_payload jsonb; v_prev jsonb; v_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN v_org := OLD.organization_id; v_action := 'deleted'; v_payload := 'null'::jsonb; v_prev := to_jsonb(OLD); v_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN v_org := NEW.organization_id; v_action := 'updated'; v_payload := to_jsonb(NEW); v_prev := to_jsonb(OLD); v_id := NEW.id;
  ELSE v_org := NEW.organization_id; v_action := 'created'; v_payload := to_jsonb(NEW); v_prev := NULL; v_id := NEW.id; END IF;
  PERFORM public.webhook_enqueue_event(v_org, 'company.' || v_action, 'company', v_id, v_payload, v_prev, auth.uid());
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.webhook_trg_activities()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_action text; v_payload jsonb; v_prev jsonb; v_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN v_org := OLD.organization_id; v_action := 'deleted'; v_payload := 'null'::jsonb; v_prev := to_jsonb(OLD); v_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN v_org := NEW.organization_id; v_action := 'updated'; v_payload := to_jsonb(NEW); v_prev := to_jsonb(OLD); v_id := NEW.id;
  ELSE v_org := NEW.organization_id; v_action := 'created'; v_payload := to_jsonb(NEW); v_prev := NULL; v_id := NEW.id; END IF;
  PERFORM public.webhook_enqueue_event(v_org, 'activity.' || v_action, 'activity', v_id, v_payload, v_prev, auth.uid());
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TABLE IF NOT EXISTS public.organization_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_api_keys_hash ON public.organization_api_keys (key_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_organization_api_keys_org ON public.organization_api_keys (organization_id);
COMMENT ON TABLE public.organization_api_keys IS 'Org-scoped API keys (SHA-256 hex of full key only).';
ALTER TABLE public.organization_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organization_api_keys_select_org" ON public.organization_api_keys FOR SELECT USING (organization_id = public.get_org_id());
CREATE POLICY "organization_api_keys_delete_privileged" ON public.organization_api_keys FOR DELETE USING (organization_id = public.get_org_id() AND public.get_user_role() IN ('admin', 'owner', 'manager'));
GRANT SELECT, DELETE ON public.organization_api_keys TO authenticated;

CREATE TABLE IF NOT EXISTS public.lead_capture_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  label text NOT NULL DEFAULT 'Website form',
  token_hash text NOT NULL,
  enabled boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_capture_tokens_hash ON public.lead_capture_tokens (token_hash) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_lead_capture_tokens_org ON public.lead_capture_tokens (organization_id);
COMMENT ON TABLE public.lead_capture_tokens IS 'Hashed tokens for lead-capture Edge Function.';
ALTER TABLE public.lead_capture_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_capture_tokens_select_org" ON public.lead_capture_tokens FOR SELECT USING (organization_id = public.get_org_id());
CREATE POLICY "lead_capture_tokens_delete_privileged" ON public.lead_capture_tokens FOR DELETE USING (organization_id = public.get_org_id() AND public.get_user_role() IN ('admin', 'owner', 'manager'));
GRANT SELECT, DELETE ON public.lead_capture_tokens TO authenticated;

CREATE INDEX IF NOT EXISTS idx_webhook_outbox_org_failed ON public.webhook_outbox (organization_id, created_at DESC) WHERE status = 'failed';