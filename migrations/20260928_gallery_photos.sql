-- Owner-editable public gallery ("Galería" in the admin).
-- Applied to production 2026-09-28 as migration `gallery_photos_admin_editable`.
--
-- ADDITIVE ONLY: one new table, its own grants and policies, and a seed of the 14
-- photos that were hard-coded in GALLERY (src/caonabo35.jsx), in the same order,
-- so the public site looks the same on day one. Nothing existing is dropped or
-- altered. Uploaded photos reuse the `room-photos` bucket under a `gallery/`
-- prefix; its storage policies already require public.is_admin() for
-- insert/update/delete, so no storage policy changes are needed.

create table if not exists public.gallery_photos (
  id            uuid primary key default gen_random_uuid(),
  url           text not null check (length(btrim(url)) > 0),
  path          text,                          -- storage path in room-photos; NULL for the bundled /img/ photos
  label         text not null default '',      -- caption (Spanish)
  label_en      text not null default '',      -- caption (English); falls back to label when blank
  tag           text not null default 'detail',-- public filter: outdoor|living|bedroom|bathroom|common|detail
  featured      boolean not null default false,-- tall tile in the public grid
  show_in_strip boolean not null default false,-- one of the (max 4) photos in the strip under the hero
  sort_order    integer not null,
  created_at    timestamptz not null default now()
);

create index if not exists gallery_photos_sort_idx on public.gallery_photos (sort_order);

alter table public.gallery_photos enable row level security;

-- Defense in depth on top of RLS: visitors can only ever read this table.
revoke all on table public.gallery_photos from anon, authenticated;
grant select on table public.gallery_photos to anon, authenticated;
grant insert, update, delete on table public.gallery_photos to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='gallery_photos' and policyname='gallery public read') then
    create policy "gallery public read" on public.gallery_photos
      for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='gallery_photos' and policyname='gallery admin insert') then
    create policy "gallery admin insert" on public.gallery_photos
      for insert to authenticated with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='gallery_photos' and policyname='gallery admin update') then
    create policy "gallery admin update" on public.gallery_photos
      for update to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='gallery_photos' and policyname='gallery admin delete') then
    create policy "gallery admin delete" on public.gallery_photos
      for delete to authenticated using (public.is_admin());
  end if;
end $$;

-- Seed once (only while the table is empty). English captions match the
-- release/deep-audit-2026-09 branch; the façade is tagged `outdoor` (as on that
-- branch) so it appears under the public "Exterior" filter instead of only under "Todo".
insert into public.gallery_photos (url, label, label_en, tag, featured, show_in_strip, sort_order)
select v.url, v.label, v.label_en, v.tag, v.featured, v.show_in_strip, v.sort_order
from (values
  ('/img/terrace.jpg',     'Terraza Exterior',   'Outdoor Terrace',   'outdoor',  true,  false,  10),
  ('/img/livingBig.jpg',   'Sala Principal',     'Main Lounge',       'living',   true,  true,   20),
  ('/img/artBench.jpg',    'Arte & Galería',     'Art & Gallery',     'detail',   false, false,  30),
  ('/img/livingWide.jpg',  'Sala Panorámica',    'Panoramic Lounge',  'living',   true,  false,  40),
  ('/img/mirror.jpg',      'Espejo de Diseño',   'Designer Mirror',   'detail',   false, false,  50),
  ('/img/reception.jpg',   'Recepción',          'Reception',         'common',   true,  true,   60),
  ('/img/corridor.jpg',    'Corredor Verde',     'Green Corridor',    'outdoor',  true,  true,   70),
  ('/img/tvRoom.jpg',      'Sala de Estar',      'Sitting Room',      'living',   false, false,  80),
  ('/img/amberChairs.jpg', 'Lounge Ámbar',       'Amber Lounge',      'common',   false, true,   90),
  ('/img/bathroom.jpg',    'Baño en Mármol',     'Marble Bathroom',   'bathroom', true,  false, 100),
  ('/img/facade.jpg',      'Fachada Caonabo 35', 'Caonabo 35 Façade', 'outdoor',  true,  false, 110),
  ('/img/rainShower.jpg',  'Rain Shower',        'Rain Shower',       'bathroom', true,  false, 120),
  ('/img/plants.jpg',      'Jardín Interior',    'Indoor Garden',     'outdoor',  false, false, 130),
  ('/img/chessRoom.jpg',   'Zona de Juegos',     'Games Area',        'living',   false, false, 140)
) as v(url, label, label_en, tag, featured, show_in_strip, sort_order)
where not exists (select 1 from public.gallery_photos);
