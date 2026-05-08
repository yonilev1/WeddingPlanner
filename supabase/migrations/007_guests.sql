-- 007_guests.sql — Guest list & RSVP tracker
-- Run in Supabase SQL Editor

create table if not exists guests (
  id           uuid primary key default gen_random_uuid(),
  wedding_id   uuid not null references weddings(id) on delete cascade,
  name         text not null,
  email        text,
  rsvp_status  text not null default 'pending',  -- 'pending' | 'confirmed' | 'declined'
  dietary      text,
  plus_one     boolean not null default false,
  plus_one_name text,
  table_number integer,
  group_name   text,  -- e.g. 'Family', 'Friends', 'Work'
  notes        text,
  created_at   timestamptz not null default now()
);

alter table guests enable row level security;

create policy "wedding members can manage guests"
  on guests for all
  using  (wedding_id = get_user_wedding_id())
  with check (wedding_id = get_user_wedding_id());

-- index for fast wedding-scoped queries
create index if not exists guests_wedding_id_idx on guests(wedding_id);
