-- Propel — Storage buckets for user avatars and organization logos.
--
-- The app previously only accepted image URLs (paste a link). This adds real
-- file upload: two public-read buckets with write access scoped by RLS so each
-- user owns their avatar folder and org admins own their org's logo folder.
-- Path conventions: avatars/{user_id}/<file>, org-logos/{org_id}/<file>.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',   'avatars',   true, 5242880, array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']),
  ('org-logos', 'org-logos', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read (logos/avatars are shown across the app and in emails) ----------
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select to public using (bucket_id = 'avatars');

drop policy if exists "org_logos_public_read" on storage.objects;
create policy "org_logos_public_read" on storage.objects
  for select to public using (bucket_id = 'org-logos');

-- Avatars: a user may write only inside their own user-id folder -------------
drop policy if exists "avatars_user_insert" on storage.objects;
create policy "avatars_user_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_user_update" on storage.objects;
create policy "avatars_user_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_user_delete" on storage.objects;
create policy "avatars_user_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Org logos: only org admins/owners may write inside their org-id folder -----
drop policy if exists "org_logos_admin_insert" on storage.objects;
create policy "org_logos_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1] = public.jwt_org_id()::text
    and public.jwt_role() in ('owner', 'admin')
  );

drop policy if exists "org_logos_admin_update" on storage.objects;
create policy "org_logos_admin_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1] = public.jwt_org_id()::text
    and public.jwt_role() in ('owner', 'admin')
  );

drop policy if exists "org_logos_admin_delete" on storage.objects;
create policy "org_logos_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1] = public.jwt_org_id()::text
    and public.jwt_role() in ('owner', 'admin')
  );
