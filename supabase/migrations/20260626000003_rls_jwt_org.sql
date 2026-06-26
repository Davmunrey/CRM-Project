-- Propel — Row Level Security using JWT org_id claim (Supabase PostgREST / client)

CREATE OR REPLACE FUNCTION public.jwt_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(auth.jwt()->>'org_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt()->>'role', auth.jwt()->>'app_role', 'viewer');
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT org IS NOT NULL AND org = public.jwt_org_id();
$$;

-- Helper: apply org-scoped RLS to a table with organization_id column
CREATE OR REPLACE FUNCTION public.apply_org_rls(table_name regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  pol text := 'rls_' || table_name::text || '_org_jwt';
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol, table_name);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR ALL TO authenticated USING (organization_id = public.jwt_org_id()) WITH CHECK (organization_id = public.jwt_org_id())',
    pol,
    table_name
  );
END;
$$;

-- Tenant-scoped tables (organization_id column)
SELECT public.apply_org_rls('profiles'::regclass);
SELECT public.apply_org_rls('invitations'::regclass);
SELECT public.apply_org_rls('companies'::regclass);
SELECT public.apply_org_rls('contacts'::regclass);
SELECT public.apply_org_rls('deals'::regclass);
SELECT public.apply_org_rls('activities'::regclass);
SELECT public.apply_org_rls('notifications'::regclass);
SELECT public.apply_org_rls('audit_log'::regclass);
SELECT public.apply_org_rls('products'::regclass);
SELECT public.apply_org_rls('email_templates'::regclass);
SELECT public.apply_org_rls('quick_replies'::regclass);
SELECT public.apply_org_rls('sales_goals'::regclass);
SELECT public.apply_org_rls('automation_rules'::regclass);
SELECT public.apply_org_rls('automation_executions'::regclass);
SELECT public.apply_org_rls('email_sequences'::regclass);
SELECT public.apply_org_rls('sequence_enrollments'::regclass);
SELECT public.apply_org_rls('custom_field_definitions'::regclass);
SELECT public.apply_org_rls('custom_field_values'::regclass);
SELECT public.apply_org_rls('custom_field_definition_i18n'::regclass);
SELECT public.apply_org_rls('leads'::regclass);
SELECT public.apply_org_rls('lead_events'::regclass);
SELECT public.apply_org_rls('lead_score_snapshots'::regclass);
SELECT public.apply_org_rls('lead_scoring_rules'::regclass);

-- Tables added in later migrations (ignore if not yet created)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'item_updates', 'tickets', 'booking_pages', 'bookings',
    'ai_conversations', 'ai_messages', 'ai_usage_log',
    'pipelines', 'pipeline_stages', 'gmail_threads', 'gmail_messages',
    'calendar_events', 'webhook_endpoints', 'webhook_deliveries',
    'api_keys', 'lead_capture_tokens', 'ux_metric_events',
    'org_branding', 'subscriptions', 'plans', 'user_dashboards',
    'lead_form_configs', 'security_events', 'mfa_devices'
  ]
  LOOP
    -- Only apply the org-scoped policy to tables that actually have an
    -- organization_id column. Global/catalog tables (e.g. `plans`) live in this
    -- list for forward-compat but are not tenant-scoped — applying org RLS to
    -- them would raise "column organization_id does not exist" and abort push.
    IF to_regclass('public.' || t) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t AND column_name = 'organization_id'
       ) THEN
      PERFORM public.apply_org_rls(('public.' || t)::regclass);
    END IF;
  END LOOP;
END $$;

-- Plans: a global catalog with no organization_id. Enable RLS (it lives in the
-- API-exposed `public` schema) but allow any authenticated user to read it;
-- writes are reserved for the service role, which bypasses RLS.
DO $$
BEGIN
  IF to_regclass('public.plans') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS rls_plans_read ON public.plans';
    EXECUTE 'CREATE POLICY rls_plans_read ON public.plans FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- Profiles: users can read/update their own row; org members see teammates
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_profiles_self ON profiles;
CREATE POLICY rls_profiles_self ON profiles
  FOR ALL TO authenticated
  USING (id = auth.uid() OR organization_id = public.jwt_org_id())
  WITH CHECK (id = auth.uid() OR (organization_id = public.jwt_org_id() AND public.jwt_role() IN ('owner', 'admin')));

-- Organizations: readable by members
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_organizations_member ON organizations;
CREATE POLICY rls_organizations_member ON organizations
  FOR SELECT TO authenticated
  USING (id = public.jwt_org_id());

DROP POLICY IF EXISTS rls_organizations_admin ON organizations;
CREATE POLICY rls_organizations_admin ON organizations
  FOR UPDATE TO authenticated
  USING (id = public.jwt_org_id() AND public.jwt_role() IN ('owner', 'admin'))
  WITH CHECK (id = public.jwt_org_id() AND public.jwt_role() IN ('owner', 'admin'));
