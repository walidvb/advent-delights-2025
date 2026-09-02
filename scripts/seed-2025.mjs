#!/usr/bin/env node
/**
 * Ticket 08: loads the original 2025 Calendar — its Submissions, their Tracks
 * and their cover images — into D1 and R2 as a real Calendar owned by a real
 * Curator account.
 *
 *   node scripts/seed-2025.mjs            # local D1 + R2 emulation
 *   node scripts/seed-2025.mjs --remote   # the deployed database and bucket
 *   SEED_CURATOR_EMAIL=me@example.com node scripts/seed-2025.mjs
 *
 * Re-runnable: every write is keyed on something stable (the Curator's email,
 * the Calendar's Slug, the Calendar + Day pair, the Submission + Variant pair,
 * the cover's filename), so a second run updates the same rows and overwrites
 * the same objects rather than making new ones.
 *
 * The source spreadsheet is messy in ways handled deliberately here; see the
 * comments on COLUMNS and resolveCover.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSV = path.join(ROOT, 'src/data.csv');
const COVERS_DIR = path.join(ROOT, 'public/covers');
const SQL_OUT = path.join(ROOT, '.wrangler/tmp/seed-2025.sql');

const BUCKET = 'advent-covers';
/** Everything the seed puts in R2 lives under one prefix. */
const KEY_PREFIX = 'covers/';

const CALENDAR = {
  name: 'Advent Delights',
  slug: 'advent-delights-2025',
  description: 'The original 2025 calendar: twenty-five doors, two tracks behind each one.',
  year: 2025,
};
/**
 * The Calendar's Variants, and where each one's Tracks live in the spreadsheet.
 * Mirrors the pair `src/lib/calendars.ts` writes for a new Calendar — this
 * script runs outside the Worker and cannot import it.
 *
 * `artistHeader` is spelled out because the sheet's two headers disagree about
 * capitals: "Artist name 1" but "Artist Name 2".
 */
const VARIANTS = [
  { variant: 'light', label: 'Light', column: 1, artistHeader: 'Artist name 1' },
  { variant: 'heavy', label: 'Heavy', column: 2, artistHeader: 'Artist Name 2' },
];

const curatorEmail = (process.env.SEED_CURATOR_EMAIL || 'curator@advent-delights.example')
  .trim()
  .toLowerCase();
const target = process.argv.includes('--remote') ? '--remote' : '--local';

/**
 * The spreadsheet's columns, and what happens to each. Every column is decided
 * on rather than ignored — the ones dropped are dropped for a reason.
 *
 *   Timestamp                    -> the Submission's created_at
 *   Credited to                  -> the Submission's credited name
 *   Link to you (if you want one!) -> the Submission's link
 *   N Track URL / Description / buy link -> the Track
 *   Artist name N / Track name N -> the Track (leading newlines and stray
 *                                  spaces are trimmed; the sheet has both)
 *   Track N cover id             -> the cover; see resolveCover
 *   N Track cover image          -> DROPPED. Where it is not empty it holds a
 *                                  Google Drive "open?id=..." link to the
 *                                  Curator's private folder, which nobody but
 *                                  the Curator can fetch, or a duplicate of the
 *                                  cover id. The downloaded file named by the
 *                                  cover id is the real artwork.
 *   Bio                          -> DROPPED. It is the Curator's prose about
 *                                  the Contributor, written for a page that
 *                                  never shipped. The data model has nowhere to
 *                                  put it and the frozen interface never showed
 *                                  it; importing it would invent a field.
 *   Column 1                     -> DROPPED. Empty in every row; a spreadsheet
 *                                  artefact.
 */
const csvRows = Papa.parse(fs.readFileSync(CSV, 'utf-8'), {
  header: true,
  skipEmptyLines: true,
}).data;

const coverFiles = fs.readdirSync(COVERS_DIR);

/** Accents folded and case dropped, so `Jérémie` and `Jeremie` compare equal. */
const fold = (name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const byFoldedName = new Map();
for (const file of coverFiles) {
  const key = fold(file);
  if (!byFoldedName.has(key)) byFoldedName.set(key, []);
  byFoldedName.get(key).push(file);
}

const coverNotes = [];

/**
 * The filename on disk for a spreadsheet cover id, or null.
 *
 * Two pieces of mess to get through:
 *
 * 1. The old reader rewrote every cover id — spaces to hyphens, extension to
 *    `.webp` — before using it as a URL, and the files were converted to match.
 *    So no spreadsheet value names a file that exists; the rewrite has to be
 *    replayed here.
 * 2. Some covers exist twice, once spelled with accents and once without
 *    (`…-Jérémie-…` and `…-Jeremie-…`). An exact match wins; otherwise the
 *    accent-folded match does, and if that is ambiguous the first in sorted
 *    order is taken. One image, no crash.
 */
function resolveCover(rawId) {
  const id = (rawId || '').trim();
  if (!id) return null;

  const rewritten = id.replace(/\.\w+$/, '.webp').replace(/\s/g, '-');
  if (coverFiles.includes(rewritten)) return rewritten;

  const matches = (byFoldedName.get(fold(rewritten)) || []).sort();
  if (matches.length) {
    coverNotes.push(`  ${id}\n    -> ${matches[0]}  (matched by folding accents/case${matches.length > 1 ? `, ${matches.length} candidates` : ''})`);
    return matches[0];
  }

  coverNotes.push(`  ${id}\n    -> NO FILE (rewritten to ${rewritten})`);
  return null;
}

/** "25/11/2025 12:55:14" — day first, and no timezone in sight. */
function parseTimestamp(raw) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec((raw || '').trim());
  if (!m) return Date.now();
  const [, d, mo, y, h, mi, s] = m.map(Number);
  return Date.UTC(y, mo - 1, d, h, mi, s);
}

const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
/**
 * A SQL string literal. The rest of the codebase binds `?n` parameters through
 * D1's prepared statements and should keep doing so; this script has no D1
 * binding to prepare against — it hands wrangler a `.sql` file, which takes no
 * parameters — so it is the one place that quotes values itself.
 */
const quote = (value) => `'${String(value ?? '').replaceAll("'", "''")}'`;
const nullable = (value) => (value ? quote(value) : 'null');
const randomId = () => crypto.randomUUID().replaceAll('-', '');

// ---------------------------------------------------------------------------
// Read the spreadsheet into Submissions and Tracks.

const submissions = [];
for (const [index, row] of csvRows.entries()) {
  const day = index + 1; // The sheet's row order is the Day order; there is no
  // Day column. A row past 25 would be off the end of the Calendar.
  if (day > 25) break;

  const creditedTo = clean(row['Credited to']);
  const tracks = VARIANTS.map(({ variant, column, artistHeader }) => ({
    variant,
    url: clean(row[`${column} Track URL`]),
    title: clean(row[`Track name ${column}`]),
    artist: clean(row[artistHeader]),
    description: (row[`${column} Track Description`] || '').trim(),
    buyLink: clean(row[`${column} Track buy link`]),
    coverFile: resolveCover(row[`Track ${column} cover id`]),
  }));

  // An empty row is an empty Day, not a Submission with nothing in it.
  if (!creditedTo && !tracks.some((t) => t.url)) continue;

  submissions.push({
    day,
    creditedTo,
    link: clean(row['Link to you (if you want one!)']),
    createdAt: parseTimestamp(row.Timestamp),
    tracks,
  });
}

const usedFiles = [...new Set(submissions.flatMap((s) => s.tracks.map((t) => t.coverFile)).filter(Boolean))];

console.log(`Read ${csvRows.length} spreadsheet rows -> ${submissions.length} Submissions on Days ${submissions.map((s) => s.day).join(', ')}`);
console.log(`Empty Days: ${Array.from({ length: 25 }, (_, i) => i + 1).filter((d) => !submissions.some((s) => s.day === d)).join(', ') || 'none'}`);
console.log(`Covers: ${usedFiles.length} distinct files for ${submissions.length * VARIANTS.length} Tracks`);
if (coverNotes.length) console.log(`Covers needing a second look:\n${coverNotes.join('\n')}`);

// A cover that resolves to nothing is loud but not fatal: the Track is seeded
// without one and the interface falls back to its placeholder, exactly as the
// data model allows. Losing 48 good Submissions over one missing file would be
// the worse outcome.
const unresolved = submissions.flatMap((s) => s.tracks.filter((t) => !t.coverFile).map((t) => `Day ${s.day} ${t.variant}`));
if (unresolved.length) console.warn(`WARNING — seeded with no cover: ${unresolved.join(', ')}`);

// ---------------------------------------------------------------------------
// Upload the covers. The key is the filename, so a re-run overwrites the same
// object instead of adding one.

const wrangler = (args) =>
  execFileSync('npx', ['wrangler', ...args, target], { cwd: ROOT, encoding: 'utf-8' });

console.log(`\nUploading ${usedFiles.length} covers to ${BUCKET} (${target})…`);
for (const [i, file] of usedFiles.entries()) {
  wrangler([
    'r2', 'object', 'put', `${BUCKET}/${KEY_PREFIX}${file}`,
    '--file', path.join(COVERS_DIR, file),
    '--content-type', 'image/webp',
  ]);
  process.stdout.write(`\r  ${i + 1}/${usedFiles.length}`);
}
console.log('\n  done');

// ---------------------------------------------------------------------------
// Write the rows. One SQL file, one wrangler invocation.
//
// The Curator is found by email, the Calendar by Slug, and every Submission and
// Track upserts on its natural key, so nothing here duplicates on a re-run.
// `edit_token` and `submit_slug` are only ever written on first insert: a link
// already sent to a Contributor keeps working, and so does a Calendar the
// Curator has since renamed.
//
// ponytail: the Calendar is identified by its Slug. A Curator who edits the
// Slug and then re-runs this gets a second Calendar. It is a one-off seed;
// point it at the new Slug if that ever happens.

const calendarId = `(select id from calendars where slug = ${quote(CALENDAR.slug)})`;
const submissionId = (day) => `(select id from submissions where calendar_id = ${calendarId} and day = ${day})`;

const statements = [
  `insert into curators (id, email, created_at)
     values (${quote(randomId())}, ${quote(curatorEmail)}, ${Date.now()})
     on conflict (email) do nothing;`,

  `insert into calendars (id, curator_id, name, description, year, slug, submit_slug, is_public, created_at)
     select ${quote(randomId())}, id, ${quote(CALENDAR.name)}, ${quote(CALENDAR.description)}, ${CALENDAR.year},
            ${quote(CALENDAR.slug)}, ${quote(randomId())}, 0, ${Date.now()}
       from curators where email = ${quote(curatorEmail)}
        and not exists (select 1 from calendars where slug = ${quote(CALENDAR.slug)});`,

  ...VARIANTS.map((v, position) =>
    `insert or ignore into calendar_variants (calendar_id, variant, label, position)
       values (${calendarId}, ${quote(v.variant)}, ${quote(v.label)}, ${position});`),
];

for (const s of submissions) {
  statements.push(
    `insert into submissions (id, calendar_id, day, credited_to, link, email, edit_token, created_at)
       values (${quote(randomId())}, ${calendarId}, ${s.day}, ${quote(s.creditedTo)}, ${quote(s.link)}, '', ${quote(randomId())}, ${s.createdAt})
       on conflict (calendar_id, day) do update set
         credited_to = excluded.credited_to, link = excluded.link;`,
  );
  for (const t of s.tracks) {
    statements.push(
      `insert into tracks (submission_id, variant, url, title, artist, description, buy_link, cover_key, cover_url)
         values (${submissionId(s.day)}, ${quote(t.variant)}, ${quote(t.url)}, ${quote(t.title)}, ${quote(t.artist)},
                 ${quote(t.description)}, ${quote(t.buyLink)}, ${nullable(t.coverFile && KEY_PREFIX + t.coverFile)}, null)
         on conflict (submission_id, variant) do update set
           url = excluded.url, title = excluded.title, artist = excluded.artist,
           description = excluded.description, buy_link = excluded.buy_link,
           cover_key = excluded.cover_key, cover_url = excluded.cover_url;`,
    );
  }
}

fs.mkdirSync(path.dirname(SQL_OUT), { recursive: true });
fs.writeFileSync(SQL_OUT, statements.join('\n\n') + '\n');

console.log(`\nApplying ${statements.length} statements to D1 (${target})…`);
console.log(wrangler(['d1', 'execute', 'advent', '--file', SQL_OUT, '-y']).trim().split('\n').slice(-3).join('\n'));

console.log(`\nSeeded "${CALENDAR.name}" (/${CALENDAR.slug}) for ${curatorEmail}.`);
console.log('Sign in as that address to curate it; set SEED_CURATOR_EMAIL to use another.');
