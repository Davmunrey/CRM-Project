create extension if not exists vector;

create table if not exists public.organization_ai_config (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  enabled boolean not null default false,
  provider text not null default 'openai',
  model text not null default 'gpt-4o-mini',
  redact_pii boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_invocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid null,
  action text not null,
  model text not null,
  prompt_redacted text null,
  response_redacted text null,
  tokens integer not null default 0,
  latency_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_embedding_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organization_ai_config enable row level security;
alter table public.ai_invocations enable row level security;
alter table public.ai_embedding_jobs enable row level security;

drop policy if exists "org_read_ai_config" on public.organization_ai_config;
create policy "org_read_ai_config" on public.organization_ai_config
  for select using (organization_id = public.get_org_id());

drop policy if exists "org_manage_ai_config" on public.organization_ai_config;
create policy "org_manage_ai_config" on public.organization_ai_config
  for all using (organization_id = public.get_org_id())
  with check (organization_id = public.get_org_id());

drop policy if exists "org_read_ai_invocations" on public.ai_invocations;
create policy "org_read_ai_invocations" on public.ai_invocations
  for select using (organization_id = public.get_org_id());
