# 13: Curator dashboard

**What to build:** The Curator sees how full their Calendar is and exactly who has claimed which Day — and nothing at all about what those people submitted. The person who organised the surprise gets to be surprised.

When they genuinely need to look — a broken link, something inappropriate — revealing a single Day is an explicit, warned action, so seeing a spoiler is always a decision they made.

They can remove a Submission without ever looking at it.

**Blocked by:** 07, 10

**Status:** done

- [x] The dashboard shows each Day as claimed or free, and shows the credited name on claimed Days
- [x] The response carries no Track titles, links, descriptions or covers anywhere. Read the raw response and confirm — this is the one failure here that looks like a working page
- [x] The Curator can delete a Submission by Day without revealing its content first
- [x] Revealing a single Day requires an explicit action behind a warning that says it will spoil that Day
- [x] Revealing one Day does not reveal any other
- [x] A count of claimed Days is visible, so the Curator knows who to chase
- [x] Deleting purges the Calendar's cached payload and frees the Day for someone else, subject to the usual rule that it has not yet revealed
- [x] None of this is reachable for a Calendar the signed-in person does not own

## Comments

One new module, one new page, and one section added to the page ticket 07
already built.

- `src/lib/curation.ts` — the whole Curator-side view of a Calendar: claim
  state, the single-Day reveal, deletion.
- `src/app/dashboard/calendar/[id]/day/[day]/page.tsx` — one Day: delete it, or
  spoil it.
- `src/app/dashboard/calendar/[id]/page.tsx` — the grid and the count, above the
  settings form that was already there.
- `src/app/dashboard/actions.ts` — `deleteSubmissionAction`.
- `src/lib/calendar-payload.ts` — `coverPath` exported, so the reveal renders an
  uploaded cover through the same `/cover/` path the viewer uses rather than
  building its own.

### The leak is a property of the query, not of the page

`getClaims` selects `day, credited_to from submissions` and joins nothing. A
Track column cannot appear in the dashboard's response because it is never
fetched — there is no filtering, no "don't render this" and no client component
holding a prop it declines to show. `revealDay` is the only read in the module
that touches `tracks`, it has exactly one caller, and that caller runs only when
`?spoil=1` is on the URL.

`getClaim` is what the Day page uses before deciding anything: it answers "who
claimed this" and nothing else, so arriving at the Day page, submitting the
delete form, or hovering the grid link never reads a Track.

### The warning, and why the button is a plain `<a>`

`/dashboard/calendar/<id>/day/<n>` says what the reveal will do — "This will
show you the tracks X chose for Day n, and you won't be able to unsee them" —
and the control under it reads "Spoil Day n for me". It is a plain anchor to
`?spoil=1` rather than a `<Link>` **on purpose**: `<Link>` prefetches on hover,
which would pull the spoiled payload into the browser before the Curator had
decided anything. A stray hover must not be able to spoil a Day.

Reveal is scoped to one Day by the query — `where s.calendar_id = ?1 and
s.day = ?2`. Spoiling Day 5 cannot tell the Curator anything about Day 6.

### Deletion

`deleteSubmission` deletes the Tracks and then the Submission in one `db.batch`,
so a Submission can never be left behind with its Tracks gone or vice versa, and
calls `purgeCalendarPayload` — the same function ticket 09 wrote and tickets 10
and 11 already lean on. The Day is freed by the row disappearing; nothing else
is needed, because `claimableDays` still refuses a Day that has revealed, so a
deletion cannot reopen a door people have already looked behind.

Nothing is read from `tracks` on the way, so a Submission can be removed unseen.

### Ownership

Every entry point in `curation.ts` takes a `curatorId` and starts with
`getOwnedCalendar` from ticket 07, which is already scoped by `curator_id`.
There is no unscoped lookup in the module. Somebody else's Calendar is a 404 at
the grid, at a Day, and at `?spoil=1`; the delete action re-checks inside
`deleteSubmission` rather than trusting the hidden `id` in the form.

### Verified

By hand, per the spec — no automated tests. Two runtimes, because the edge cache
only exists in one of them: `next dev` on :3012 against the local D1, and an
isolated OpenNext Worker preview on :8790 built from a copy of the tree with its
own copy of the local D1 and R2. Driven by `curl` throughout, which is also the
no-JavaScript path, gives a second signed-in Curator an independent cookie jar,
and lets a forged form body be posted deliberately. Both Curators signed in for
real with an emailed six-digit code read from the server console. `ticket-ten-test`
(2026) was the Calendar, with its mix of claimed and free Days.

**The leak check.** Every distinct Track string in the whole database — 332 of
them, every title, artist, URL, description, buy link and cover value from both
the seeded 2025 Calendar and the test one — dumped to a file, then grepped for
in the raw response of every page this ticket adds:

```
npx wrangler d1 execute advent --local --json --command \
  "select title, artist, url, description, buy_link, cover_key, cover_url from tracks" \
  | python3 -c "...write every value >= 3 chars to track-content.txt..."

CAL=73dd783a-abf8-4c07-8385-76f137101b53
for p in "/dashboard" "/dashboard/calendar/$CAL" "/dashboard/calendar/$CAL/day/5" \
         "/dashboard/calendar/$CAL/day/14"; do
  curl -s "http://localhost:8790$p" -b w.jar -o w.html
  grep -F -o -f track-content.txt w.html | sort -u          # HTML, incl. the inline RSC payload
  curl -sL -H 'RSC: 1' -H 'Next-Url: /dashboard' "http://localhost:8790$p" -b w.jar -o w.rsc
  grep -F -o -f track-content.txt w.rsc | sort -u           # the flight payload a client navigation gets
done
```

Output, on the Worker and again on `next dev`, for the dashboard, the
per-Calendar page and two different Day pages, in HTML and in the RSC flight
payload: **nothing. Eight empty greps.** The responses are 8–27KB and carry
credited names, the counts and the controls; not one of the 332 strings is in
any of them.

The same grep against `?spoil=1` for Day 5 returns exactly eight strings —
`Quiet Five`, `Loud Five`, `The Softs`, `The Louds`, both track URLs, both
descriptions and the buy link — and **nothing belonging to Days 7, 9, 10, 11,
12 or 14**. The reveal is scoped to the Day asked for. Repeated on the Worker
for Day 14 with the same result.

- **The count.** "10 of 25 Days claimed", then 8 after a deletion (another agent
  had added and removed one in between); 7 on the Worker's copy after the
  deletion there. The grid renders each Day as a name, `free`, or
  `empty — opened`.
- **Delete without revealing.** Day 13 deleted straight from its Day page, with
  `?spoil=1` never once requested for it. Both Track rows went with it, zero
  orphan Tracks left behind, and the Day page became a 404.
- **The Day is freed.** After the deletion the grid shows Day 13 `free` and the
  Submit slug offers it again as `Day 13: free`, so a Contributor can take it.
  A Day that has already revealed stays unclaimable — that is `claimableDays`,
  unchanged from ticket 04.
- **The purge, on the Worker.** The Calendar page was loaded to warm
  `caches.default`, then a Track title was changed in D1 behind its back and the
  page kept serving the stale one — proving the cache was live. Deleting Day 12
  through the dashboard made the very next load of `/calendar/ticket-ten-test`
  show the changed title **and** drop the deleted Day. The purge fires on
  deletion, not by luck of a cache miss.
- **Not yours.** A second Curator (`second-curator@example.com`, signed in for
  real) got 404 on the per-Calendar page, on a Day page, and on `?spoil=1` —
  with no Track content in any of those responses either. Posting the delete
  action with the other Curator's Calendar id in the body returned the same 303
  a mistyped id gets and **Day 14 was still there afterwards**.
- **Signed out.** Both the Calendar page and `?spoil=1` redirect to `/sign-in`.
- `npx tsc --noEmit` clean; `eslint` clean on all five files.

### Left undone

- **Not run against the deployed application.** Local D1 and R2 only, as with
  tickets 10 and 11.
- **An uploaded cover is not deleted from R2** when its Submission is. Ticket 12
  owns the bucket and nothing writes `cover_key` yet, so today this deletes
  nothing that exists. `ponytail:` orphaned objects cost nothing but bytes;
  sweep them if the bucket ever matters.
- **The claimed count is only on the per-Calendar page**, not on the cards in
  the Calendar list. One more query per Calendar for a number the Curator sees
  one click later.
- **`getOwnedCalendar` runs twice** on the per-Calendar page — once for the
  settings form, once inside `getClaims`. Two indexed reads by primary key;
  merging them would widen `getClaims`' return type for no gain.
- **Deletion has no second confirmation**, beyond having to navigate to the
  Day's own page to find the button. The page says there is no undo.
