-- Applied to production 2026-08-28 (verified live before and after).
-- Kept here so the repo matches the database.

-- 1. Room photo gallery, owner-editable from the admin.
alter table public.rooms add column if not exists photos jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-photos','room-photos', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "room photos public read"  on storage.objects;
drop policy if exists "room photos admin insert" on storage.objects;
drop policy if exists "room photos admin update" on storage.objects;
drop policy if exists "room photos admin delete" on storage.objects;
create policy "room photos public read"  on storage.objects for select to public        using (bucket_id='room-photos');
create policy "room photos admin insert" on storage.objects for insert to authenticated with check (bucket_id='room-photos');
create policy "room photos admin update" on storage.objects for update to authenticated using (bucket_id='room-photos');
create policy "room photos admin delete" on storage.objects for delete to authenticated using (bucket_id='room-photos');

-- 2. CRITICAL: anonymous visitors could insert status='confirmed', paid=true bookings.
--    The July hardening ADDED a tightened policy but left the old permissive one in
--    place; permissive policies are OR'd, so the loose one won. Verified against the
--    live REST API both before (forged insert reached a PK conflict = RLS passed) and
--    after (42501 = refused), with legitimate pending/unpaid inserts still working.
drop policy if exists "Allow public booking inserts" on public.bookings;
drop policy if exists "Allow public message inserts" on public.messages;
drop policy if exists "Authenticated can update rooms" on public.rooms;

-- 3. The public site could not read settings at all, so:
--      - the owner's contact/name/check-in edits never reached visitors, and
--      - seasons_json never loaded, so calcPrice() quoted every public booking at the
--        BASE rate and seasonal/temporary rates were silently ignored.
--    Every column here is already published on the site.
create policy "settings public read" on public.settings
  for select to anon using (id = 1);
