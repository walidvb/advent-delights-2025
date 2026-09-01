# 03: Track shape keyed by Variant

**What to build:** Nothing, from a visitor's point of view. This is a prefactor: the Calendar behaves identically before and after.

A Day currently holds its two Tracks as two sets of flat, prefixed fields, which forces every consumer to branch on Variant across six fields at a time — the same ternary block repeated in the player and in the details card. Reshape it so a Day holds one Track per Variant, looked up by Variant, and those branches collapse.

Doing this now, while real spreadsheet data is still feeding the site, means the later database swap changes only where Tracks come from and not what they look like.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] A Day's Tracks are held one per Variant and retrieved by Variant, not as prefixed fields
- [ ] The repeated per-field Variant ternaries in the player and details card are gone
- [ ] The shape does not assume exactly two Variants
- [ ] The Calendar renders identically to before, including covers, credits, descriptions and buy links
- [ ] Playback and Variant switching still behave as they did after ticket 02
