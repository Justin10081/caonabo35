-- 2026-09-23 · Deep audit, database layer. ALREADY APPLIED to production via the Supabase MCP
-- (migrations: bookings_readback_by_token, lock_down_unused_id_photos_bucket,
--  bookings_integrity_and_public_guard, columns_for_email_guard_review_token_message_phone,
--  reviews_one_per_booking). Recorded here as the final state; do not re-run blindly.
--
-- Two earlier attempts the same day were superseded and are NOT part of the final state:
--  * a GUC holding the booking id (readable-by-id if anyone could set the GUC), and
--  * `xmin = pg_current_xact_id_if_assigned()` (xmin isn't stamped yet when Postgres evaluates
--    SELECT policies for INSERT ... RETURNING, so the booking form still failed).

-- ── 1. Public booking read-back ────────────────────────────────────────────────────────────
-- The booking form inserts with Prefer: return=representation. INSERT ... RETURNING requires the
-- new row to pass a SELECT policy, and anon has none on bookings (guest PII) → every public booking
-- failed with 42501 from 2026-07-15. The request that creates a booking may now read back exactly
-- that row, keyed by a random per-row token published in a transaction-local setting.
alter table public.bookings add column if not exists readback_token uuid not null default gen_random_uuid();

create or replace function public.bookings_mark_new_row()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.readback_token := gen_random_uuid();
  perform pg_catalog.set_config('app.booking_readback', new.readback_token::text, true);
  return new;
end; $$;
revoke all on function public.bookings_mark_new_row() from public, anon, authenticated;

drop trigger if exists bookings_mark_new_row on public.bookings;
create trigger bookings_mark_new_row before insert on public.bookings
  for each row execute function public.bookings_mark_new_row();

drop policy if exists "Inserter can read back own new booking" on public.bookings;
create policy "Inserter can read back own new booking" on public.bookings
  for select to anon, authenticated
  using (readback_token::text = current_setting('app.booking_readback', true));

-- ── 2. Unused public bucket locked down ────────────────────────────────────────────────────
update storage.buckets set public = false where id = 'id-photos';
drop policy if exists "Allow anon upload to id-photos" on storage.objects;
drop policy if exists "Allow authenticated read id-photos" on storage.objects;
create policy "id photos admin read" on storage.objects
  for select to authenticated using (bucket_id = 'id-photos' and public.is_admin());

-- ── 3. Integrity constraints + no double booking ───────────────────────────────────────────
create extension if not exists btree_gist with schema extensions;

alter table public.bookings
  add constraint bookings_dates_valid     check (check_out > check_in),
  add constraint bookings_room_valid      check (room between 1 and 8),
  add constraint bookings_guests_valid    check (guests is null or guests between 1 and 10),
  add constraint bookings_total_valid     check (total is null or total >= 0),
  add constraint bookings_guest_len       check (char_length(guest) between 1 and 120),
  add constraint bookings_email_len       check (char_length(email) <= 254),
  add constraint bookings_phone_len       check (phone is null or char_length(phone) <= 40),
  add constraint bookings_notes_len       check (notes is null or char_length(notes) <= 2000),
  add constraint bookings_idnum_len       check (id_number is null or char_length(id_number) <= 40),
  add constraint bookings_idtype_len      check (id_type is null or char_length(id_type) <= 40),
  add constraint bookings_source_len      check (source is null or char_length(source) <= 40),
  add constraint bookings_id_photo_image  check (coalesce(id_photo_url,'') = ''
      or id_photo_url ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$');

alter table public.bookings
  add constraint no_double_booking
  exclude using gist (room with =, daterange(check_in, check_out, '[)') with &&)
  where (status <> 'cancelled');

-- ── 4. Public insert guard (anon / non-admin only; admin + service role skip it) ──────────
create or replace function public.bookings_public_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  claims jsonb := nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb;
  caller text  := coalesce(claims->>'role', '');
  today_do date := (pg_catalog.now() at time zone 'America/Santo_Domingo')::date;
  cap int; room_open boolean;
begin
  if caller not in ('anon','authenticated') or public.is_admin() then
    return new;
  end if;

  new.status := 'pending';
  new.paid := false;
  new.source := 'Direct';
  new.created_at := pg_catalog.now();
  new.confirmation_sent_at := null;
  new.prearrival_sent_at := null;
  new.review_email_sent_at := null;
  new.email := lower(btrim(coalesce(new.email, '')));
  new.nights := new.check_out - new.check_in;

  if new.check_in < today_do then
    raise exception 'C35_PAST_DATE' using errcode = 'P0001';
  end if;
  if new.nights < 1 or new.nights > 30 or new.check_in > today_do + 540 then
    raise exception 'C35_INVALID_STAY' using errcode = 'P0001';
  end if;

  select r.guests, r.available into cap, room_open from public.rooms r where r.id = new.room::text;
  if not found or room_open is false then
    raise exception 'C35_UNAVAILABLE' using errcode = 'P0001';
  end if;
  if cap is not null and coalesce(new.guests, 1) > cap then
    raise exception 'C35_CAPACITY' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.bookings b
             where b.room = new.room and b.status <> 'cancelled'
               and daterange(b.check_in, b.check_out, '[)') && daterange(new.check_in, new.check_out, '[)'))
     or exists (select 1 from public.channel_blocks c
             where c.room_id = new.room::text and c.date >= new.check_in and c.date < new.check_out)
     or exists (select 1 from public.room_nights n
             where n.room_id = new.room::text and n.available = false
               and n.date >= new.check_in and n.date < new.check_out) then
    raise exception 'C35_UNAVAILABLE' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.bookings b
             where b.email = new.email and b.room = new.room and b.check_in = new.check_in
               and b.created_at > pg_catalog.now() - interval '10 minutes') then
    raise exception 'C35_DUPLICATE' using errcode = 'P0001';
  end if;
  if (select count(*) from public.bookings b
      where b.source = 'Direct' and b.status = 'pending'
        and b.created_at > pg_catalog.now() - interval '1 hour') >= 20 then
    raise exception 'C35_RATE_LIMIT' using errcode = 'P0001';
  end if;

  return new;
end; $$;
revoke all on function public.bookings_public_guard() from public, anon, authenticated;

drop trigger if exists bookings_0_public_guard on public.bookings;
create trigger bookings_0_public_guard before insert on public.bookings
  for each row execute function public.bookings_public_guard();

-- ── 5. Email one-shot guards, review tokens, message phone ────────────────────────────────
alter table public.bookings add column if not exists confirmation_sent_at timestamptz;
alter table public.bookings add column if not exists admin_notified_at timestamptz;
alter table public.bookings add column if not exists review_token uuid not null default gen_random_uuid();
alter table public.messages add column if not exists phone text;

create or replace function public.bookings_public_guard_extra()
returns trigger language plpgsql set search_path = '' as $$
declare caller text := coalesce(nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb->>'role', '');
begin
  if caller in ('anon','authenticated') then
    new.admin_notified_at := null;
    new.review_token := gen_random_uuid();
  end if;
  return new;
end; $$;
revoke all on function public.bookings_public_guard_extra() from public, anon, authenticated;
drop trigger if exists bookings_1_public_guard_extra on public.bookings;
create trigger bookings_1_public_guard_extra before insert on public.bookings
  for each row execute function public.bookings_public_guard_extra();

-- ── 6. Reviews only via the verified-stay API; one per booking ────────────────────────────
drop policy if exists "reviews public insert" on public.reviews;
create unique index if not exists reviews_booking_id_key on public.reviews(booking_id) where booking_id is not null;

-- ── 7. is_admin() not callable anonymously ────────────────────────────────────────────────
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
