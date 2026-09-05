# 07: Create a Calendar

**What to build:** A signed-in Curator names a Calendar and gets it back, ready to share. The dashboard lists the Calendars they own.

The Calendar's Slug is derived from its name and is readable, so the link looks like the community rather than a random string. The Curator can edit it — obscurity, if they want it, is their choice of Slug. A separate Submit slug is generated as a secret and is never derived from the name.

**Blocked by:** 06

**Status:** done

- [x] Creating a Calendar needs only a name; a description is optional
- [x] The Slug is derived from the name and is readable
- [x] A Slug that is already taken gets a numeric suffix rather than being rejected
- [x] The Curator can edit the Slug afterwards, with the same collision handling
- [x] A Submit slug is generated separately, is not guessable, and is not derived from the name
- [x] The Calendar records the current year without asking
- [x] A public flag can be toggled; it affects listing only and nothing lists Calendars yet
- [x] The dashboard lists the Curator's Calendars with both links available to copy
- [x] A Curator can create more than one Calendar
- [x] A Curator cannot see or edit a Calendar they do not own

## Comments

### Implementation notes

Five files, no new dependency. D1, Web Crypto and Next's own form/Server Function
plumbing cover all of it, exactly as ticket 06 did.

- `migrations/0002_calendars.sql` — `calendars`, `calendar_variants`.
- `src/lib/calendars.ts` — the whole module: slug derivation, collision handling,
  create, list, owned-read, update.
- `src/app/dashboard/actions.ts` — `createCalendarAction`, `updateCalendarAction`.
- `src/app/dashboard/page.tsx` — the list plus the "make a Calendar" form.
- `src/app/dashboard/calendar/[id]/page.tsx` — per-Calendar settings.
- `src/app/dashboard/CopyLink.tsx` — the one client component: a link shown in
  full with a copy button.

**Ownership is a property of the module, not of the pages.** Every query in
`src/lib/calendars.ts` carries `curator_id`; there is deliberately no unscoped
lookup by id to reach for by accident. `getOwnedCalendar` returns null for
somebody else's Calendar and the settings page turns that into a 404, so a
Calendar that isn't yours is indistinguishable from one that doesn't exist.
`updateCalendar` re-checks ownership itself rather than trusting the hidden `id`
in the form, so a forged id writes nothing.

**Two forms, two Server Functions, no client state.** Both are plain
`<form action={…}>`, so creating and editing work with JavaScript off — which is
also how most of the verification below was driven.

### The schema, and how to apply it

`migrations/0002_calendars.sql`, in wrangler's default `migrations/` directory,
so `wrangler.jsonc` needed no change. Purely additive: nothing in 0001 is touched.

```
npx wrangler d1 migrations apply advent --local     # local emulation (dev + preview)
npx wrangler d1 migrations apply advent --remote     # once the real D1 exists
```

```sql
calendars(
  id text primary key,
  curator_id text not null references curators(id),
  name text not null,
  description text not null default '',
  year integer not null,
  slug text not null unique,
  submit_slug text not null unique,
  is_public integer not null default 0,
  created_at integer not null
)
create index calendars_curator on calendars (curator_id);

calendar_variants(calendar_id, variant, label, position, primary key (calendar_id, variant))
```

`slug` and `submit_slug` are both `unique`, so the database is the backstop
under the collision handling rather than the app being the only guard.
`calendar_variants` is written on create (`light`, `heavy`) and read by nothing
yet; it is here because the spec's data model puts a Calendar's Variants on the
Calendar — "Per-Calendar Variant labels are stored but unused for now."

### Slug collision handling, on both paths

`slugify` folds accents (NFD, strip combining marks), drops apostrophes, collapses
everything else to single hyphens, caps at 60 characters and trims the ends. A
name of pure punctuation still gets an address: it falls back to `calendar`.
`Bräkkfäst Café  Advent!! 2026` → `brakkfast-cafe-advent-2026`.

`freeSlug(base, exceptId)` then walks `base`, `base-2`, `base-3`… and returns the
first free one. **Create and edit call the same function**; the only difference is
`exceptId`:

- **Create** passes `null`, so every existing row counts as a collision.
- **Edit** passes the Calendar's own id, excluded via `id is not ?2`. That is what
  lets a Calendar keep the Slug it already holds — without it, saving the settings
  form unchanged would bump the Slug to `-2` every single time. Verified
  explicitly: saving twice with no changes leaves the Slug alone.

An emptied Address field on the edit form falls back to the (possibly new) name,
so there is no way to end up with no address.

A taken Slug is never a rejection, but it is no longer silent either: `freeSlug`
reports whether the base had to be given up, and both actions redirect to
`/dashboard?taken=<slug>`, which renders one sentence naming the address the
Calendar actually got. That closes user story 9 — "*offer* me a working variation"
— which the suffix alone satisfied only if the Curator noticed the number.

### The Submit slug

`crypto.randomUUID().replaceAll('-', '')` — 122 bits from the platform CSPRNG,
generated at insert time and never derived from the name, the id, the Slug or the
Curator. Knowing a Calendar's readable Slug tells you nothing about its Submit
slug; the two are independent by construction, which is the whole point of the
pair. Guessing one is 2^122 work.

The Slug, by contrast, is *meant* to be guessable — a Curator who wants obscurity
edits it to something nobody would type, and the settings page says so.

### The year

`new Date().getFullYear()` at insert, never asked for and not editable. Confirmed
2026 on every row created during verification.

### What was verified, and how

By hand against `next dev` with the real bindings, driving a browser (the code
arrives in the server console — no `RESEND_API_KEY` set) and `curl`. Both, because
the browser proves the interface and `curl` proves the no-JavaScript path, gives a
second signed-in account with an independent cookie, and lets a forged form body
be posted deliberately. D1 was inspected directly after each step. Per the spec,
no automated tests were added.

Two accounts throughout: `curator-a@example.com` and `curator-b@example.com`, both
signed in for real with an emailed six-digit code.

- **Name only.** Created `Bräkkfäst Café  Advent!! 2026` with the description left
  blank. Row: `description=''`, `year=2026`, `is_public=0`, both Variants written.
- **Readable Slug.** `brakkfast-cafe-advent-2026` — accents folded, `!!` and the
  double space collapsed.
- **Create collision.** The same name a second time → `brakkfast-cafe-advent-2026-2`.
  Later, a third and fourth `My Name` against an existing `my-name` → `my-name-3`,
  `my-name-4`. Suffixes climb; nothing is rejected.
- **Edit collision — the headline item.** Address changed to `Winter Mix!` on one
  Calendar → `winter-mix`. Then the *other* Calendar's Address set to `winter-mix`
  → `winter-mix-2`. Repeated with `my name` → `my-name-2` and
  `quiet corner advent` → `quiet-corner-advent-2`. Each time the redirect carried
  `?taken=…` and the dashboard named the address given.
- **Edit idempotence.** Saved the settings form twice with nothing changed: Slug
  unchanged both times, no `?taken=` notice. This is the failure the `exceptId`
  argument exists to prevent.
- **Emptied Address.** Cleared the field → fell back to the name's Slug,
  `brakkfast-cafe-advent-2026`, with no suffix because it was free by then.
- **Submit slug.** Six Calendars, six distinct 32-character hex strings, none
  sharing anything with its Calendar's name or Slug.
- **Public flag.** Toggled on → `is_public=1`, card reads "Public — may be listed";
  toggled off → back to 0 and "Unlisted — shared by link only." `grep` confirms
  `is_public` is written and read by nothing but that one line of the Curator's own
  card — it gates no access, and nothing lists Calendars.
- **Both links, copyable.** Each card shows the Calendar link and the Submission
  link in full, each with a Copy button. Clicking Copy in the automated browser
  hits `NotAllowedError` on `navigator.clipboard` (clipboard-write is denied to it)
  and the component's fallback fires: both inputs came back selected `0..length`,
  so the link is one keystroke from the clipboard rather than a dead button. The
  clipboard-succeeds path — the label flipping to "Copied" — could not be exercised
  in that browser and is the one thing here checked by reading rather than by doing.
- **More than one Calendar.** Curator A ended with seven; the list renders them all
  in creation order.
- **Not yours: read.** Signed in as B, A's three Calendar ids all gave 404 on
  `/dashboard/calendar/<id>`, and B's dashboard listed only B's own — "You haven't
  made a Calendar yet." before B created one.
- **Not yours: write.** As B, posted the settings Server Function twice with A's
  Calendar id in the body — once to B's own settings URL, once to A's URL —
  asking for `name=HIJACKED`, `slug=hijacked`, `is_public=on`. Both returned the
  same 303 to `/dashboard` a mistyped id gets, and A's rows were byte-identical
  afterwards.
- **Signed out.** `/dashboard/calendar/<id>` → 307 to `/sign-in`; posting the
  create action with no cookie → 303 to `/sign-in`, nothing written.
- **Empty name.** A whitespace-only name → `/dashboard?error=name` and "Give your
  Calendar a name." The field is also `required`, so this is only reachable with
  JavaScript off.
- **The ticket-01 landmine.** `next build` still reports `/` as `○ (Static)`; the
  new `/dashboard/calendar/[id]` is `ƒ (Dynamic)`, as are `/dashboard` and
  `/sign-in`. Nothing was added to the root layout.
- `npx tsc --noEmit` clean, `eslint` clean on all six files.

Verification ran in a throwaway copy of the tree on port 3007, with its own local
D1, because another agent was mid-flight on ticket 02 in the working tree.

### Deliberately not built

- **The routes the two links point at.** `/calendar/<slug>` and `/submit/<slug>`
  both 404 today — tickets 09 and 10. The paths live in `calendarPath`/`submitPath`
  so those tickets change one line each.
- **No cap on Calendars per account**, per the spec's out-of-scope list.
- **No Slug rotation**, and none for the Submit slug either.
- **Year is not editable.** `new Date().getFullYear()` reads the Worker's UTC
  clock, so a Calendar created in the last hours of 31 December west of Greenwich
  would be stamped with the following year and there is no correction path. Not
  worth a control: nobody starts an advent Calendar on New Year's Eve, and the spec
  puts timezone handling out of scope.
- **The shareable links are built from the request's `Host` header** rather than a
  configured base URL, so the same code serves localhost, preview and production
  untouched. Marked `ponytail:` in `dashboard/page.tsx` — only the signed-in
  Curator can forge it, and only on their own page.
- **`freeSlug` checks candidates one query at a time** and does not retry the
  insert if a Slug is taken in the gap before it. Marked `ponytail:`; the unique
  constraint is the backstop and communities are not created concurrently in the
  thousands.
