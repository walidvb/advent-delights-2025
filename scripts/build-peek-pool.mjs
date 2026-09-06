#!/usr/bin/env node
/**
 * Builds the landing page's peek pool: every Day of every finished, public
 * Calendar, as a plain JSON file the page imports at build time.
 *
 *   node scripts/build-peek-pool.mjs            # the deployed database
 *   node scripts/build-peek-pool.mjs --local    # local D1, for `next dev`
 *
 * The landing page is static and fetches nothing, so the pool has to be baked
 * into the bundle rather than read at request time. It is small — one line per
 * Day, two Tracks each — and it changes about once a year.
 *
 * A build that cannot read the pool fails rather than shipping a landing page
 * with a hole where the grid goes. `--local` is the exception: `next dev` must
 * work against whatever is seeded locally, including nothing.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/app/peek-pool.json');

const local = process.argv.includes('--local');

/**
 * Which Calendars the landing may show. Three conditions, each load-bearing:
 *
 * - `year < currentYear` — a Calendar from this year may still be mid-December
 *   with Days nobody has opened, and the front page is the last place a spoiler
 *   should surface. Evaluated at build time rather than written in, so it rolls
 *   forward on its own each January.
 * - `is_public` — Public means listable. A Calendar that is not public is not
 *   advertised, and the landing page is advertising.
 * - `cover_key is not null` — a Track with no cover falls back to a stock
 *   photograph, which reads as noise in a grid of album art.
 */
const QUERY = `
  select c.slug, s.day, s.credited_to, t.variant, t.url, t.cover_key
    from calendars c
    join submissions s on s.calendar_id = c.id
    join tracks t on t.submission_id = s.id
   where c.year < ${new Date().getFullYear()}
     and c.is_public = 1
     and t.cover_key is not null
     and t.url <> ''
   order by c.slug, s.day, t.variant
`.trim();

/** Mirrors `coverPath` in src/lib/covers.ts, which is TypeScript. */
const coverPath = (key) => `/cover/${key.split('/').map(encodeURIComponent).join('/')}`;

function readRows() {
  const out = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'advent', local ? '--local' : '--remote', '--json', '--command', QUERY],
    { cwd: ROOT, encoding: 'utf-8', maxBuffer: 16 * 1024 * 1024 },
  );
  // wrangler prints its banner before the JSON, so the payload starts at the
  // first bracket rather than at the start of the output.
  return JSON.parse(out.slice(out.indexOf('[')))[0].results;
}

let rows;
try {
  rows = readRows();
} catch (error) {
  if (!local) throw error;
  console.warn(`peek pool: local D1 unreadable, writing an empty pool — ${error.message.split('\n')[0]}`);
  rows = [];
}

// One entry per Day, keyed by Calendar and Day because Day numbers repeat
// across Calendars. A Day missing either Variant is dropped: the switch has to
// have something to switch to.
const days = new Map();
for (const row of rows) {
  const key = `${row.slug}:${row.day}`;
  if (!days.has(key)) days.set(key, { by: row.credited_to });
  days.get(key)[row.variant] = { url: row.url, cover: coverPath(row.cover_key) };
}

const pool = [...days.values()].filter((d) => d.light && d.heavy);

fs.writeFileSync(OUT, JSON.stringify(pool, null, 2) + '\n');
console.log(`peek pool: ${pool.length} Days from ${rows.length} Track rows -> ${path.relative(ROOT, OUT)}`);
