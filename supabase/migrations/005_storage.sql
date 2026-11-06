-- =============================================================================
-- 005_storage.sql — buckets and storage policies
--   report-photos : PRIVATE. Anyone may upload into incoming/; only the admin
--                   area can view (via short-lived signed URLs).
--   gallery       : PUBLIC read. Only staff upload.
-- Size and type limits are enforced by Storage itself, not just the browser.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('report-photos', 'report-photos', false, 5242880,
     array['image/jpeg','image/png','image/webp']),
  ('gallery', 'gallery', true, 8388608,
     array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- report-photos ------------------------------------------------------------
create policy "public uploads report photos into incoming"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'report-photos'
    and (storage.foldername(name))[1] = 'incoming'
    and name ~ '^incoming/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
  );

create policy "admin area views report photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'report-photos' and public.has_admin_access());

create policy "admins delete report photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'report-photos' and public.is_admin());

-- gallery ------------------------------------------------------------------
create policy "gallery is publicly readable"
  on storage.objects for select
  using (bucket_id = 'gallery');

create policy "staff manage gallery files"
  on storage.objects for all to authenticated
  using (bucket_id = 'gallery' and public.is_staff())
  with check (bucket_id = 'gallery' and public.is_staff());
