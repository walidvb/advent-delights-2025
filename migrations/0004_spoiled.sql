-- Redesign: a Curator's "Spoil" now marks a Day rather than just reading it
-- once. Additive — nothing in 0001-0003 changes.
--
-- Apply locally:  npx wrangler d1 migrations apply advent --local
-- Apply deployed: npx wrangler d1 migrations apply advent --remote

alter table submissions add column spoiled_at integer;
