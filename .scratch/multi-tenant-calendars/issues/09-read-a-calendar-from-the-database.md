# 09: Read a Calendar from the database

**What to build:** Visiting a Calendar's Slug shows the seeded 2025 Calendar, rendered by the original interface, with its content coming from the database instead of a spreadsheet on disk.

The page is a shell that requests one payload holding every Day. That payload is cached with a long lifetime and purged whenever the Calendar is written to, so a normal visit costs no database work and a new Submission still appears within milliseconds.

**The visitor-facing interface must not change.** Same layout, same reveal animation, same Variant switch, same wording. If a change to it seems necessary, something else is wrong.

The spreadsheet and its build-time reader are deleted in this ticket.

**Blocked by:** 03, 04, 07, 08

**Status:** done

- [x] A Calendar's Slug serves the Calendar, and an unknown Slug gives a clean not-found rather than an error
- [x] Content comes from the database; the spreadsheet file and its reader are gone
- [x] The payload is cached and served from cache on repeat visits
- [x] Writing to a Calendar purges its cached payload, and the change is visible on the next load
- [x] Reveal is driven by the Calendar's own year, not a hardcoded one
- [x] Days with no Submission render as empty rather than breaking the grid
- [x] Covers resolve in the intended order: uploaded image, then looked-up image, then the existing placeholder
- [x] Side-by-side against the original site, the seeded Calendar is visually indistinguishable

## Comments

Three new files, three deleted, and a rename the CSV was holding up.

- `src/lib/calendar-payload.ts` — the Calendar read API: one query, one payload,
  the cache and the purge.
- `src/app/calendar/[slug]/page.tsx` — the Calendar at its Slug.
- `src/app/cover/[...key]/route.ts` — uploaded covers, served from R2.
- Deleted: `src/data.csv`, `src/app/advent/server-tracks.ts` and the dead
  `src/app/advent/data.ts` stub that pointed at it.

### The payload

One row per Track, one query for the whole Calendar:

```sql
select c.slug, c.year, s.day, s.credited_to, s.link,
       t.variant, t.url, t.title, t.artist, t.description, t.buy_link,
       t.cover_key, t.cover_url
  from calendars c
  left join submissions s on s.calendar_id = c.id
  left join tracks t on t.submission_id = s.id
 where c.slug = ?1
 order by s.day
```

The left joins do the two awkward cases for free: **no rows at all** is a Slug no
Calendar has (404), and **one row with a null day** is a Calendar nobody has
submitted to yet — which is not the same thing and must not 404. Days are built
as twenty-five entries first and then filled in, so an unclaimed Day is present
and empty rather than missing.

`{ slug, year, days, contributors }` is exactly what the interface takes:
`days` and `contributors` go to `AdventCalendar` untouched, `slug`/`year` to
`AdventDayProvider`. Contributors are deduplicated by credited name in Day
order, which is the order the spreadsheet reader produced, so the About panel
lists the same 24 names in the same sequence.

### Caching, and the purge

`caches.default`, keyed on the Slug, `max-age` one year. A hit costs no database
work at all — on the Worker the first load of the Calendar took 147ms and every
load after it 7–11ms.

**A missing Calendar is deliberately not cached.** Caching one would let a typo
outlive the Calendar that fixes it, and an unknown Slug is nobody's normal visit.

`purgeCalendarPayload(slug)` is the function tickets 10, 12 and 13 call. Nothing
submits yet, so to prove it works it was wired into the one write that already
exists — `updateCalendar`, the Curator saving the settings form — which purges
both the old Slug and the new one, because an edited Slug leaves the old key
cached behind it.

`ponytail:` `caches.default` is per data centre, so a purge clears the cache
where the write landed and leaves other data centres to expire. The Contributor
who just submitted sees their Day immediately; a viewer on another continent
might not. Purge by URL through the zone API if that ever matters.

### Covers

`cover_key` → `cover_url` → the placeholder, in that order, exactly as the
criterion asks. The placeholder is the one the site has always used
(`picsum.photos/seed/advent<day>`), so a Track that arrives with no artwork at
all still behaves the way the original did.

Uploaded covers are served by the application at `/cover/<key>`, never from the
bucket's development URL, per the spec's *Images*. The key is encoded a path
segment at a time, so a filename carrying `+`, `(` or a space still addresses
its object — the seed has all three. The route reads `httpMetadata.contentType`
and `arrayBuffer()` rather than `writeHttpMetadata` and `object.body`: `next
dev` reaches the bindings across a bridge that only carries plain values, and
the richer calls fail there with `DevalueError: Cannot stringify arbitrary
non-POJOs`.

### What `/` became: a redirect to `/dashboard`

It was the one Calendar. It is now a redirect, for want of anything honest to
put there: Calendars live at their own Slug, nothing lists them (a browse page
is out of scope by decision), and `/dashboard` already sends a signed-out
visitor to `/sign-in`. So the only thing anyone can do from the bare root is
make a Calendar, and that is where they land. A landing page was the
alternative and was skipped because its copy is a product decision nobody has
made yet; a browse page replaces the redirect the day it exists.

The ticket-01 landmine is gone with the file that caused it. `next build` now
reports `/` as `○ (Static)` — a redirect with nothing to read — and
`/calendar/[slug]` and `/cover/[...key]` as `ƒ`. Nothing reads from disk at
render any more, so nothing can ENOENT.

### The rename ticket 03 left for this ticket

`Participant` → `Contributor`, `participantLink` → `contributorLink`, and the
`participants` prop → `contributors`. Spreadsheet vocabulary that CONTEXT.md
calls Contributor; it survived only because the CSV reader produced it.
`CSVRow` went with the spreadsheet.

### Two differences from the original, and both are deliberate

Everything else is identical — see below — but two tiles do not match, and
neither is an accident:

- **Day 25 has no Submission, so it has no Track and no cover**, and the grid
  renders it in `CalendarCard`'s own no-cover colour. The original showed a
  random stock photo there because its reader manufactured two Tracks for every
  Day whether or not the spreadsheet had a row. An empty Day now looks empty.
- **Day 6's light cover now loads.** The spreadsheet named
  `Capture-decran-…-à-11.45.08…`, the file on disk is spelled `-a-`, and that
  URL has always been a 404 on the original site — the tile was blank. Ticket
  08 folded the accent when it seeded, so the real artwork is there now.

### Verified

`next dev` on :3012 and the Worker on :8787, both against local D1 and R2. Per
the spec, no automated tests.

**The payload, field by field, against the original.** The RSC flight payload of
`/` was captured before any change and compared with `/calendar/advent-delights-2025`
after: 25 Days, 24 Contributors in the same order, and **every url, track name,
artist, description and buy link identical** apart from three known classes —
the 48 cover paths moving from `/covers/x.webp` to `/cover/covers/x.webp`, 20
values whose leading or trailing whitespace ticket 08 trimmed on the way into
the database (`"PiWhy "` → `"PiWhy"`), and Day 25's two manufactured Tracks
disappearing.

- **Slug serves the Calendar; unknown Slug 404s.** `/calendar/advent-delights-2025`
  200 on both servers, `/calendar/nope` and `/calendar/no-such-calendar` the
  plain 404 page, not an error.
- **Content comes from the database.** `src/data.csv` and its reader are gone;
  the tree builds and the page renders with nothing on disk to read.
- **Cached.** With the Calendar loaded once, `tracks.title` for Day 1 light was
  changed in D1 to `CACHE PROBE` behind the Worker's back. The page kept serving
  `Birds` — it had not touched the database.
- **Purge.** Signed in as the seeded Curator on :8787 with a real emailed code,
  opened the Calendar's settings and pressed Save. The very next load showed
  `CACHE PROBE`. The title was then restored in D1, the page stayed stale, and a
  second Save brought `Birds` back. The Calendar row was byte-identical after
  both saves.
- **Reveal follows the Calendar's year.** With the seeded Calendar's year set to
  2027, every one of the 25 Days rendered inactive and frosted — nothing has
  revealed for a Calendar whose December has not happened. Back at 2025 (today
  is September 2026) all 25 are open, which is the Archive.
- **Day 25 renders as empty** and the grid keeps its shape: 25 tiles, four rows,
  the 25th showing the no-cover colour and its number.
- **Cover order, all three branches.** Day 20 given a `cover_url` alongside its
  `cover_key` still served `/cover/covers/gnaw.webp`; Day 21 stripped of its key
  served the looked-up URL; Day 22 stripped of both served
  `picsum.photos/seed/advent22/400/400`. All three rows restored afterwards, and
  the database is back to 48 Tracks each with a cover key.
- **All 48 covers fetch 200 `image/webp` through `/cover/…`**, including the
  accent-folded one and the `+`-laden `Black+street+2+-ArnaudBriens.webp`. A key
  that names nothing gives 404, not an error.
- **The interface, in the browser.** Grid identical to the pre-change screenshot
  tile for tile. Opened Day 2: the reveal animation, then the hover card with
  the cover from R2, "December 2", "Harvest Time", "by Pharoah Sanders", the
  description and "Submitted by: Cyril Yeterian"; the player showing the same
  Track, its Bandcamp "Get track" link and "Curated by: Cyril Yeterian".
  Switched Variant mid-track: the background and the "get schwifty" tagline
  flipped, the grid changed to the heavy covers, and the player held Harvest
  Time while the clock ran 0:17 → 0:23 of 20:24 — ticket 02's lock survives.
  The About panel lists all 24 Contributors with their links, copy unchanged.
- `npx tsc --noEmit` clean. `npm run lint` reports the same 8 problems as before,
  none of them in a file this ticket touched.

### Left undone

- **The seed script now needs its spreadsheet back.** `scripts/seed-2025.mjs`
  reads `src/data.csv`, which this ticket deleted, and ticket 08's `--remote`
  run is still outstanding. The script's header says how to restore it
  (`git show 99de32d:src/data.csv > src/data.csv`). Worth knowing before the
  first deploy, since the deployed D1 and R2 are still empty.
- **Page metadata is still the original Calendar's.** `layout.tsx` hardcodes the
  title, description and OG image for every route, so a second Calendar would
  be titled "Advent Delights". Fixing it means `generateMetadata` from the
  Calendar's own name and description, which changes what the frozen interface
  puts in `<head>`; it belongs with a ticket that owns that.
- **`public/covers` is still shipped** even though covers are served from R2
  now. Kept because the seed script uploads from it and has not been run
  against the deployed bucket.
- **Nothing calls the purge on a Submission yet**, because nothing submits yet.
  Ticket 10 calls `purgeCalendarPayload(slug)` after the write.
