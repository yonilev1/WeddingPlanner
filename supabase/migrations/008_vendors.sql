-- 008_vendors.sql — Vendor directory
-- Run in Supabase SQL Editor

create table if not exists vendors (
  id               uuid primary key default gen_random_uuid(),
  wedding_id       uuid not null references weddings(id) on delete cascade,
  name             text not null,
  category         text not null,  -- 'venue' | 'catering' | 'photography' | 'music' | 'flowers' | 'attire' | 'transport' | 'other'
  contact_name     text,
  email            text,
  phone            text,
  website          text,
  contract_status  text not null default 'none',  -- 'none' | 'pending' | 'signed'
  deposit_paid     boolean not null default false,
  deposit_amount   numeric,
  total_cost       numeric,
  notes            text,
  created_at       timestamptz not null default now()
);

alter table vendors enable row level security;

create policy "wedding members can manage vendors"
  on vendors for all
  using  (wedding_id = get_user_wedding_id())
  with check (wedding_id = get_user_wedding_id());

-- index for fast wedding-scoped queries
create index if not exists vendors_wedding_id_idx on vendors(wedding_id);
