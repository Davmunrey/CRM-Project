-- Lock down SECURITY DEFINER RPC entry points from PostgREST.
-- These functions remain available to trusted backend paths (service_role / postgres)
-- and are now consumed by Edge Functions where needed.

REVOKE EXECUTE ON FUNCTION public.resolve_workspace_slug(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_org_self_service(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_organization_members_with_identity() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.backfill_email_tracking_user(text[]) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.resolve_workspace_slug(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_org_self_service(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_organization_members_with_identity() TO service_role;
GRANT EXECUTE ON FUNCTION public.backfill_email_tracking_user(text[]) TO service_role;

