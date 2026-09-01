-- Ticket 07: Create a Calendar. Additive — nothing in 0001 is touched.
--
-- Apply locally:  npx wrangler d1 migrations apply advent --local
-- Apply deployed: npx wrangler d1 migrations apply advent --remote

-- One community's Calendar, for one year. Running it again next December means
-- a new row, not reopening this one.
--
-- slug is readable and derived from the name, so it is guessable — that is the
-- point of it. submit_slug is a secret and is never derived from anything.
-- Both are unique across the platform; slug collisions are resolved by a
-- numeric suffix before the insert.
create table calendars (
  id text primary key,
  curator_id text not null references curators (id),
  name text not null,
  description text not null default '',
  year integer not null,
  slug text not null unique,
  submit_slug text not null unique,
  is_public integer not null default 0,
  created_at integer not null
);

create index calendars_curator on calendars (curator_id);

-- A Calendar's Variants. Two per Calendar for now, `light` and `heavy`; the
-- labels are stored but unused, because the interface's copy is frozen. The
-- table exists so a third Variant is a data change and not a migration.
create table calendar_variants (
  calendar_id text not null references calendars (id),
  variant text not null,
  label text not null,
  position integer not null,
  primary key (calendar_id, variant)
);
