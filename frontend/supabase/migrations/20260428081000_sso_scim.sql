create table if not exists public.organization_sso_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  domain text not null,
  verification_token text not null,
  verified_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (organization_id, domain)
);

create table if not exists public.organization_scim_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz null
);

create table if not exists public.scim_provisioning_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  action text not null,
  subject text not null,
  status text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.organization_sso_domains enable row level security;
alter table public.organization_scim_tokens enable row level security;
alter table public.scim_provisioning_logs enable row level security;

drop policy if exists "org_read_sso_domains" on public.organization_sso_domains;
create policy "org_read_sso_domains" on public.organization_sso_domains for select
  using (organization_id = public.get_org_id());

drop policy if exists "org_manage_sso_domains" on public.organization_sso_domains;
create policy "org_manage_sso_domains" on public.organization_sso_domains for all
  using (organization_id = public.get_org_id()) with check (organization_id = public.get_org_id());
