-- ─── Caonabo 35 · Supabase Schema ───────────────────────────────────────────
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run

-- BOOKINGS TABLE
create table if not exists bookings (
  id          bigserial primary key,
  guest       text not null,
  email       text not null,
  phone       text,
  room        int  not null,
  check_in    date not null,
  check_out   date not null,
  nights      int  not null,
  guests      int  default 1,
  total       numeric(10,2),
  status      text default 'pending',   -- pending | confirmed | cancelled
  paid        boolean default false,
  source      text default 'Direct',
  notes       text,
  created_at  timestamptz default now()
);

-- EXPENSES TABLE
create table if not exists expenses (
  id          bigserial primary key,
  date        date not null,
  category    text not null,
  description text,
  amount      numeric(10,2) not null,
  paid        boolean default false,
  created_at  timestamptz default now()
);

-- MESSAGES TABLE
create table if not exists messages (
  id          bigserial primary key,
  guest       text not null,
  email       text,
  subject     text,
  body        text,
  read        boolean default false,
  created_at  timestamptz default now()
);

-- SETTINGS TABLE (single row)
create table if not exists settings (
  id          int primary key default 1,
  hotel_name  text default 'Caonabo 35',
  address     text default 'Av. Caonabo #35, 2do Piso, Santo Domingo',
  phone       text,
  whatsapp    text,
  email       text,
  instagram   text,
  check_in_time  text default '15:00',
  check_out_time text default '12:00',
  min_nights  int default 1,
  tax_rate    numeric(5,2) default 18
);

-- Insert default settings row
insert into settings (id) values (1) on conflict do nothing;

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Bookings: anyone can INSERT (to make a reservation), only service_role can read/update/delete
alter table bookings enable row level security;
create policy "Public can insert bookings"  on bookings for insert with check (true);
create policy "Service role full access"    on bookings for all using (auth.role() = 'service_role');

-- Expenses: service_role only
alter table expenses enable row level security;
create policy "Service role full access"    on expenses for all using (auth.role() = 'service_role');

-- Messages: anyone can insert (contact form), service_role manages
alter table messages enable row level security;
create policy "Public can insert messages"  on messages for insert with check (true);
create policy "Service role full access"    on messages for all using (auth.role() = 'service_role');

-- Settings: service_role only
alter table settings enable row level security;
create policy "Service role full access"    on settings for all using (auth.role() = 'service_role');
