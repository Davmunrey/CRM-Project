-- Propel — Seed a default sales pipeline for every organization.
--
-- A freshly bootstrapped org had zero pipelines, so the Deals/Pipeline board
-- rendered empty and unusable until the user manually built one. Every CRM
-- ships a starter pipeline; create_organization now creates one atomically, and
-- this migration backfills any existing org that lacks one. Stages mirror
-- utils/defaultAppSettings.ts so the app and DB agree on the canonical funnel.

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
  default_stages constant jsonb := '[
    {"id":"lead","name":"Lead","color":"#3b82f6","order":0,"probability":10},
    {"id":"qualified","name":"Qualified","color":"#f59e0b","order":1,"probability":25},
    {"id":"proposal","name":"Proposal","color":"#8b5cf6","order":2,"probability":50},
    {"id":"negotiation","name":"Negotiation","color":"#f97316","order":3,"probability":75},
    {"id":"closed_won","name":"Won","color":"#10b981","order":4,"probability":100},
    {"id":"closed_lost","name":"Lost","color":"#ef4444","order":5,"probability":0}
  ]'::jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id INTO existing_org FROM public.profiles WHERE id = uid;
  IF existing_org IS NOT NULL THEN
    SELECT * INTO new_org FROM public.organizations WHERE id = existing_org;
    RETURN new_org;
  END IF;

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

  UPDATE public.profiles
     SET organization_id = new_org.id,
         role            = 'owner',
         updated_at      = now()
   WHERE id = uid;

  -- Starter pipeline so the Deals board is usable immediately.
  INSERT INTO public.pipelines (organization_id, name, is_default, stages, created_by)
  VALUES (new_org.id, 'Sales Pipeline', true, default_stages, uid);

  RETURN new_org;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_organization(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated;

-- Backfill: give any pipeline-less org the same starter pipeline.
INSERT INTO public.pipelines (organization_id, name, is_default, stages)
SELECT o.id, 'Sales Pipeline', true, '[
    {"id":"lead","name":"Lead","color":"#3b82f6","order":0,"probability":10},
    {"id":"qualified","name":"Qualified","color":"#f59e0b","order":1,"probability":25},
    {"id":"proposal","name":"Proposal","color":"#8b5cf6","order":2,"probability":50},
    {"id":"negotiation","name":"Negotiation","color":"#f97316","order":3,"probability":75},
    {"id":"closed_won","name":"Won","color":"#10b981","order":4,"probability":100},
    {"id":"closed_lost","name":"Lost","color":"#ef4444","order":5,"probability":0}
  ]'::jsonb
FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.pipelines p WHERE p.organization_id = o.id);
