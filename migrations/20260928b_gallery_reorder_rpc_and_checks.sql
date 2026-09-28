-- Gallery follow-up (verifier fixes). Applied to production 2026-09-28 as
-- migration `gallery_reorder_rpc_checks_rain_shower`.
-- ADDITIVE ONLY: one new function, a tag CHECK constraint on our own new table
-- (validated against the 14 existing rows first: 0 violations), and one caption
-- fix on today's seed row. Nothing else is touched.

-- 1. Reorder without ever inserting.
--    The admin used to save order with an upsert of {id,url,sort_order}; if another
--    tab had deleted a photo, that upsert re-created it as a broken, caption-less row.
--    This only UPDATEs existing rows, sets sort_order by array position (10, 20, ...)
--    and returns how many rows it updated. SECURITY INVOKER, so the table's RLS
--    applies: non-admins update 0 rows. anon cannot call it at all.
create or replace function public.reorder_gallery(ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  n integer;
begin
  update public.gallery_photos g
     set sort_order = t.ord * 10
    from unnest(ids) with ordinality as t(id, ord)
   where g.id = t.id;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.reorder_gallery(uuid[]) from public, anon;
grant execute on function public.reorder_gallery(uuid[]) to authenticated;

-- 2. Tag = one of the public filter buttons, now enforced by the DB.
--    (The URL-source rule is in 20260928c_gallery_url_source_check.sql: the name
--    first tried here, gallery_photos_url_check, already belonged to the table's
--    inline non-empty check, so that block was a no-op and has been removed.)
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.gallery_photos'::regclass and conname = 'gallery_photos_tag_check') then
    alter table public.gallery_photos add constraint gallery_photos_tag_check
      check (tag in ('outdoor','living','bedroom','bathroom','common','detail'));
  end if;
end $$;

-- 3. Spanish caption for the rain-shower photo, matching release/deep-audit-2026-09.
--    Only touches the seed row, and only if the owner hasn't already edited it.
update public.gallery_photos
   set label = 'Ducha tipo lluvia', label_en = 'Rain Shower'
 where url = '/img/rainShower.jpg' and path is null and label = 'Rain Shower';
