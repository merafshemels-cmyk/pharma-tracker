-- Optional medicine photos.
--
-- This migration is prepared but intentionally NOT applied to the hosted
-- project as part of the application change set. Review it, then apply it with
-- `supabase db push` (or run it in the SQL editor) before enabling photo upload
-- in production.
--
-- What it does:
--   1. Adds `medicines.image_path` to store the storage object path.
--   2. Creates the `medicine-images` bucket (5 MB limit, JPG/PNG/WebP only).
--   3. Restricts uploads, updates, and deletes to active pharmacy staff.
--
-- The bucket is public because the client resolves photos with
-- `storage.getPublicUrl()`. Object names contain the pharmacy id, medicine id,
-- and a random UUID, so URLs are not enumerable. Reads therefore need no
-- storage RLS policy; writes are still enforced by the policies below.

alter table public.medicines
  add column if not exists image_path text;

comment on column public.medicines.image_path is
  'Storage object path inside the medicine-images bucket. Null when the medicine has no photo.';

-- Keep the bucket definition idempotent. `do nothing` avoids overwriting any
-- bucket settings that may already exist in a deployed project.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medicine-images',
  'medicine-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Safely read the pharmacy id from the first path segment:
--   <pharmacy_id>/<medicine_id>/<uuid>-<file-name>
create or replace function public.storage_object_pharmacy_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_pharmacy_id uuid;
begin
  begin
    v_pharmacy_id := split_part(p_name, '/', 1)::uuid;
  exception
    when invalid_text_representation then
      return null;
  end;

  return v_pharmacy_id;
end;
$$;

drop policy if exists "medicine_images_select_member" on storage.objects;
create policy "medicine_images_select_member"
on storage.objects for select
to authenticated
using (
  bucket_id = 'medicine-images'
  and public.is_pharmacy_member(public.storage_object_pharmacy_id(name))
);

drop policy if exists "medicine_images_insert_staff" on storage.objects;
create policy "medicine_images_insert_staff"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'medicine-images'
  and public.has_pharmacy_role(
    public.storage_object_pharmacy_id(name),
    array['owner', 'manager', 'pharmacist']
  )
);

drop policy if exists "medicine_images_update_staff" on storage.objects;
create policy "medicine_images_update_staff"
on storage.objects for update
to authenticated
using (
  bucket_id = 'medicine-images'
  and public.has_pharmacy_role(
    public.storage_object_pharmacy_id(name),
    array['owner', 'manager', 'pharmacist']
  )
)
with check (
  bucket_id = 'medicine-images'
  and public.has_pharmacy_role(
    public.storage_object_pharmacy_id(name),
    array['owner', 'manager', 'pharmacist']
  )
);

drop policy if exists "medicine_images_delete_staff" on storage.objects;
create policy "medicine_images_delete_staff"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'medicine-images'
  and public.has_pharmacy_role(
    public.storage_object_pharmacy_id(name),
    array['owner', 'manager', 'pharmacist']
  )
);
