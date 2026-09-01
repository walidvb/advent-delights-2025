# 13: Curator dashboard

**What to build:** The Curator sees how full their Calendar is and exactly who has claimed which Day — and nothing at all about what those people submitted. The person who organised the surprise gets to be surprised.

When they genuinely need to look — a broken link, something inappropriate — revealing a single Day is an explicit, warned action, so seeing a spoiler is always a decision they made.

They can remove a Submission without ever looking at it.

**Blocked by:** 07, 10

**Status:** ready-for-agent

- [ ] The dashboard shows each Day as claimed or free, and shows the credited name on claimed Days
- [ ] The response carries no Track titles, links, descriptions or covers anywhere. Read the raw response and confirm — this is the one failure here that looks like a working page
- [ ] The Curator can delete a Submission by Day without revealing its content first
- [ ] Revealing a single Day requires an explicit action behind a warning that says it will spoil that Day
- [ ] Revealing one Day does not reveal any other
- [ ] A count of claimed Days is visible, so the Curator knows who to chase
- [ ] Deleting purges the Calendar's cached payload and frees the Day for someone else, subject to the usual rule that it has not yet revealed
- [ ] None of this is reachable for a Calendar the signed-in person does not own
