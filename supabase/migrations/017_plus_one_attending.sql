-- Lets a guest with an invited plus-one say whether they're actually bringing them,
-- instead of always counting +1 as attending the moment the guest confirms.

alter table guests
  add column if not exists plus_one_attending boolean not null default true;
