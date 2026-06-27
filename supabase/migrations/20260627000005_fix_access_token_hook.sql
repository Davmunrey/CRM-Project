-- Propel — Fix auth hook + role resolution (forward migration over 0002/0003).
--
-- Two blocking bugs prevented end-to-end login:
--
-- 1. custom_access_token_hook returned NULL claims for any user WITHOUT an
--    organization. organization_id is NULL until a user bootstraps an org, but
--    to_jsonb()/jsonb_set() are STRICT and return NULL on NULL input, so the
--    claims object collapsed to SQL NULL and GoTrue rejected the token with
--    "output claims do not conform to the expected schema ... given: null".
--    That is a chicken-and-egg lock: you cannot log in without an org, and you
--    cannot create an org without logging in. Fixed by seeding claims from
--    '{}' and coalescing NULL values to JSON null.
--
-- 2. The hook overwrote the top-level `role` claim with the application role
--    (e.g. 'owner'). PostgREST uses the `role` claim to SET ROLE in Postgres;
--    'owner' is not a database role, so every authenticated PostgREST request
--    would fail. The application role now lives only in `app_role`, and
--    jwt_role() reads it from there; `role` stays 'authenticated'.

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

  claims := COALESCE(event->'claims', '{}'::jsonb);
  IF profile_row.id IS NOT NULL THEN
    claims := jsonb_set(claims, '{org_id}',
      COALESCE(to_jsonb(profile_row.organization_id::text), 'null'::jsonb), true);
    claims := jsonb_set(claims, '{app_role}',
      COALESCE(to_jsonb(profile_row.role), 'null'::jsonb), true);
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;

-- Resolve the application role from app_role (role now stays 'authenticated').
CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(auth.jwt()->>'app_role', ''), 'viewer');
$$;
