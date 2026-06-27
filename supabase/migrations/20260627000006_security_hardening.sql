-- Propel — Security hardening + missing RLS policies (addresses Supabase
-- security advisors after the initial schema rollout).
--
-- 1. Pin search_path on SQL helper functions (function_search_path_mutable).
-- 2. Revoke direct EXECUTE on the handle_new_user trigger function from API
--    roles — it is a trigger, never an RPC, and SECURITY DEFINER RPCs callable
--    by anon are an attack surface (anon_security_definer_function_executable).
-- 3. Add the org/user RLS policies that were missing on a handful of
--    user-facing tables (they had RLS enabled but no policy, so PostgREST
--    returned nothing for authenticated users). Sensitive, server-only tables
--    (gmail_tokens, org_smtp_settings, webhook secrets, tracking, sync infra,
--    impersonation_logs) are intentionally left deny-all — only the service
--    role (edge functions) touches them.

-- 1. search_path hardening (everything referenced is already schema-qualified) --
CREATE OR REPLACE FUNCTION public.jwt_org_id()
RETURNS uuid LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT NULLIF(auth.jwt()->>'org_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS text LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT COALESCE(NULLIF(auth.jwt()->>'app_role', ''), 'viewer');
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(org uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT org IS NOT NULL AND org = public.jwt_org_id();
$$;

-- 2. handle_new_user is a trigger, not an RPC: remove API-role EXECUTE --
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 3. Org-scoped policies for user-facing UI tables (reuse the existing helper) --
SELECT public.apply_org_rls('public.distribution_lists'::regclass);
SELECT public.apply_org_rls('public.inbox_views'::regclass);
SELECT public.apply_org_rls('public.smart_views'::regclass);

-- user_preferences is per-user (no organization_id): owner-only access --
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_user_preferences_self ON public.user_preferences;
CREATE POLICY rls_user_preferences_self ON public.user_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
