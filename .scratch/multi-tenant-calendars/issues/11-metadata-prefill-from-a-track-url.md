# 11: Metadata prefill from a Track URL

**What to build:** A Contributor pastes a link to a Track and watches the title, artist and artwork fill themselves in. They can overwrite anything the lookup got wrong.

Prefill is a suggestion and never the source of truth. Every field stays typed-in-able, so an unrecognised source or a failed lookup slows a Contributor down rather than stopping them. This boundary is also where a source-specific scraper would later slot in.

**Blocked by:** 10

**Status:** ready-for-agent

- [ ] Pasting a recognised Track link fills in title, artist and cover image
- [ ] Every prefilled field can be edited afterwards, and edits are what gets saved
- [ ] A lookup that fails or returns nothing leaves the form fully usable and shows no error page
- [ ] A slow lookup does not block typing in the other fields
- [ ] An unrecognised source is a normal outcome, not a failure state
- [ ] The looked-up cover is recorded separately from any uploaded one
