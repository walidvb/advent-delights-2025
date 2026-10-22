-- 0004's `throttles` table spaced out Bandcamp requests made from the Worker.
-- Bandcamp answers Cloudflare's network with a bot challenge, so links are now
-- read through the hosted @cucu/media API, which does its own spacing. Nothing
-- reads or writes this table any more.
--
-- Apply locally:  npx wrangler d1 migrations apply advent --local
-- Apply deployed: npx wrangler d1 migrations apply advent --remote
drop table throttles;
