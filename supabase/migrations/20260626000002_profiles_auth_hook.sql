-- Propel — Supabase Auth bridge: profiles + JWT custom claims hook
-- Maps legacy `users` table to auth.users and injects org_id + role into JWT.

-- Drop password auth column (Supabase Auth owns credentials)
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS password_hash;

-- Legacy users become profiles (FK references follow the rename)
ALTER TABLE IF EXISTS users RENAME TO profiles;

-- Ensure profile id matches auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey_auth_users'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_id_fkey_auth_users
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'sales_rep'),
    NULLIF(NEW.raw_user_meta_data->>'organization_id', '')::uuid
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Supabase custom access token hook (see config.toml [auth.hook.custom_access_token])
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  profile_row public.profiles%ROWTYPE;
  user_id uuid;
BEGIN
  user_id := (event->>'user_id')::uuid;
  SELECT * INTO profile_row FROM public.profiles WHERE id = user_id;

  claims := event->'claims';
  IF profile_row.id IS NOT NULL THEN
    claims := jsonb_set(claims, '{org_id}', to_jsonb(profile_row.organization_id::text), true);
    claims := jsonb_set(claims, '{role}', to_jsonb(profile_row.role), true);
    claims := jsonb_set(claims, '{app_role}', to_jsonb(profile_row.role), true);
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;
