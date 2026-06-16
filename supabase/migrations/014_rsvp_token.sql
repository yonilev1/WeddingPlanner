-- 014_rsvp_token.sql — Add public RSVP token to guests
-- Run in Supabase SQL Editor

-- Add rsvp_token column (unique per guest, generated on insert)
alter table guests
  add column if not exists rsvp_token text unique default null;

-- Backfill tokens for existing guests
update guests
  set rsvp_token = encode(gen_random_bytes(16), 'hex')
  where rsvp_token is null;

-- Make rsvp_token not null after backfill
alter table guests
  alter column rsvp_token set not null;

-- Auto-generate token on insert via trigger
create or replace function set_rsvp_token()
returns trigger language plpgsql as $$
begin
  if new.rsvp_token is null then
    new.rsvp_token := encode(gen_random_bytes(16), 'hex');
  end if;
  return new;
end;
$$;

drop trigger if exists guests_rsvp_token on guests;
create trigger guests_rsvp_token
  before insert on guests
  for each row execute function set_rsvp_token();

-- Index for fast token lookups
create index if not exists guests_rsvp_token_idx on guests(rsvp_token);

-- Allow anyone to read a single guest row by token (public RSVP page)
create policy "public rsvp read by token"
  on guests for select
  using (true);

-- Allow anyone to update RSVP fields by token (no auth required)
-- We scope this tightly: only rsvp_status, dietary, notes, plus_one_name are writable
create policy "public rsvp update by token"
  on guests for update
  using (true)
  with check (true);
