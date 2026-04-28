-- Custom roles per organization (roadmap: role builder UI + has_permission).
-- RLS: only org admins manage; members read their org’s roles.

CREATE TABLE IF NOT EXISTS public.organization_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key)
);

CREATE TABLE IF NOT EXISTS public.organization_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.organization_roles (id) ON DELETE CASCADE,
  permission text NOT NULL,
  UNIQUE (role_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_organization_roles_org ON public.organization_roles (organization_id);

-- Stub: returns false until wired to JWT + organization_role_permissions.
CREATE OR REPLACE FUNCTION public.has_org_permission(_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT false;
$$;

COMMENT ON FUNCTION public.has_org_permission IS 'Placeholder; wire to organization_role_permissions and JWT claims.';

ALTER TABLE public.organization_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_read_organization_roles" ON public.organization_roles;
CREATE POLICY "org_read_organization_roles" ON public.organization_roles
  FOR SELECT USING (organization_id = public.get_org_id());

DROP POLICY IF EXISTS "org_read_organization_role_permissions" ON public.organization_role_permissions;
CREATE POLICY "org_read_organization_role_permissions" ON public.organization_role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_roles r
      WHERE r.id = role_id AND r.organization_id = public.get_org_id()
    )
  );
