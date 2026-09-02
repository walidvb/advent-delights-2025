# 10: Claim a Day and submit Tracks

**What to build:** A Contributor opens the Submit slug, sees which Days are still free, claims one, fills in a Track for each Variant, and gets back a link that lets them come edit it later.

They never see anyone else's content while doing this — helping build the Calendar must not spoil it for them. They have no account and never create one.

Claiming happens on submit, not on selection: the first Submission to land takes the Day. Whoever loses the race is told plainly and keeps everything they typed.

**Blocked by:** 08

**Status:** done

- [x] The Submit slug shows a grid of Days marked claimed or free, with no Track content anywhere in it
- [x] Claimed Days show nothing about what was submitted, not even a Track title
- [x] A Contributor picks a free Day and fills a Track per Variant: source link, title, artist, description, buy link
- [x] They give a name to be credited under and, optionally, a link to themselves
- [x] Giving an email address is optional and submitting without one works
- [x] Only Days that have not yet revealed are offered; already-open Days are not claimable
- [x] Two Submissions for the same Day cannot both succeed; the loser is told to pick another and keeps their typed content
- [x] A Calendar with every Day claimed says it is full instead of showing an unusable form
- [x] After submitting, the Contributor is shown an edit link and the Calendar's own link
- [x] Returning with the edit link lets them change their own Submission and nobody else's
- [x] Having submitted once is remembered in the browser and gently discourages claiming a second Day, without enforcing it
- [x] Submitting purges the Calendar's cached payload

## Comments

Three new routes, one new module, and no account anywhere.

- `src/lib/submissions.ts` — Submission intake: the claim view, the claim, and
  the edit.
- `src/app/submit/[submitSlug]/` — the Submit slug's page and its form.
- `src/app/submit/SubmissionFields.tsx` and `actions.ts` — the fields and the two
  server actions, shared by claiming and editing.
- `src/app/edit/[editToken]/` — one Contributor's own Submission.

### The routes

`/submit/<submit slug>` and `/edit/<edit token>`, both spelled-out words per the
spec's *Routes*. `submitPath` already existed in `src/lib/calendars.ts` from
ticket 07; `editPath` is its neighbour in `submissions.ts`.

The edit link is a standalone route rather than something under the Submit slug,
because the two are shared with different people at different times: a
Contributor who has lost the Submit slug still holds their own link, and
ticket 14 will email exactly this URL.

### The race, and why nothing is checked before inserting

`createSubmission` inserts and catches. There is no "is this Day free?" query in
front of the write — that would have a gap between the look and the insert, and
the unique index on `(calendar_id, day)` from ticket 08 already decides. The
Submission and its two Tracks go in as **one `db.batch`**, which D1 runs as a
transaction, so a lost race writes nothing at all rather than leaving Tracks
behind. A unique-constraint failure is read off the error message (and its
`cause`) and returned as `'taken'`.

The loser keeps their work because the action is a `useActionState` action that
returns rather than redirects: the draft comes back in the state, the form is
remounted with `key={state.attempt}` so every field's `defaultValue` is what
they typed, and the freshly re-read grid comes back with it so the Day they lost
now shows as claimed and their selection is cleared. They pick another Day and
press the button again.

### Nothing about anyone else's Tracks, anywhere

`getSubmitView` selects `s.day, s.credited_to` and nothing else — there is no
query in this module that reaches `tracks` for anybody but the holder of a
Submission's own edit token. That is the same requirement ticket 13 has for the
Curator, and the same way to check it: read the raw response.

### Two guards a Contributor is anonymous enough to need

- **Only unrevealed Days.** `claimableDays(year, now)` from ticket 04 decides,
  and it is asked again inside `createSubmission` — a form loaded before a Day
  opened cannot claim it afterwards.
- **`javascript:` is not a link.** Everything a Contributor types that becomes an
  `href` — their own link, a Track's URL, a buy link — goes through `safeLink`,
  which accepts http(s) only and assumes https for a pasted `example.com/thing`.
  Without it an anonymous form would be stored XSS on the Calendar.

Titles, artists and reasons are required; the buy link, the link to yourself and
the email address are not. Cover columns are never written here — tickets 11 and
12 own them, and an edit deliberately leaves them alone.

### Verified

By hand, per the spec. `next dev` on :3012 and the Worker on :8788, both against
local D1 and R2. A Calendar for the current year — "Ticket Ten Test", 2026 — was
made through the Curator dashboard and everything below happened in it, since
every Day of the seeded 2025 Calendar has revealed.

- **No Track content in the Submit slug's response.** The raw HTML (which
  carries the RSC payload) was fetched for the closed 2025 Calendar, for the
  2026 one with Days claimed, and for the full one, and grepped for every
  seeded and submitted title, artist, URL, description and cover path: **zero
  hits every time**. The only matches for `youtube`/`bandcamp` are the form's
  own placeholder text. Credited names are present, three times each, as
  intended.
- **The race, twice.** Two browser tabs on the same free Day, both forms filled,
  both submitted — the second time with both requests in flight together. Each
  time exactly one Submission landed, the loser saw "Someone claimed Day 9 just
  before you did. Pick another — everything you typed is still here.", their
  grid showed the Day as the winner's, and **every field still held what they
  had typed**, down to a two-line description. The loser then picked another Day
  and claimed it with that same content. Afterwards: no extra Submission rows,
  and **zero orphan Tracks** — the failed batch wrote nothing.
- **An already-revealed Day cannot be claimed.** The form was loaded while the
  Calendar was 2026, the Calendar's year was then set to 2025 behind it, and the
  Submission was sent: refused with "Day 12 has already opened, so it can't be
  claimed. Pick another." and no row written. The 2025 Calendar's Submit slug
  shows all 25 Days "opened" and no form at all.
- **Full.** With every remaining Day filled in the database, the page says "Every
  free Day here has been claimed. This Calendar is full." and shows no form.
- **Email is optional.** Five of the six Submissions made were sent with the
  field empty and all succeeded. Nothing is mailed — ticket 14.
- **The edit link.** It opens that Submission's own values, and only its own; a
  title changed through it changed exactly one Track row, and no other
  Submission in either Calendar. A token nobody holds is a plain 404, as is an
  unknown Submit slug.
- **A refused save keeps the typing too.** `javascript:alert(1)` in a Track's URL
  is refused with "The light track's link doesn't look like a web address." and
  the edited title beside it survives. Same for a missing artist on the claim
  form.
- **The purge, on the Worker.** The Calendar page was loaded to warm
  `caches.default`, a Track title was then changed in D1 behind its back and the
  page kept serving the stale one — proving the cache was live. A new Submission
  through the Submit slug made the very next load show both the new Day **and**
  the changed title. Saving through an edit link does the same.
- **The browser remembers.** After claiming, `advent.submitted.<submit slug>`
  holds the edit path, and a later visit shows "You've already claimed a Day in
  this Calendar on this device" with a link to it — with the form still there
  underneath, because this is a reminder and not a rule.
- `npx tsc --noEmit` clean. `npm run lint` reports the same 8 problems as before,
  none in a file this ticket touched.

### Left undone

- **Not run against the deployed application**, which the spec asks for once
  ticket 01's credentials exist. The deployed D1 and R2 are still empty.
- **The local database keeps the test Calendar** ("Ticket Ten Test", Slug
  `ticket-ten-test`, six Submissions on Days 5, 7, 9, 10, 13 and 14). It is a
  current-year Calendar with a mix of claimed and free Days, which is what
  ticket 13 will want to develop against. Delete it if it is in the way.
- `ponytail:` a Contributor who loses their edit link and gave no email address
  has no way back to their Submission. That is the deal the spec makes —
  no accounts, no identity — and the receipt email in ticket 14 is the mitigation.
