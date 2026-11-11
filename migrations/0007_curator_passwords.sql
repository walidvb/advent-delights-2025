-- Optional passwords. A Curator who has signed in once by code may set one, and
-- from then on either a code or the password signs them in. Null means no
-- password: the code is the only way in, as before.
--
-- password_hash is "pbkdf2$<iterations>$<salt hex>$<hash hex>" (PBKDF2-SHA-256).
-- password_failures counts wrong passwords since the last successful sign-in;
-- past the limit, only a code gets that account in.
--
-- Apply locally:  npx wrangler d1 migrations apply advent --local
-- Apply deployed: npx wrangler d1 migrations apply advent --remote
alter table curators add column password_hash text;
alter table curators add column password_failures integer not null default 0;
