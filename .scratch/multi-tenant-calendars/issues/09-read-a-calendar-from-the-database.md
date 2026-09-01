# 09: Read a Calendar from the database

**What to build:** Visiting a Calendar's Slug shows the seeded 2025 Calendar, rendered by the original interface, with its content coming from the database instead of a spreadsheet on disk.

The page is a shell that requests one payload holding every Day. That payload is cached with a long lifetime and purged whenever the Calendar is written to, so a normal visit costs no database work and a new Submission still appears within milliseconds.

**The visitor-facing interface must not change.** Same layout, same reveal animation, same Variant switch, same wording. If a change to it seems necessary, something else is wrong.

The spreadsheet and its build-time reader are deleted in this ticket.

**Blocked by:** 03, 04, 07, 08

**Status:** ready-for-agent

- [ ] A Calendar's Slug serves the Calendar, and an unknown Slug gives a clean not-found rather than an error
- [ ] Content comes from the database; the spreadsheet file and its reader are gone
- [ ] The payload is cached and served from cache on repeat visits
- [ ] Writing to a Calendar purges its cached payload, and the change is visible on the next load
- [ ] Reveal is driven by the Calendar's own year, not a hardcoded one
- [ ] Days with no Submission render as empty rather than breaking the grid
- [ ] Covers resolve in the intended order: uploaded image, then looked-up image, then the existing placeholder
- [ ] Side-by-side against the original site, the seeded Calendar is visually indistinguishable
