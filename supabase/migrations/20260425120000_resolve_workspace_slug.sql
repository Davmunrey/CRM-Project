-- Public slug → organization lookup for multi-tenant workspace URLs (e.g. acme.crm.example.com).
-- organizations.domain stores the canonical slug from create_org_self_service.

CREATE OR REPLACE FUNCTION public.resolve_workspace_slug(p_slug text)
RETURNS TABLE (
  id uuid,
  name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name
  FROM public.organizations o
  WHERE lower(btrim(o.domain)) = lower(btrim(p_slug))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_workspace_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_workspace_slug(text) TO anon, authenticated;
