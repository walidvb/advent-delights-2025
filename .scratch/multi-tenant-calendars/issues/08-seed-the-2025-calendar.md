# 08: Seed the 2025 Calendar

**What to build:** A one-off script that loads the original 2025 Calendar — 21 real Submissions and their existing cover images — into the database and object store as a real Calendar owned by a real account.

This runs before the read path deliberately, so every ticket after it has genuine content to develop against instead of invented fixtures.

The source data is messy in ways the import has to survive, and that is the point: it is the most realistic data this project will ever have.

**Blocked by:** 07

**Status:** done

- [x] Running the script produces a complete Calendar with its Submissions and two Tracks each
- [x] Cover images are uploaded to the object store and referenced from their Tracks
- [x] Columns present in the source but absent from the old code's type are handled deliberately: imported or dropped, decided rather than ignored
- [x] Rows where the cover-image column is empty but a cover-identifier column is populated resolve to the right image
- [x] The file-extension rewrite in the old code, which makes source values differ from the files on disk, is accounted for
- [x] Cover files existing in both accented and unaccented spellings resolve to one image without a crash
- [x] Days with no Submission in the source are left empty rather than filled with placeholders
- [x] The script is re-runnable without creating duplicates

## Comments

`scripts/seed-2025.mjs` plus `migrations/0003_submissions.sql`.

**The ticket says 21 Submissions. The spreadsheet has 24.** Every one of its 24
rows carries a credited name, and the original reader maps row order straight
to Day order (`rowIndex = i`), so the Calendar is Days 1–24 claimed and **Day 25
empty**. Seeded what the data says.

### The schema

`submissions(id, calendar_id, day 1..25, credited_to, link, email, edit_token,
created_at)` with a unique index on `(calendar_id, day)` — that index is what
implements first-come-first-served, so ticket 10 gets the constraint for free.
`tracks(submission_id, variant, url, title, artist, description, buy_link,
cover_key, cover_url)` keyed on `(submission_id, variant)`: one row per Variant,
so a third Variant is a data change and not a migration. The cover is either an
uploaded object (`cover_key`) or a looked-up URL (`cover_url`), and uploaded
wins.

### Decisions about the mess

- **`N Track cover image` — dropped.** Where it is not empty it holds a Google
  Drive `open?id=…` link into the Curator's private folder, which nobody else
  can fetch, or a duplicate of the cover id. The file named by `Track N cover
  id` is the real artwork.
- **`Bio` — dropped.** It is the Curator's prose about the Contributor, written
  for a page that never shipped. Importing it would invent a field the data
  model and the frozen interface have nowhere to put.
- **`Column 1` — dropped.** Empty in every row.
- **The extension rewrite is replayed.** The old reader turned spaces into
  hyphens and every extension into `.webp` before using the value as a URL, and
  the files on disk were converted to match — so *no* spreadsheet value names a
  file that exists until the rewrite is redone.
- **Accents are folded on the fallback path only.** An exact filename match
  wins; failing that, a match with accents and case folded; if that is
  ambiguous, first in sorted order. One image, no crash. Exactly one row needed
  it: `Capture decran 2025-11-27 à 11.45.08 - Salem Khf.png` →
  `Capture-decran-2025-11-27-a-11.45.08---Salem-Khf.webp`.
- **A cover that resolves to nothing is loud but not fatal** — the Track seeds
  without one and the interface falls back to its placeholder, as the data model
  allows. None hit this.
- **Empty Days get no row.** An absent Submission is what empty means; there are
  no placeholder rows.

### Re-runnability

Every write is keyed on something stable: the Curator by email, the Calendar by
Slug, a Submission by `(calendar_id, day)`, a Track by `(submission_id,
variant)`, a cover by its filename. `edit_token` and `submit_slug` are written
only on first insert, so a link already sent to a Contributor keeps working.

### Verified

First run: 24 spreadsheet rows → 24 Submissions on Days 1–24, empty Day 25, 48
covers uploaded to `advent-covers` under `covers/`, 76 SQL statements applied.

In D1 afterwards: 1 Curator, 1 Calendar, 2 `calendar_variants`, 24 Submissions
spanning Days 1–24 with 24 distinct Days, 48 Tracks, **zero Submissions holding
anything other than exactly 2 Tracks**, and **zero Tracks without a
`cover_key`**. All 48 distinct cover keys correspond to files that exist. Two
objects fetched back out of R2 — including the accent-folded one — at 38,884 and
103,966 bytes.

Second run, immediately after: 1 Curator, 1 Calendar, 24 Submissions, 48 Tracks,
2 Variants, 24 distinct edit tokens. Nothing duplicated.

### Left undone

`ponytail:` the Calendar is found by Slug, so a Curator who edits the Slug and
re-runs this gets a second Calendar. It is a one-off seed; point it at the new
Slug if that ever happens.

Not run against the deployed database and bucket — `--remote` needs Cloudflare
credentials and a real D1 id, which ticket 01 left outstanding.
