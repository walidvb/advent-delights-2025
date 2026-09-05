-- Ticket 06: Curator sign-in. Additive and self-contained — ticket 07 adds
-- calendars on top without touching any of this.
--
-- Apply locally:  npx wrangler d1 migrations apply advent --local
-- Apply deployed: npx wrangler d1 migrations apply advent --remote

-- Only Curators have accounts. Contributors never do.
create table curators (
  id text primary key,
  email text not null unique,
  created_at integer not null
);

-- A pending six-digit sign-in code. One live row per email: requesting a new
-- code deletes the old one. The code itself is never stored, only a SHA-256 of
-- "<id>:<code>" — the row id salts it.
create table sign_in_codes (
  id text primary key,
  email text not null,
  code_hash text not null,
  expires_at integer not null,
  attempts integer not null default 0
);

create index sign_in_codes_email on sign_in_codes (email);

-- id is the SHA-256 of the cookie token, so a leaked database row cannot be
-- replayed as a session.
create table sessions (
  id text primary key,
  curator_id text not null references curators (id),
  expires_at integer not null
);
