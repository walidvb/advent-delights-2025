-- Calendars start on a date, not on the 1st of December by definition.
--
-- Apply locally:  npx wrangler d1 migrations apply advent --local
-- Apply deployed: npx wrangler d1 migrations apply advent --remote

-- The calendar date Day 1 reveals on, as `YYYY-MM-DD`. Read against the
-- viewer's own device like every other reveal rule, so it is a plain local
-- date with no time and no zone.
--
-- Added with an empty default because D1 wants a constant one; every existing
-- row is backfilled to its own December immediately below, and every insert
-- since writes the column.
alter table calendars add column starts_on text not null default '';

update calendars set starts_on = year || '-12-01' where starts_on = '';
