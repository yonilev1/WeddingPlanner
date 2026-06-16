-- Per-guest invitation language, so the RSVP page is sent in the language the guest actually speaks
-- instead of guessing from their name.

alter table guests
  add column if not exists language text not null default 'he' check (language in ('he', 'en'));
