# 06: Curator sign-in

**What to build:** A person types their email address, receives a six-digit code, types it in, and arrives at their dashboard. It is empty, because they have no Calendars yet.

There are no passwords, and deliberately no Google or GitHub sign-in. Only Curators have accounts; Contributors never will.

**Blocked by:** 01, 05

**Status:** done

- [x] Submitting an email address sends a six-digit code to it
- [x] Entering a correct code signs the person in and lands them on their dashboard
- [x] A wrong or expired code is refused with a clear message and can be retried
- [x] The session survives a page reload and a browser restart
- [x] Signing in with the same email on a second device reaches the same account
- [x] Visiting the dashboard while signed out redirects to sign-in rather than erroring
- [x] Signing out works

## Comments

### Implementation notes

Four files, no new dependency — Web Crypto, D1 and Next's own form/Server Function
plumbing cover all of it.

- `migrations/0001_curator_accounts.sql` — `curators`, `sign_in_codes`, `sessions`.
- `src/lib/auth.ts` — the whole module: code issue, code check, session read/write.
- `src/app/sign-in/page.tsx` + `actions.ts` — one route, two states.
- `src/app/dashboard/page.tsx` — the empty dashboard.

**One route, two states.** `/sign-in` shows the email form, or the code form when
a pending-code cookie is present. Both forms are plain `<form action={…}>` bound
to Server Functions, so there is no client component and the flow works with
JavaScript off (verified: `curl` gets a 303 to `/dashboard`). Errors come back as
`?error=invalid|expired|locked|email` and render as one sentence above the form.

**Code lifetime: 10 minutes.** Long enough to switch to a mail app and back,
short enough that a code left in an inbox is not a standing key.

**Attempt limit: 5 wrong guesses**, counted on the row, after which the code is
deleted and a new one must be requested. Five tries against 10^6 is a 1-in-200,000
brute force, and a Curator who fat-fingers twice is not locked out. Requesting a
new code also deletes any previous code for that address, so only one is ever live.

**Nothing about the code is stored.** `sign_in_codes.code_hash` is
`SHA-256("<row id>:<code>")` — the row id salts it, so identical codes in two rows
do not collide. The session cookie is likewise a 32-byte random token whose
SHA-256 is what `sessions.id` holds: a dump of the table cannot be replayed.

**The pending-code cookie holds a row id, not the email.** That keeps the address
out of URLs and out of anything the browser can read, and lets the code form be a
single field. The "we sent a code to …" line reads the address back from the row.

**Sessions.** `HttpOnly; Secure; SameSite=Lax; Max-Age=7776000` — ninety days, so
a Curator who sets up in November is still signed in on the 25th. Persistent
rather than a session cookie, which is what makes it survive a browser restart.
Signing out deletes the row as well as the cookie, so a copied cookie dies too.

**Email.** `requestSignInCode` calls `sendEmail` and never asks whether email is
configured — exactly the contract ticket 05 wrote down. With no `RESEND_API_KEY`
the code is printed by the server, which is how it was read during verification.

### The migration, and how to apply it

`migrations/0001_curator_accounts.sql`, in wrangler's default `migrations/`
directory, so `wrangler.jsonc` needed no change.

```
npx wrangler d1 migrations apply advent --local     # local emulation (dev + preview)
npx wrangler d1 migrations apply advent --remote     # once the real D1 exists (ticket 01)
```

Purely additive: three new tables and one index, no change to anything existing.
Ticket 07 adds `calendars` in its own migration without touching these.

### What was verified, and how

By hand against `next dev` with the real bindings, driving a browser and `curl`.
Both, because the browser proves the interface and `curl` proves the no-JavaScript
path and lets the raw `Set-Cookie` headers be read. Codes were read out of the
server console. Per the spec, no automated tests were added.

- **Email → code.** Submitted `curator@example.com`; the server logged
  `[email] … subject=485534 is your Advent Delights sign-in code`. Ticked on the
  strength of `sendEmail` being called with the right address and code — real
  inbox delivery is ticket 05's remaining human step, and the sign-in path
  deliberately cannot tell the difference.
- **Correct code → dashboard.** Landed on `/dashboard` showing "You haven't made
  a Calendar yet."
- **Wrong code.** `000000` → "That code isn't right. Check it and try again.",
  code form still there, and the correct code then worked.
- **Attempt limit.** Five wrong codes in a row: four `?error=invalid`, the fifth
  `?error=locked`, the sixth `?error=expired` (the row is gone by then). Separately
  confirmed the correct code still works after four wrong ones.
- **Expired code.** Forced `expires_at = 1` on a live row via
  `wrangler d1 execute`, then submitted the real code → "That code has expired.
  Ask for a new one.", and the page falls back to the email form.
- **Reload.** Reloaded `/dashboard` — still signed in. `/sign-in` while signed in
  bounces to `/dashboard`.
- **Browser restart.** Not a literal restart: the cookie is written with
  `Max-Age=7776000` and an `Expires` date (confirmed in the raw response header,
  and in curl's on-disk jar as a non-session cookie), and a fresh `curl` process
  reading that file was still signed in. That persistence is the whole mechanism.
- **Second device.** Signed in again from a separate cookie jar with
  `CURATOR@Example.com ` — different case, trailing space. D1 afterwards:
  `curators=1, sessions=2, distinct curator_id=1`. Same account, and address
  normalisation works.
- **Signed out.** `curl` and browser both get `307 → /sign-in` for `/dashboard`
  with no cookie. No error page.
- **Sign out.** The button clears the cookie, deletes the row, and lands on
  `/sign-in`; `/dashboard` then redirects.
- **The ticket-01 landmine.** `next build` still reports `/` as `○ (Static)`;
  only `/sign-in` and `/dashboard` are `ƒ (Dynamic)`. Nothing was added to the
  root layout.
- `npx tsc --noEmit` clean. `eslint` clean on the four new files; the 8
  pre-existing problems in `src/app/advent/*` are untouched.

Verification ran in a throwaway copy of the tree on port 3007, because another
agent was mid-flight on ticket 02 with servers on 3000 and 8788 sharing `.next`.

### Deliberately not built

- **No rate limit on requesting codes.** One live code per address is the only
  brake. Marked `ponytail:` in `requestSignInCode`; add a per-address cooldown if
  anyone abuses it.
- **No sweep of expired session rows.** They are rejected on read and left in
  place. Marked `ponytail:` in `getCurator`.
- No Calendar creation, no list — the dashboard is deliberately empty. Ticket 07.
