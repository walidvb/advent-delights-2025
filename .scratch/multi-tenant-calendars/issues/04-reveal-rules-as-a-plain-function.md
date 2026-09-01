# 04: Reveal rules as a plain function

**What to build:** Nothing visible. A second prefactor.

The rule deciding which Days have revealed currently lives inside a React context, reads the clock directly, and has the year 2025 written into it. Calendars are about to have differing years, so it has to become a plain function taking the Calendar's year and the current moment and returning what has revealed.

At the same time, the record of which Days a visitor has already opened is stored per browser but not per Calendar, so following two Calendars would have them share progress. Key it by Calendar.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Deciding which Days have revealed is a plain function of a year and a moment, with no hardcoded year and no clock reading inside it
- [ ] The same module answers which Days are claimable: only Days that have not yet revealed
- [ ] Opened-Day progress in the browser is stored per Calendar, so two Calendars do not share it
- [ ] The existing unused timer helpers are either absorbed into this or deleted
- [ ] The 2025 Calendar reveals exactly as it did before
