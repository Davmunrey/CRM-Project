create or replace function public.has_org_permission(_permission text)
returns boolean
language sql
stable
set search_path = public
as $$
  with role_from_jwt as (
    select nullif(auth.jwt() ->> 'org_role_id', '')::uuid as role_id
  )
  select exists (
    select 1
    from public.organization_role_permissions p
    join role_from_jwt j on j.role_id = p.role_id
    where p.permission = _permission
  );
$$;

comment on function public.has_org_permission is
  'Checks org-scoped permission from JWT app_metadata.org_role_id -> organization_role_permissions.';
