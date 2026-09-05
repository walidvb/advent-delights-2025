# 04: Reveal rules as a plain function

**What to build:** Nothing visible. A second prefactor.

The rule deciding which Days have revealed currently lives inside a React context, reads the clock directly, and has the year 2025 written into it. Calendars are about to have differing years, so it has to become a plain function taking the Calendar's year and the current moment and returning what has revealed.

At the same time, the record of which Days a visitor has already opened is stored per browser but not per Calendar, so following two Calendars would have them share progress. Key it by Calendar.

**Blocked by:** 01

**Status:** done

- [x] Deciding which Days have revealed is a plain function of a year and a moment, with no hardcoded year and no clock reading inside it
- [x] The same module answers which Days are claimable: only Days that have not yet revealed
- [x] Opened-Day progress in the browser is stored per Calendar, so two Calendars do not share it
- [x] The existing unused timer helpers are either absorbed into this or deleted
- [x] The 2025 Calendar reveals exactly as it did before

## Comments

`src/app/advent/reveal.ts` holds both rules:

```ts
revealedDayCount(year: number, now: Date): number   // 0-25
claimableDays(year: number, now: Date): number[]    // the Days not yet revealed
```

Neither reads the clock or names a year. The single clock read now sits in
`AdventDayProvider`, which passes `new Date()` in once.

**Keyed by Slug.** A new `CalendarIdentity { slug, year }` is threaded from the
page into the provider, and browser progress lives under
`advent-opened:<slug>`. The Slug is the Calendar's address and is unique, so it
identifies a Calendar without a database round trip, and the key stays legible
when someone opens their own storage. Ticket 09 replaces the one hardcoded
`{ slug: 'advent-2025', year: 2025 }` in `page.tsx` with the Calendar it looked
up; nothing else moves.

**Renamed while here:** the context said `revealedIndices` for the Days *this
browser has opened*, colliding with Reveal in CONTEXT.md, which is the date
rule. They are now `openedIndices` / `addOpenedIndex`. `CalendarCard` keeps
`isRevealed` and its `revealed` animation state — there the word means the
door-opening animation, which is a reveal in the ordinary sense.

**Timer helpers deleted.** `src/lib/use-timers.ts` had no importers.

### Verified

Exercised `revealedDayCount` directly across ten year/moment pairs: before the
Calendar's year (0), 30 November (0), 1 December (1), 7 December (7), 24th
(24), 25th (25), 31 December (25, not 31), the following September (25, the
Archive), and a 2026 Calendar seen both today (0) and on 3 December 2026 (3).
`claimableDays` was checked against each as the exact complement — in every
case it offered precisely the un-revealed Days and never one that had opened.
On 7 December 2025 it starts at Day 8 and ends at Day 25.

Behaviour is identical to the function it replaces: the old
`Math.min(24, day - 1)` and the new `revealedDayCount(...) - 1` agree at every
boundary, including -1 before December and 24 afterwards.

In the browser: the 2025 Calendar renders and reveals exactly as before;
opening Day 1 wrote `{"light":[0]}` to `advent-opened:advent-2025` and to
nothing else; a second key `advent-opened:another-calendar` holding
`{"light":[9,10]}` was untouched by it and survived a reload with both sets
intact, and Day 1 stayed open. `tsc` clean, `next build` still reports `/` as
`○ (Static)`.

### Left undone

The provider still reads the clock once at mount and never again, so a browser
left open across midnight on 6 December will not open Day 7 until it is
reloaded. That was true before this ticket and is not worth a timer.
