create table if not exists public.data_export_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  format text not null default 'zip',
  status text not null default 'queued',
  result_path text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.data_export_jobs enable row level security;
drop policy if exists "org_read_data_export_jobs" on public.data_export_jobs;
create policy "org_read_data_export_jobs" on public.data_export_jobs for select
  using (organization_id = public.get_org_id());
