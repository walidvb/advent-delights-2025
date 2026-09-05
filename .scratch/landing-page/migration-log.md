# Seeding the two 2025 Calendars into production

Done once, on 2026-09-06, by a throwaway script that was never committed. This
file is the record; the database is the source.

## What went in

| Calendar | Slug | Curator | Days | Tracks |
|---|---|---|---|---|
| Advent Delights | `advent-delights-2025` | `hello@walidvb.com` | 24 (Day 25 empty) | 48 |
| Advent Toz | `toz-2025` | `slmkhlf@gmail.com` | 25 | 50 |

Both `year = 2025`, both `is_public = 1`. Every Track has a `cover_key`; the
matching objects are in the `advent-covers` bucket under `covers/`.

A third Calendar, `test` (2026, private, `walidvb@gmail.com`), predates this and
was left alone. It is excluded from the landing page's pool by both its year and
its privacy.

## Where the data came from

Everything was read out of git object storage in the worktree — no network
except one cover.

- Advent Delights: `486f41c:src/data.csv`, covers at `origin/main`. The
  Calendar was **already seeded** on the deployed database before this ticket,
  under the Slug it still has and a Curator account (`hello@walidvb.com`) that
  is not the address originally asked for. It was left in place: the Slug is a
  live address people may hold, and renaming it would break links already sent.
  The only change made was `is_public = 0 -> 1`.
- Advent Toz: `origin/toz:src/data-toz.csv`, covers at `origin/toz`. Seeded
  fresh. Its sheet is 35 physical lines but exactly 25 parsed rows — the extra
  lines are newlines inside French description fields.
- Toz Day 6 heavy had no cover in any ref: the file its sheet names was never
  committed. Its artwork came from the Spotify release of the same track,
  `open.spotify.com/track/4RI9iajkM3sRtjpilLZq2N`, stored as
  `covers/0602nicolazic.jpg`.

## The one thing worth remembering

The two spreadsheets disagree about date order. The Form behind Delights stamped
`25/11/2025`, day first; the one behind Toz stamped `11/27/2025`, month first and
unpadded. No row can be read safely both ways — `01/12/2025` is valid under
either — so the order had to be declared per Calendar rather than detected. Any
future import from a Google Form should ask which order its sheet uses before
trusting a timestamp.

## Consequences for the repo

`public/covers/` and `scripts/seed-2025.mjs` were both deleted. Covers are served
from R2 through `/cover/<key>`, and nothing reads them off disk any more.
`papaparse` went with the script — it had no other consumer.
