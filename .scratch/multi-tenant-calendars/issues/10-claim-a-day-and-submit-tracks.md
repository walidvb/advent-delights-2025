# 10: Claim a Day and submit Tracks

**What to build:** A Contributor opens the Submit slug, sees which Days are still free, claims one, fills in a Track for each Variant, and gets back a link that lets them come edit it later.

They never see anyone else's content while doing this — helping build the Calendar must not spoil it for them. They have no account and never create one.

Claiming happens on submit, not on selection: the first Submission to land takes the Day. Whoever loses the race is told plainly and keeps everything they typed.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] The Submit slug shows a grid of Days marked claimed or free, with no Track content anywhere in it
- [ ] Claimed Days show nothing about what was submitted, not even a Track title
- [ ] A Contributor picks a free Day and fills a Track per Variant: source link, title, artist, description, buy link
- [ ] They give a name to be credited under and, optionally, a link to themselves
- [ ] Giving an email address is optional and submitting without one works
- [ ] Only Days that have not yet revealed are offered; already-open Days are not claimable
- [ ] Two Submissions for the same Day cannot both succeed; the loser is told to pick another and keeps their typed content
- [ ] A Calendar with every Day claimed says it is full instead of showing an unusable form
- [ ] After submitting, the Contributor is shown an edit link and the Calendar's own link
- [ ] Returning with the edit link lets them change their own Submission and nobody else's
- [ ] Having submitted once is remembered in the browser and gently discourages claiming a second Day, without enforcing it
- [ ] Submitting purges the Calendar's cached payload
