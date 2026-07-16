-- Verified guest reviews + automated guest emails. Applied to prod 2026-07-15 via MCP.
alter table public.reviews   add column if not exists booking_id bigint;
alter table public.reviews   add column if not exists source     text default 'guest';
alter table public.bookings  add column if not exists prearrival_sent_at   timestamptz;
alter table public.bookings  add column if not exists review_email_sent_at timestamptz;
alter table public.settings  add column if not exists guest_emails_on boolean default false;  -- master switch, off by default

-- public may submit a review (approved=false); hidden until the admin publishes it
drop policy if exists "reviews public insert" on public.reviews;
create policy "reviews public insert" on public.reviews for insert to anon, authenticated with check (approved = false);

-- reviews live in realtime so the admin sees new ones instantly
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='reviews') then
    alter publication supabase_realtime add table public.reviews;
  end if;
end $$;
