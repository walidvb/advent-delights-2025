# 07: Create a Calendar

**What to build:** A signed-in Curator names a Calendar and gets it back, ready to share. The dashboard lists the Calendars they own.

The Calendar's Slug is derived from its name and is readable, so the link looks like the community rather than a random string. The Curator can edit it — obscurity, if they want it, is their choice of Slug. A separate Submit slug is generated as a secret and is never derived from the name.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] Creating a Calendar needs only a name; a description is optional
- [ ] The Slug is derived from the name and is readable
- [ ] A Slug that is already taken gets a numeric suffix rather than being rejected
- [ ] The Curator can edit the Slug afterwards, with the same collision handling
- [ ] A Submit slug is generated separately, is not guessable, and is not derived from the name
- [ ] The Calendar records the current year without asking
- [ ] A public flag can be toggled; it affects listing only and nothing lists Calendars yet
- [ ] The dashboard lists the Curator's Calendars with both links available to copy
- [ ] A Curator can create more than one Calendar
- [ ] A Curator cannot see or edit a Calendar they do not own
