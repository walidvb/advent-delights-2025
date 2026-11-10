-- Admins: platform staff, distinct from Curators (see CONTEXT.md). An Admin is
-- still a Curator account — same sign-in — with this flag set by hand:
--
--   npx wrangler d1 execute advent --remote --command "update curators set admin = 1 where email = '…'"
--
-- Apply locally:  npx wrangler d1 migrations apply advent --local
-- Apply deployed: npx wrangler d1 migrations apply advent --remote
alter table curators add column admin integer not null default 0;
