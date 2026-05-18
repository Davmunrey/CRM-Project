-- Queue worker polls for pending/processing jobs; this index makes that scan fast.
create index if not exists ai_embedding_jobs_status_idx
  on public.ai_embedding_jobs (organization_id, status)
  where status in ('pending', 'processing');
