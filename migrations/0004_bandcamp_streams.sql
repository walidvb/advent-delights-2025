-- Bandcamp Tracks. Additive — nothing in 0001–0003 is touched.
--
-- Apply locally:  npx wrangler d1 migrations apply advent --local
-- Apply deployed: npx wrangler d1 migrations apply advent --remote

-- A Bandcamp page is not something a player can load: the music is a signed
-- mp3 stream read out of the release page. `provider_track_id` says which track
-- of the release this is (an album link holds many), `stream_url` is the stream
-- last read for it, and `stream_refreshed_at` is when it was last re-read
-- because the stored one stopped playing. All three stay null for every other
-- source, which plays its own link.
--
-- The stream is still somebody else's file on somebody else's host: nothing is
-- hosted here.
alter table tracks add column provider_track_id text;
alter table tracks add column stream_url text;
alter table tracks add column stream_refreshed_at integer;

-- One row per rate-limited host: when it was last claimed. Bandcamp starts
-- failing requests spaced closer than about two seconds, and every isolate of
-- the Worker shares the one IP range, so the spacing has to live somewhere they
-- all see.
create table throttles (
  key text primary key,
  last_at integer not null
);
