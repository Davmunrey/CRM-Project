-- Outbound webhooks: subscriptions, signing secrets, outbox, delivery log.
-- Triggers enqueue domain events when org has ≥1 enabled subscription.

-- ─── Subscriptions (no secret column — secrets in sibling table) ───────────────
CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name                text NOT NULL,
  target_url          text NOT NULL,
  enabled             boolean NOT NULL DEFAULT true,
  event_filters       text[] NOT NULL DEFAULT ARRAY['*']::text[],
  custom_headers      jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version      smallint NOT NULL DEFAULT 1,
  last_delivery_at    timestamptz,
  last_http_status    integer,
  last_delivery_error text,
  CONSTRAINT webhook_subscriptions_https CHECK (target_url ~ '^https://')
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_org
  ON public.webhook_subscriptions (organization_id) WHERE enabled = true;

CREATE TABLE IF NOT EXISTS public.webhook_subscription_secrets (
  subscription_id uuid PRIMARY KEY REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  signing_secret  text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.webhook_outbox (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_key          text NOT NULL,
  entity_type        text NOT NULL,
  entity_id          uuid NOT NULL,
  payload            jsonb NOT NULL,
  previous           jsonb,
  actor_user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts           integer NOT NULL DEFAULT 0,
  next_retry_at      timestamptz,
  last_error         text
);

CREATE INDEX IF NOT EXISTS idx_webhook_outbox_pending
  ON public.webhook_outbox (status, next_retry_at, created_at)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.webhook_delivery_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  outbox_id        uuid NOT NULL REFERENCES public.webhook_outbox(id) ON DELETE CASCADE,
  subscription_id  uuid NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  attempt          integer NOT NULL DEFAULT 1,
  http_status      integer,
  duration_ms      integer,
  error_message      text
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_log_sub
  ON public.webhook_delivery_log (subscription_id, created_at DESC);

-- ─── RLS: subscriptions (org-scoped; admin/owner/manager mutate) ─────────────
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_subscription_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_subscriptions_select_org"
  ON public.webhook_subscriptions FOR SELECT
  USING (organization_id = public.get_org_id());

-- Inserts use service_role via Edge Function `webhook-subscriptions` (signing secret never touches anon client).

CREATE POLICY "webhook_subscriptions_update_privileged"
  ON public.webhook_subscriptions FOR UPDATE
  USING (
    organization_id = public.get_org_id()
    AND public.get_user_role() IN ('admin', 'owner', 'manager')
  );

CREATE POLICY "webhook_subscriptions_delete_privileged"
  ON public.webhook_subscriptions FOR DELETE
  USING (
    organization_id = public.get_org_id()
    AND public.get_user_role() IN ('admin', 'owner', 'manager')
  );

-- Secrets: no policies for authenticated — only service_role (bypasses RLS).

-- Outbox / delivery log: no client policies (worker uses service_role only).

-- ─── Helper: org has enabled webhook subscription ────────────────────────────
CREATE OR REPLACE FUNCTION public.webhook_org_has_enabled_subscriptions(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.webhook_subscriptions s
    WHERE s.organization_id = p_org
      AND s.enabled = true
  );
$$;

-- ─── Generic enqueue (SECURITY DEFINER so RLS on outbox does not block) ───────
CREATE OR REPLACE FUNCTION public.webhook_enqueue_event(
  p_org uuid,
  p_event_key text,
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb,
  p_previous jsonb,
  p_actor uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_org IS NULL THEN
    RETURN;
  END IF;
  IF NOT public.webhook_org_has_enabled_subscriptions(p_org) THEN
    RETURN;
  END IF;
  INSERT INTO public.webhook_outbox (
    organization_id, event_key, entity_type, entity_id, payload, previous, actor_user_id
  ) VALUES (
    p_org, p_event_key, p_entity_type, p_entity_id, p_payload, p_previous, p_actor
  );
END;
$$;

-- ─── Triggers: deals ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.webhook_trg_deals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_action text;
  v_payload jsonb;
  v_prev jsonb;
  v_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_org := OLD.organization_id;
    v_action := 'deleted';
    v_payload := to_jsonb(OLD);
    v_prev := NULL;
    v_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_org := NEW.organization_id;
    v_action := 'updated';
    v_payload := to_jsonb(NEW);
    v_prev := to_jsonb(OLD);
    v_id := NEW.id;
  ELSE
    v_org := NEW.organization_id;
    v_action := 'created';
    v_payload := to_jsonb(NEW);
    v_prev := NULL;
    v_id := NEW.id;
  END IF;
  PERFORM public.webhook_enqueue_event(
    v_org, 'deal.' || v_action, 'deal', v_id, v_payload, v_prev, auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS webhook_deals_aiud ON public.deals;
CREATE TRIGGER webhook_deals_aiud
  AFTER INSERT OR UPDATE OR DELETE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.webhook_trg_deals();

-- ─── Contacts ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.webhook_trg_contacts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_action text;
  v_payload jsonb;
  v_prev jsonb;
  v_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_org := OLD.organization_id;
    v_action := 'deleted';
    v_payload := to_jsonb(OLD);
    v_prev := NULL;
    v_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_org := NEW.organization_id;
    v_action := 'updated';
    v_payload := to_jsonb(NEW);
    v_prev := to_jsonb(OLD);
    v_id := NEW.id;
  ELSE
    v_org := NEW.organization_id;
    v_action := 'created';
    v_payload := to_jsonb(NEW);
    v_prev := NULL;
    v_id := NEW.id;
  END IF;
  PERFORM public.webhook_enqueue_event(
    v_org, 'contact.' || v_action, 'contact', v_id, v_payload, v_prev, auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS webhook_contacts_aiud ON public.contacts;
CREATE TRIGGER webhook_contacts_aiud
  AFTER INSERT OR UPDATE OR DELETE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.webhook_trg_contacts();

-- ─── Companies ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.webhook_trg_companies()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_action text;
  v_payload jsonb;
  v_prev jsonb;
  v_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_org := OLD.organization_id;
    v_action := 'deleted';
    v_payload := to_jsonb(OLD);
    v_prev := NULL;
    v_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_org := NEW.organization_id;
    v_action := 'updated';
    v_payload := to_jsonb(NEW);
    v_prev := to_jsonb(OLD);
    v_id := NEW.id;
  ELSE
    v_org := NEW.organization_id;
    v_action := 'created';
    v_payload := to_jsonb(NEW);
    v_prev := NULL;
    v_id := NEW.id;
  END IF;
  PERFORM public.webhook_enqueue_event(
    v_org, 'company.' || v_action, 'company', v_id, v_payload, v_prev, auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS webhook_companies_aiud ON public.companies;
CREATE TRIGGER webhook_companies_aiud
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.webhook_trg_companies();

-- ─── Activities ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.webhook_trg_activities()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_action text;
  v_payload jsonb;
  v_prev jsonb;
  v_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_org := OLD.organization_id;
    v_action := 'deleted';
    v_payload := to_jsonb(OLD);
    v_prev := NULL;
    v_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_org := NEW.organization_id;
    v_action := 'updated';
    v_payload := to_jsonb(NEW);
    v_prev := to_jsonb(OLD);
    v_id := NEW.id;
  ELSE
    v_org := NEW.organization_id;
    v_action := 'created';
    v_payload := to_jsonb(NEW);
    v_prev := NULL;
    v_id := NEW.id;
  END IF;
  PERFORM public.webhook_enqueue_event(
    v_org, 'activity.' || v_action, 'activity', v_id, v_payload, v_prev, auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS webhook_activities_aiud ON public.activities;
CREATE TRIGGER webhook_activities_aiud
  AFTER INSERT OR UPDATE OR DELETE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.webhook_trg_activities();

DROP TRIGGER IF EXISTS set_updated_at ON public.webhook_subscriptions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.webhook_subscriptions IS 'Outbound HTTPS webhook subscriptions per org (signing secret in webhook_subscription_secrets).';
COMMENT ON TABLE public.webhook_outbox IS 'Queued CRM events for webhook-worker Edge Function (service_role).';

-- Privileges: org members read/update/delete subscriptions (no INSERT from JWT — Edge only).
GRANT SELECT, UPDATE, DELETE ON public.webhook_subscriptions TO authenticated;
GRANT ALL ON public.webhook_subscriptions TO service_role;
GRANT ALL ON public.webhook_subscription_secrets TO service_role;
GRANT ALL ON public.webhook_outbox TO service_role;
GRANT ALL ON public.webhook_delivery_log TO service_role;
REVOKE ALL ON TABLE public.webhook_outbox FROM authenticated;
REVOKE ALL ON TABLE public.webhook_delivery_log FROM authenticated;
REVOKE ALL ON TABLE public.webhook_subscription_secrets FROM authenticated;
