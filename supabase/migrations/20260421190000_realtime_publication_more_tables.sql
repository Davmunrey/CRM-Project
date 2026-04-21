-- Broadcast row changes to Supabase Realtime for tables the app subscribes to in `realtimeSubscriptions.ts`.
-- Idempotent: skip if the table is already part of `supabase_realtime`.

DO $body$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sequence_enrollments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sequence_enrollments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'automation_executions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_executions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'audit_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'organization_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_members;
  END IF;
END
$body$;
