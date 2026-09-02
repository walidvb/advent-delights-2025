# 14: Submission receipt email

**What to build:** A Contributor who chose to give an email address receives their edit link by email, so closing the tab does not cost them the ability to fix a typo.

Giving an address stays optional. This is the only mail a Contributor ever receives — there is deliberately no daily "today's Day is open" message.

**Blocked by:** 05, 10

**Status:** done

- [x] Submitting with an email address sends a receipt containing the edit link and the Calendar's link
- [x] Submitting without one completes normally and sends nothing
- [x] The link in the email works and opens that Contributor's own Submission
- [x] A failure to send does not fail the Submission — the Submission is saved either way and the on-screen edit link is still shown
- [x] No other automated mail is sent to Contributors

## Comments

One function, one file: `sendReceipt` in `src/app/submit/actions.ts`. No new
module — the whole of it is a `sendEmail` call and a `try`, and ticket 05 and
ticket 10 had already built both ends.

### Ordering, which is the whole ticket

`submitAction` calls `createSubmission` first. By the time `sendReceipt` runs
the row is written, the two Tracks are written and the Calendar's cached payload
is purged; `claimed` — the same `{ editPath, calendarPath }` the page renders —
is already computed. `sendReceipt` cannot reach any of that, and it swallows its
own failure, so the only observable difference between a provider that works and
one that refuses is a line in the server log. The Contributor sees the same two
links either way.

The `if (!email) return` guard is inside `sendReceipt` rather than at the call
site, so "no address means no mail" is stated once, next to the doc comment that
promises it.

### What the mail says

Subject `Your Day in <Calendar name>`; body thanks them, gives the edit link
described as the only way back in, gives the Calendar's link for December, and
closes with "This is the only message we'll send you." — which is a promise the
spec actually keeps: `sendEmail` has exactly two callers, this one and the
Curator's sign-in code in `src/lib/auth.ts`.

Both links are absolute, built from the incoming request's `Host` and
`x-forwarded-proto` exactly as the Curator dashboard does, so localhost, preview
and production all mail their own address with no configuration. Marked
`ponytail:` — a forged `Host` only misdirects the forger's own receipt to the
address they typed themselves.

### Verified

By hand on `next dev` at :3012, against the "Ticket Ten Test" 2026 Calendar.
With no `.dev.vars` and so no `RESEND_API_KEY`, every message went to the server
console as ticket 05's fallback promises — nothing was sent to a real address.

- **With an address.** Day 18 claimed as "Receipt Tester" with
  `receipt-tester@example.com`. The console carries the whole message: subject
  `Your Day in Ticket Ten Test`, `http://localhost:3012/edit/f7c5…`, and
  `http://localhost:3012/calendar/ticket-ten-test`.
- **The emailed link is theirs.** Opening that edit URL gives "Day 18 · Ticket
  Ten Test" with `credited_to=Receipt Tester` and both of that Submission's own
  Tracks — nobody else's. The Calendar link is a 200.
- **Without an address.** Day 19 claimed with the field empty: the claim
  succeeded, both links appeared on screen, and that `submitAction` POST
  produced **no `[email]` line at all**.
- **A refused send.** `sendEmail` was temporarily made to throw for the single
  address `boom@example.com` — gated on the address rather than thrown
  unconditionally so the Curator sign-in path stayed usable — and Day 20 was
  claimed with it. The Submission saved, the on-screen edit link appeared, the
  edit URL served "Boom Tester / Day 20", and the log shows
  `[receipt] submission saved but the receipt did not send Error: forced send
  failure`. `src/lib/email.ts` was then reverted and is byte-identical to its
  committed version.
- `npx tsc --noEmit` clean. `npm run lint` reports the same 8 pre-existing
  problems in `Player.tsx` and `VariantSwitch.tsx`, none in a file this ticket
  touched.

Per the spec, no automated tests were added.

### Left undone

- **Not exercised on the Worker or deployed.** The absolute-link trick is the
  only thing that could behave differently there, and it is the same
  `Host`/`x-forwarded-proto` read the Curator dashboard already does and ticket
  10 already ran on the Worker. Worth one pass when ticket 01's deployment is
  real.
- **No real message has ever been sent** — ticket 05's own remaining boxes cover
  that, and this ticket needs no separate inbox test beyond them.
