-- Org directory: expose member email + display name to peers in the same workspace.
-- RLS on organization_members does not include auth.users; this RPC joins under
-- SECURITY DEFINER and scopes rows to JWT organization_id via get_org_id().

CREATE OR REPLACE FUNCTION public.list_organization_members_with_identity()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  member_role text,
  job_title text,
  phone text,
  avatar_url text,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    om.user_id,
    au.email::text,
    COALESCE(
      NULLIF(trim(au.raw_user_meta_data->>'full_name'), ''),
      split_part(au.email::text, '@', 1)
    ) AS full_name,
    om.role::text AS member_role,
    om.job_title,
    om.phone,
    om.avatar_url,
    om.is_active,
    om.created_at
  FROM public.organization_members om
  INNER JOIN auth.users au ON au.id = om.user_id
  WHERE om.organization_id = public.get_org_id();
$$;

REVOKE ALL ON FUNCTION public.list_organization_members_with_identity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_organization_members_with_identity() TO authenticated;

COMMENT ON FUNCTION public.list_organization_members_with_identity() IS
  'Returns same-org members with email and display name; scoped by JWT app_metadata.organization_id.';
