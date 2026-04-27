-- Tighten EXECUTE grants for SECURITY DEFINER functions exposed through PostgREST RPC.
-- Goal: keep only explicitly intended RPCs callable by anon/authenticated.

-- Keep intended public/authenticated RPCs.
REVOKE ALL ON FUNCTION public.resolve_workspace_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_workspace_slug(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.create_org_self_service(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_org_self_service(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_org_self_service(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.list_organization_members_with_identity() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_organization_members_with_identity() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_organization_members_with_identity() TO authenticated;

REVOKE ALL ON FUNCTION public.backfill_email_tracking_user(text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.backfill_email_tracking_user(text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.backfill_email_tracking_user(text[]) TO authenticated;

-- Internal helpers and trigger functions: never callable from API roles.
REVOKE ALL ON FUNCTION public.set_claim(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_member() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.webhook_enqueue_event(
  uuid,
  text,
  text,
  uuid,
  jsonb,
  jsonb,
  uuid
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.webhook_trg_activities() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.webhook_trg_companies() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.webhook_trg_contacts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.webhook_trg_deals() FROM PUBLIC, anon, authenticated;
