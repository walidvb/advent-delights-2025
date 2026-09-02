# 15: Archive after the 25th

**What to build:** Once Christmas has passed, a Calendar becomes a permanent record: every Day open, nothing more to add, still living at the same link.

Someone finding the link in February sees the whole thing straight away rather than waiting for dates that have already gone.

**Blocked by:** 09, 10

**Status:** done

- [x] A Calendar whose year has passed shows every Day open, with no waiting
- [x] The Submit slug for such a Calendar refuses new Submissions and says why
- [x] Existing edit links no longer change an archived Calendar
- [x] The Calendar stays reachable at its original Slug indefinitely and is never deleted
- [x] A Curator running a new Calendar for a new year does not disturb the archived one

## Comments

Four of the five criteria were already true. The one that was not is the edit
link, and it is the whole of the code here: **an Archive was still writable by
anyone holding a valid edit token.**

### What already held, and how it was proved

- **Every Day open, no waiting.** Ticket 04's `revealedDayCount` already returns
  25 for any year already past, and `CalendarCard` derives `isInactive` from it.
  Nothing was written for this. Against `/calendar/advent-delights-2025` today
  (September 2026): 25 tiles, **0 carrying the inactive frosted class**, every
  one clickable. `/calendar/ticket-ten-test` (2026) side by side: 25 tiles, **25
  frosted**, none clickable. The rule is the year, not the platform.
- **The Submit slug refuses and says why.** Ticket 10 already asks
  `claimableDays` twice — once in `getSubmitView` for the grid and again inside
  `createSubmission` before the insert. The archived Submit slug renders **zero
  forms, zero inputs, zero enabled buttons** and "Every Day of this Calendar has
  already opened, so there is nothing left to claim.", above a grid showing all
  25 Days as `opened`. The wording was left exactly as it was: it names the
  reason, and rewriting working copy is not a change.
- **Reachable at its Slug, never deleted.** Nothing in the tree deletes a
  Calendar — `grep 'delete from'` finds `tracks`, `submissions`, `sign_in_codes`
  and `sessions`, and no `calendars`. The Slug still serves 200, and ticket 09's
  cache is keyed per Slug and only ever purged, never expired away from the
  database behind it.
- **A new year does not disturb the archived one.** The 2026 Calendar was
  claimed into, edited, aged and restored throughout this work; the 2025
  Calendar ended with the same 24 Submissions and 48 Tracks it started with and
  the same rendered page. `purgeCalendarPayload(slug)` takes a Slug, so a write
  to one Calendar cannot touch another's cached payload.

### What was added

`isArchived(year, now)` in `src/app/advent/reveal.ts` — one line beside the two
rules it lives with. It is deliberately **a day later than the point where
`claimableDays` runs out**: that one is about claiming, and a Day cannot be
claimed once it has opened, whereas this one is about the Calendar being
finished. It was written the other way first — every Day revealed, so from
00:00 on the 25th — and that is wrong twice over: CONTEXT.md says an Archive is
what a Calendar becomes *after the 25th*, and on Christmas morning the last Day
is still opening and a Contributor should still be able to fix a broken link in
it. So the boundary is midnight ending the 25th, which is also what "Once
Christmas has passed" in the ticket means.

The refusal itself lives in **`updateSubmission`**, in front of the only write,
not in the page and not in the action:

```ts
if (isArchived(submission.calendar_year, new Date())) return 'archived';
```

`getSubmission` gained the same fact as `archived: boolean`, so the edit page
can render the Submission without offering a form for it, and
`saveSubmissionAction` turns `'archived'` into a sentence — two lines, kept
small deliberately because ticket 14 owns that file.

The edit link keeps working: a Contributor still opens it and still sees their
own Submission. It just says the Calendar has finished and will keep it at that
link for good.

### Verified

By hand, per the spec. `next dev` on :3012 against local D1 and R2.

- **The edit refusal is server-side, and posted directly.** The
  `saveSubmissionAction` server action was POSTed straight at
  `/edit/<2025 token>` with curl — no page, no button, no JavaScript — carrying
  a rewritten credited name and both Track titles. The Submission was
  **unchanged afterwards**: still Phil E Bloomfield, still `Birds` and
  `Neuralgia`, still the original YouTube URLs.
- **…and the control proves the POST itself works.** The byte-identical POST
  against a Submission in the 2026 Calendar **did** write — `Quiet Five` became
  `DIRECT POST OK` — so the archived refusal is the guard, not a malformed
  request. Restored afterwards.
- **The same for claiming.** The `submitAction` server action POSTed directly at
  the archived Submit slug for Day 25 wrote nothing: 36 Submissions before, 36
  after, zero rows named `Late Arrival`, zero orphan Tracks. The identical POST
  at the 2026 Submit slug claimed Day 25 successfully; that row was then
  deleted.
- **A form loaded before the Calendar aged.** Ticket 10's technique, on the edit
  side: the 2026 Submission's edit form was opened, a title typed into it, the
  Calendar's year set to 2025 in D1 behind the open page, and Save pressed. The
  form answered "Ticket Ten Test has finished — an Archive can no longer be
  changed.", nothing was written, and **everything typed survived**, the same
  keep-your-work behaviour a lost race gets. Year restored to 2026 afterwards.
- **The archived edit page.** `/edit/<2025 token>` renders the Submission's
  heading and "Advent Delights has finished — every Day has opened, and it is
  now an Archive that stays exactly as it was.", with **no form and no input in
  the response at all** — and the link to the Calendar still there.
- **Editing still works normally for a live Calendar.** Through the browser, on
  the 2026 Calendar: a title changed, "Saved. Your Day on the Calendar has
  changed already.", one Track row changed in D1. Restored.
- `npx tsc --noEmit` clean. `npm run lint` reports the same 8 problems as
  before, none in a file this ticket touched.

### Left undone

- **Not exercised on the Worker or against the deployed application.** The
  change is a year comparison and a conditional render — no new binding, no new
  D1 or R2 API, no caching behaviour — so nothing here behaves differently under
  `workerd`, and an OpenNext build was skipped rather than run beside another
  agent's. Worth a glance whenever the next deployed pass happens.
- **An Archive is decided against the server's clock**, unlike Reveal, which the
  spec puts on the viewer's device. The asymmetry is unavoidable — a refusal to
  *write* cannot be judged on the writer's own clock — but it means the Worker's
  UTC decides, so a Contributor well west of UTC loses their edit link some hours
  before their own midnight on the 25th. Same class as the spec's "no timezone
  handling", and the same size of consequence.
- **`ponytail:`** two Curator writes still reach an archived Calendar, both
  outside this ticket's criteria and both pre-existing. `deleteSubmission` in
  `src/lib/curation.ts` removes a Submission with no year check — CONTEXT.md's
  "never deleted" is about the Calendar rather than about a Curator tidying one
  Submission inside it, so it was left alone; and `updateCalendar` will still
  edit an archived Calendar's Slug, which a Curator can only do to their own
  links on purpose. Guard both with `isArchived` the day either reading changes.
- **`saveSubmissionAction` still reports `saved: true` if `updateSubmission`
  returns `null`** — the Submission having vanished between the read and the
  write. Pre-existing, and a one-line fix (`if (!result) return { attempt,
  error: 'This edit link is not valid.', draft };`), but that file belongs to
  ticket 14 while it is in flight and this is not ticket 15's bug.
