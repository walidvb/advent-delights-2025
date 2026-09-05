# 11: Metadata prefill from a Track URL

**What to build:** A Contributor pastes a link to a Track and watches the title, artist and artwork fill themselves in. They can overwrite anything the lookup got wrong.

Prefill is a suggestion and never the source of truth. Every field stays typed-in-able, so an unrecognised source or a failed lookup slows a Contributor down rather than stopping them. This boundary is also where a source-specific scraper would later slot in.

**Blocked by:** 10

**Status:** done

- [x] Pasting a recognised Track link fills in title, artist and cover image
- [x] Every prefilled field can be edited afterwards, and edits are what gets saved
- [x] A lookup that fails or returns nothing leaves the form fully usable and shows no error page
- [x] A slow lookup does not block typing in the other fields
- [x] An unrecognised source is a normal outcome, not a failure state
- [x] The looked-up cover is recorded separately from any uploaded one

## Comments

`src/lib/track-metadata.ts` is the lookup boundary; `lookupTrackAction` in
`src/app/submit/actions.ts` exposes it; `SubmissionFields.tsx` does the
prefilling.

**oEmbed, asked of the source directly** — YouTube and SoundCloud both publish
it with no key, no quota and no signup. The old CSV reader used `noembed.com` as
a one-endpoint-for-everything proxy; it is still up but now answers YouTube with
a Perl stack trace and SoundCloud with a 404, so it is gone. Asking the source
is one fetch either way with nobody in the middle to rot.

**Adding a source is a pure addition.** An oEmbed provider is one line in
`OEMBED`; a source with no oEmbed at all is a `lookup` of its own picked up by
`sourceFor`, returning the same shape. No caller changes either way. Bandcamp —
the one people ask for — is deliberately out of scope and is simply an
unrecognised host today.

**oEmbed has no "artist"**, only the uploader's title and the account name, so
the artist is read out of the title: "Awake by Tycho" (SoundCloud's convention)
and "Artist - Track" (YouTube's, where the channel is often a label). Both are
guesses, which is exactly why every field stays editable.

**Nothing throws.** An unrecognised host, an unreachable one, a timeout, a
private or deleted link and a nonsense response all return `null`, which means
"nothing to suggest". A 6-second timeout bounds the wait.

**Surviving the losing-racer remount.** Ticket 10 remounts the form with
`key={state.attempt}` so a Contributor who loses a race keeps what they typed.
These fields initialise their state from the draft that comes back in that
state, so a prefilled value survives the remount the same way a typed one does.
A value that still equals its own last suggestion may be replaced by a new
lookup; anything else is the Contributor's own words and is left alone.

### Verified

Against the live form (dev :3012, Calendar `ticket-ten-test`, year 2026):

- **YouTube** `youtube.com/watch?v=xO5AoP4JNz8` → title "Le Chaser", artist
  "Donato Dozzy - Topic", cover `i.ytimg.com/vi/xO5AoP4JNz8/hqdefault.jpg`.
- **SoundCloud** `soundcloud.com/pomelorecords/pomcast20-danlodig` → title
  "POMCAST 20 - DAN LODIG", artist "pomelo", cover
  `i1.sndcdn.com/artworks-…-t500x500.jpg`.
- **The edit wins.** Corrected the artist by hand to "Donato Dozzy", submitted,
  and D1 holds `Donato Dozzy` — not the lookup's "Donato Dozzy - Topic". The
  correction also survived picking a Day, which re-renders the form.
- **`cover_url` populated, `cover_key` null** on both Tracks of that Submission.
  Ticket 12 owns `cover_key`; an edit never names it, so an upload cannot be
  wiped by a lookup.
- **Unrecognised**: a `bandcamp.com` track URL left every field empty, showed no
  error, and the form stayed submittable.
- **Unreachable**: `this-host-does-not-exist-31337.invalid` behaved identically.
- **Never blocking**: with both of those in flight, zero inputs were disabled and
  no field refused typing; the failing lookup simply resolved to nothing.

`tsc` clean, `eslint` clean on all four files.

### Left undone

Not exercised against the deployed application. The Worker's `fetch` to the
oEmbed endpoints is a subrequest and behaves the same locally as deployed, but
that is reasoning rather than evidence.
