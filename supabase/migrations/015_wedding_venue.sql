-- 015_wedding_venue.sql — Add venue address for RSVP navigation button
alter table weddings
  add column if not exists venue_address text default null;
