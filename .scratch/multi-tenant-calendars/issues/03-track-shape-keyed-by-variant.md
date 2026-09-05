# 03: Track shape keyed by Variant

**What to build:** Nothing, from a visitor's point of view. This is a prefactor: the Calendar behaves identically before and after.

A Day currently holds its two Tracks as two sets of flat, prefixed fields, which forces every consumer to branch on Variant across six fields at a time — the same ternary block repeated in the player and in the details card. Reshape it so a Day holds one Track per Variant, looked up by Variant, and those branches collapse.

Doing this now, while real spreadsheet data is still feeding the site, means the later database swap changes only where Tracks come from and not what they look like.

**Blocked by:** 02

**Status:** done

- [x] A Day's Tracks are held one per Variant and retrieved by Variant, not as prefixed fields
- [x] The repeated per-field Variant ternaries in the player and details card are gone
- [x] The shape does not assume exactly two Variants
- [x] The Calendar renders identically to before, including covers, credits, descriptions and buy links
- [x] Playback and Variant switching still behave as they did after ticket 02

## Comments

### The shape

```ts
export interface Track {
  url; trackName; artistName; description; buyLink; coverImage;
}

export interface Day {
  dayIndex; creditedTo; participantLink;
  tracks: Partial<Record<TrackVariant, Track>>;
}
```

Every consumer now reads `day.tracks[variant]` once, instead of branching field
by field across six fields.

The map is **partial on purpose**, and that is what makes the shape carry no
count. Nothing about it says "two": a Day with one Track fits, a Day with three
fits, and an unclaimed Day with none fits. A total `Record` would instead assert
that every Variant is present, which is both a claim about how many there are
and a crash waiting for ticket 04 — `day.tracks[variant].url` throws on a Day
the database has no Track rows for, where the old prefixed fields quietly gave
`undefined`. Partial keeps the old degrade-to-`undefined` behaviour: the three
lookup sites are `day.tracks[variant]?.…` and every consumer downstream of them
already handled a missing value (`coverImage && <img>`, `trackName || 'Track
Title'`).

The old type called itself `Track` while actually being a Day holding two
Tracks. With a real `Track` type arriving that name was taken, so the day-level
type is now `Day`, matching `CONTEXT.md`. That rename is most of the diff's line
count and all of it is mechanical: `tracks` → `days`, `hoveredTrack` →
`hoveredDay`, `track` prop → `day` prop, `getTracks()` → `getDays()`.

Two fields were dropped rather than moved:

- **`lightCreditedTo` / `heavyCreditedTo`.** Both were assigned the same
  `Credited to` column, so the per-Variant copies were always equal. Consumers
  read `day.creditedTo`. This matches the spec's data model, where the credited
  name belongs to the Submission and a Track carries url, title, artist,
  description, buy link and cover.
- **The divergent cover rewrite.** Light applied `.webp` before collapsing
  spaces, heavy the other way round. Both are now `coverPath()`. The two orders
  differ only for a filename with whitespace inside its extension, and the
  before/after payload diff below confirms all 48 cover paths are unchanged.

### Verified

Fingerprint first: extracted every string value from the RSC flight payload of
`/` before and after. The only differences are key names — `lightTrackUrl`,
`heavyCoverImage` and friends replaced by `tracks` / `light` / `heavy` /
`coverImage` / `trackName` / `artistName` / `buyLink`. **Not one data value
changed**, including all 48 cover paths and the Day 25 placeholder.

In the browser, against `next dev` on :3011 with Days 1–4 and 7 revealed:

- **Grid**: all 25 cover `href`s identical to before, in both Variants
  (light and heavy lists captured and compared).
- **Details card**, Day 2 light: cover, "December 2", "Harvest Time",
  "by Pharoah Sanders", the full description, "Submitted by: Cyril Yeterian".
  Heavy on the same Day: "Cogs" / "Bound By Endogamy" / heavy cover / heavy
  description — so the card follows the Variant, it does not just re-read light.
- **Mobile full-screen card** at 375×812: same six fields plus the Play button.
- **Player**, Day 2 light: cover, "Harvest Time", "Pharoah Sanders", the
  Bandcamp "Get track" link, "Curated by: Cyril Yeterian", 0:13 / 20:24.
- **Variant switch mid-Track — ticket 02's lock survives.** Playing Day 2 light,
  switched to heavy: the grid and the tagline flipped to heavy ("get schwifty"),
  and the player kept "Harvest Time" / Pharoah Sanders / the light cover /
  the light buy link while elapsed ran 0:13 → 0:24 against an unchanged 20:24.
  No restart, no cut.
- **Skip / previous**: next moved Day 2 → Day 3 ("On Your Feet" / DRS & Dogger /
  heavy cover), previous moved back to Day 2 heavy ("Cogs").

Then against the Worker (`opennextjs-cloudflare build` + `preview`): `/` 200,
covers served, Day 2 played, Variant switch held the lock, and pausing released
it so the next play picked up the current Variant — same as ticket 02.

`npx tsc --noEmit` clean. `npm run lint` reports the same 8 problems before and
after the change — no new ones. `next build` still reports `/` as `○ (Static)`.

### Not done, and why

- **`Day` still inlines the Submission's fields.** `CONTEXT.md` puts the
  credited name and the link to yourself on the Submission, so the honest shape
  is `Day = { dayIndex; submission: Submission | null }`, and an unclaimed Day
  is a null submission rather than a Day with an empty Track map. Today the
  spreadsheet is the only source and has no notion of unclaimed, so that null
  branch would be dead code in every consumer. It belongs with the ticket that
  replaces the source — the first point at which an empty Day exists. The
  partial Track map means nothing here throws in the meantime.
- **A `Track` does not carry its own Variant.** The spec says it does, but that
  sentence is about the stored row ("Tracks are stored one row per Variant").
  In the shape a consumer reads, the Variant *is* the key it was looked up by,
  and no consumer needs it repeated inside the value.
- **`participantLink` and the `Participant` type** still say "participant" where
  the glossary says Contributor. Both are spreadsheet-shaped and go away with
  the CSV reader in ticket 09.
- **`server-tracks.ts` now exports `getDays`** and no longer matches its
  filename. Same reason: ticket 09 deletes the file.

### Note for whoever is running the preview on :8787

That wrangler session was live while this ticket ran `opennextjs-cloudflare
build`. It hot-reloaded onto a half-written `.open-next` and has served `/` as
500 ever since; `/sign-in` and `/bindings-check` are fine. A preview started
fresh from the same build serves `/` 200. Restart that session and it clears.
