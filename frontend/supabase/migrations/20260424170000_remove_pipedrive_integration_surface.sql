-- Remove Pipedrive-specific inbound integration surface.
-- Keep Velo native outbound webhook capabilities untouched.

DROP TRIGGER IF EXISTS set_updated_at_integration_entity_governance ON public.integration_entity_governance;

DROP TABLE IF EXISTS public.integration_event_dispatch;
DROP TABLE IF EXISTS public.integration_entity_governance;
DROP TABLE IF EXISTS public.pipedrive_webhook_ingest;
