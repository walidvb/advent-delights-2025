-- Ticket 08: Submissions and Tracks. Additive — nothing in 0001 or 0002 is
-- touched. Written here because the 2025 seed is the first thing to put rows
-- in these tables; ticket 10 builds the intake that writes them for real.
--
-- Apply locally:  npx wrangler d1 migrations apply advent --local
-- Apply deployed: npx wrangler d1 migrations apply advent --remote

-- One Contributor's claim on one Day. Contributors have no accounts: the
-- credited name is free text they typed, the email is optional and used only to
-- send them their edit link, and `edit_token` is the whole of their authority
-- over the Submission.
--
-- A Day is a position 1..25, not a date. The unique index on
-- (calendar_id, day) is what implements first-come-first-served: two concurrent
-- claims on the same Day cannot both succeed. A Day with no row is empty, and
-- an empty Day stays empty — there are no placeholder rows.
create table submissions (
  id text primary key,
  calendar_id text not null references calendars (id),
  day integer not null check (day between 1 and 25),
  credited_to text not null,
  link text not null default '',
  email text not null default '',
  edit_token text not null unique,
  created_at integer not null
);

create unique index submissions_calendar_day on submissions (calendar_id, day);

-- One piece of music, for one Variant of one Submission. One row per Variant,
-- never prefixed columns on a shared row, so a third Variant is a data change
-- and not a migration.
--
-- The cover may be an uploaded image (`cover_key`, an object in BUCKET), a URL
-- from metadata lookup (`cover_url`), or neither — in which case the interface
-- falls back to its placeholder. An uploaded image wins over a looked-up URL.
create table tracks (
  submission_id text not null references submissions (id),
  variant text not null,
  url text not null default '',
  title text not null default '',
  artist text not null default '',
  description text not null default '',
  buy_link text not null default '',
  cover_key text,
  cover_url text,
  primary key (submission_id, variant)
);
