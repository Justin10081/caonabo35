-- Applied to production 2026-09-28 as migration `gallery_photos_url_source_check`.
-- ADDITIVE ONLY. Validated first: all 14 existing rows start with '/img/'.
--
-- Photo URLs must be a photo bundled with the site (/img/...) or one in this
-- project's public room-photos bucket, so no javascript: or third-party URL can
-- ever reach an <img src> / <a href> in the public gallery or the admin.
-- (Separate name because the table's inline non-empty check already got the
-- auto-generated name gallery_photos_url_check.)
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.gallery_photos'::regclass and conname = 'gallery_photos_url_source_check') then
    alter table public.gallery_photos add constraint gallery_photos_url_source_check
      check (starts_with(url, '/img/')
          or starts_with(url, 'https://tdvtbmyiicdjzwrgpwed.supabase.co/storage/v1/object/public/room-photos/'));
  end if;
end $$;
