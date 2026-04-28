-- navigation_preferences: per-user nav/panel state within an organization.
-- Previously only present in supabase/schema.sql (drift vs applied migrations).

CREATE TABLE IF NOT EXISTS public.navigation_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (organization_id, user_id)
);

ALTER TABLE public.navigation_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_navigation_preferences" ON public.navigation_preferences;
DROP POLICY IF EXISTS "authenticated_write_navigation_preferences" ON public.navigation_preferences;
DROP POLICY IF EXISTS "org_user_read_navigation_preferences" ON public.navigation_preferences;
DROP POLICY IF EXISTS "org_user_insert_navigation_preferences" ON public.navigation_preferences;
DROP POLICY IF EXISTS "org_user_update_navigation_preferences" ON public.navigation_preferences;
DROP POLICY IF EXISTS "org_user_delete_navigation_preferences" ON public.navigation_preferences;

CREATE POLICY "org_user_read_navigation_preferences" ON public.navigation_preferences
  FOR SELECT USING (
    organization_id = public.get_org_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "org_user_insert_navigation_preferences" ON public.navigation_preferences
  FOR INSERT WITH CHECK (
    organization_id = public.get_org_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "org_user_update_navigation_preferences" ON public.navigation_preferences
  FOR UPDATE USING (
    organization_id = public.get_org_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "org_user_delete_navigation_preferences" ON public.navigation_preferences
  FOR DELETE USING (
    organization_id = public.get_org_id()
    AND user_id = auth.uid()
  );

DROP TRIGGER IF EXISTS set_updated_at_navigation_preferences ON public.navigation_preferences;
CREATE TRIGGER set_updated_at_navigation_preferences
  BEFORE UPDATE ON public.navigation_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
