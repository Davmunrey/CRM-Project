-- Propel — Tenant bootstrap: atomic organization creation for new users.
--
-- A freshly-registered user has profiles.organization_id = NULL and a JWT whose
-- org_id claim is NULL, so the org-scoped RLS policies block a direct INSERT
-- into `organizations` (RLS is enabled but there is no INSERT policy), and even
-- if one existed the post-insert RETURNING would be filtered out by the SELECT
-- policy (id = jwt_org_id(), still NULL).
--
-- This SECURITY DEFINER function performs the whole bootstrap atomically and
-- returns the new organization regardless of RLS. The client must then call
-- supabase.auth.refreshSession() so the custom access-token hook re-issues a JWT
-- carrying the freshly-assigned org_id claim.

CREATE OR REPLACE FUNCTION public.create_organization(org_name text, org_slug text)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid          uuid := auth.uid();
  base_slug    text;
  final_slug   text;
  suffix       int := 0;
  new_org      public.organizations;
  existing_org uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Idempotent guard: a user only ever bootstraps one organization. If they
  -- already belong to one, return it instead of creating a duplicate (covers
  -- double-submits / retries after a transient network error).
  SELECT organization_id INTO existing_org FROM public.profiles WHERE id = uid;
  IF existing_org IS NOT NULL THEN
    SELECT * INTO new_org FROM public.organizations WHERE id = existing_org;
    RETURN new_org;
  END IF;

  -- Normalize + de-duplicate the slug (organizations.slug is UNIQUE). On a
  -- collision, append an incrementing suffix so onboarding never hard-fails.
  base_slug := NULLIF(regexp_replace(lower(COALESCE(org_slug, '')), '[^a-z0-9]+', '-', 'g'), '');
  base_slug := COALESCE(base_slug, 'workspace');
  base_slug := trim(both '-' FROM base_slug);
  IF base_slug = '' THEN
    base_slug := 'workspace';
  END IF;

  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix::text;
  END LOOP;

  INSERT INTO public.organizations (name, slug)
  VALUES (COALESCE(NULLIF(org_name, ''), 'My Workspace'), final_slug)
  RETURNING * INTO new_org;

  -- Claim the caller as the organization owner.
  UPDATE public.profiles
     SET organization_id = new_org.id,
         role            = 'owner',
         updated_at      = now()
   WHERE id = uid;

  RETURN new_org;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_organization(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated;
