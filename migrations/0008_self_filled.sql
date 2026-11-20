-- Self-filled Calendars: the Curator fills every Day themselves, picking which
-- Day each Submission goes on instead of having one dealt. Off by default, so
-- every existing Calendar keeps working exactly as before.
--
-- Apply locally:  npx wrangler d1 migrations apply advent --local
-- Apply deployed: npx wrangler d1 migrations apply advent --remote
alter table calendars add column self_filled integer not null default 0;
