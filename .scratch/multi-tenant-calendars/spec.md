# Spec: Multi-tenant advent Calendars

Status: ready-for-agent

## Problem Statement

Someone ran an advent calendar for their community: twenty-five people each sent
in two tracks, one mellow and one energetic, and a door opened every day through
December. It worked, people loved it, and other communities want their own.

Today the only way for them to get one is to clone a Git repository, edit a CSV
by hand, download every contributor's cover image, rename the files, type the
filenames back into a spreadsheet, and deploy. Someone has already done exactly
this — there is a second calendar live on the internet that is a fork-and-reskin
of the first. That fork is the evidence: the demand is real, and the only route
to satisfying it currently requires being a developer.

The organiser also has a worse problem than the setup work. Collecting
submissions through a spreadsheet means they see every track as it arrives. The
person who does the most work to make the surprise happen is the only person who
doesn't get to experience it.

## Solution

A platform where anyone can create a Calendar for their community.

A Curator signs in with their email, names a Calendar, and gets two links: one to
share with everyone for viewing, and a separate secret one for collecting
Submissions. Contributors open the collection link, see which Days are still
free, claim one, and fill in their two Tracks. No account, no spreadsheet, no
manual image handling.

Through December, the Calendar reveals one Day at a time, exactly as the original
does — the viewing experience is unchanged.

Crucially, the Curator's dashboard shows *who* has claimed each Day but never
*what* they submitted. The organiser gets to be surprised too. When they
genuinely need to look — a broken link, something inappropriate — an explicit,
deliberate action reveals a single Day, so seeing a spoiler is always a choice.

## User Stories

### Becoming a Curator

1. As someone who wants to run a Calendar, I want to sign in with just my email address and a code, so that I don't have to invent and remember another password.
2. As someone signing in, I want the code to arrive quickly and be short enough to retype from my phone, so that signing in isn't a chore.
3. As a returning Curator, I want to stay signed in between visits, so that I don't have to request a code every time I check on my Calendar.
4. As a Curator, I want to sign in from a different device using the same email, so that I can manage my Calendar from my phone and my laptop.
5. As someone who dislikes handing my identity to a large platform, I want to sign in without connecting a Google or GitHub account, so that I control what the platform knows about me.

### Creating a Calendar

6. As a Curator, I want to create a Calendar by giving it a name, so that setting up takes seconds rather than an afternoon.
7. As a Curator, I want the Calendar's web address to be derived from the name I chose, so that the link I share looks like my community rather than a random string.
8. As a Curator, I want to edit that address, so that I can shorten it, fix an awkward auto-generated version, or deliberately make it hard to guess.
9. As a Curator whose chosen address is already taken, I want the platform to offer me a working variation rather than rejecting me, so that I'm not stuck guessing what's free.
10. As a Curator, I want to write a short description of my Calendar, so that people opening the link understand what this is and who it's for.
11. As a Curator, I want the Calendar to be for the current year automatically, so that I'm not asked a question with only one sensible answer.
12. As a Curator, I want to run a new Calendar next year without disturbing this year's, so that each year stands on its own as a record of what that community shared.
13. As a Curator, I want to mark my Calendar as public or keep it unlisted, so that I can decide whether it's discoverable or just something I share with my own people.
14. As a Curator, I want to create more than one Calendar, so that I can run separate ones for separate communities.

### Collecting Submissions

15. As a Curator, I want a separate secret link for collecting Submissions, so that I can share the Calendar itself widely in December without leaving it open to new entries from strangers.
16. As a Curator, I want to send that collection link to a group chat and have it just work for everyone, so that I don't have to generate and track a personal invitation for each of twenty-five people.
17. As a Contributor, I want to submit without creating an account, so that taking part is a five-minute favour and not a signup.
18. As a Contributor, I want to know roughly how full the Calendar is before I commit, so that I have a sense of how much company I'll have.
19. As a Contributor, I want to be dealt a Day at random rather than choosing one, so that which Day is mine is a surprise to me too, and not a thing I have to weigh.
20. As a Contributor, I don't want to see what anyone else submitted, so that my own experience of the Calendar isn't spoiled by helping build it.
21. As a Contributor whose dealt Day turns out to have just been taken by someone else, I want to be told clearly and be dealt another without retyping everything, so that losing a race doesn't cost me my work.
22. As a Contributor arriving at a Calendar where every Day is taken, I want to be told it's full, so that I don't fill in a form that can't be accepted.
23. As a Contributor, I want to be gently stopped from claiming a second Day in the same Calendar, so that I don't accidentally take a slot meant for someone else.
24. As a Curator, I want people to still be able to submit after December has started, so that a latecomer can take one of the remaining Days.
25. As a Contributor arriving mid-December, I want to only be dealt a Day that hasn't opened yet, so that I can't submit into a door people have already looked behind.

### Submitting Tracks

26. As a Contributor, I want to submit one Track for each Variant, so that my Day contributes both a mellow and an energetic piece, as the Calendar intends.
27. As a Contributor, I want to paste a link to a track and have its title, artist and artwork filled in automatically, so that I do as little typing as possible.
28. As a Contributor, I want to correct anything the automatic lookup got wrong, so that a bad guess doesn't end up published under my name.
29. As a Contributor whose link the lookup doesn't recognise, I want to fill everything in myself, so that an unusual source doesn't stop me taking part.
30. As a Contributor, I want to write a few sentences about why I chose each Track, so that the Calendar carries the reason and not just the music.
31. As a Contributor, I want to include a link to buy the track, so that people who love it can support the artist.
32. As a Contributor, I want to choose the name I'm credited under, so that I appear as the version of myself this community knows.
33. As a Contributor, I want to optionally link to my own page, so that people who like my picks can find me.
34. As a Contributor unhappy with the automatic artwork, I want to upload my own image, so that my Day looks the way I want.
35. As a Contributor uploading a photo straight from my phone, I want it accepted and handled without me resizing it first, so that contributing from a phone isn't harder than from a laptop.
36. As a Contributor uploading an unsupported file, I want to be told plainly what went wrong, so that I can fix it rather than guess.
37. As a Contributor who has finished, I want a link that lets me come back and change my Submission, so that a typo or a change of heart isn't permanent.
38. As a Contributor, I want that link emailed to me if I choose to give an email address, so that I don't lose it by closing the tab.
39. As a Contributor, I don't want to be required to give an email address, so that taking part doesn't cost me my inbox.
40. As a Contributor returning with my link, I want to edit only my own Submission, so that I can't damage anyone else's.

### Curating without spoiling

41. As a Curator, I want to see how many Days are claimed, so that I know whether to chase people.
42. As a Curator, I want to see who has claimed each Day, so that I know exactly who still needs a nudge.
43. As a Curator, I don't want to see what anyone submitted, so that I get to enjoy my own Calendar in December like everyone else.
44. As a Curator, I want to remove someone's Submission without looking at it, so that I can clear a mistaken or unwanted entry and still be surprised by the rest.
45. As a Curator with a genuine reason to look, I want a deliberate action that reveals one Day, so that inspecting something is always a choice I made and never an accident.
46. As a Curator, I want to be warned before that reveal happens, so that I can't spoil myself with a stray click.
47. As a Curator, I want to contribute to my own Calendar, so that I'm a participant and not just an organiser.

### Viewing a Calendar

48. As a member of a community, I want to open the Calendar link and see the same experience the original had, so that nothing about the thing people already loved has been degraded.
49. As a viewer, I want one Day to become available each day of December, so that there's a reason to come back.
50. As a viewer, I want to switch between the two Variants, so that I can listen in the mood I'm actually in.
51. As a viewer, I want switching Variant mid-track not to interrupt what's playing, so that changing my mind doesn't cut the music off.
52. As a viewer, I want to play tracks continuously with skip and shuffle, so that the Calendar works as something to put on in the background.
53. As a viewer, I want to see who contributed each Day and read why they chose it, so that the Calendar is about the people as much as the music.
54. As a viewer, I want the Days I've already opened to stay open when I come back, so that I don't lose my place.
55. As a viewer following several Calendars, I want each to remember its own progress separately, so that opening a Day in one doesn't affect another.
56. As a viewer, I want the Calendar to still be there in February, so that I can go back to something I liked.
57. As a viewer of a past year's Calendar, I want every Day already open, so that an archive doesn't make me wait for a date that has passed.

### Running the platform

58. As the platform owner, I want the original 2025 Calendar loaded into the platform, so that there's a complete, real Calendar to look at from the first day.
59. As the platform owner, I want the platform to cost nothing to run at low traffic, so that it can exist without a business model.
60. As the platform owner, I want the platform to survive ten months of no traffic and still work in December, so that it doesn't quietly die between seasons.

## Implementation Decisions

### Starting point

The existing single-Calendar application is the starting point, not a
reference. Its viewing experience — the door-opening reveal animation, the
Variant switch, the player — is carried over and **must not change**. The work
is replacing its data source, not rebuilding its front end.

The current data source is a spreadsheet export read from disk when the site is
built. It is removed entirely.

The deployment configuration is also removed: the adapter it uses to publish to
Cloudflare has been deprecated and its repository archived. It is replaced with
the current supported adapter, which runs the application as a Cloudflare Worker
rather than as a purely static export.

### Modules being built

- **Identity**: passwordless sign-in via a numeric code sent by email. Sessions
  persist. Only Curators have accounts; Contributors never do.
- **Calendar management**: create, list, and configure Calendars. Owns Slug
  generation from the Calendar's name, collision handling by numeric suffix,
  Slug editing, and the public flag.
- **Submission intake**: shows how full a Calendar is, accepts a Submission,
  and deals it a random claimable Day rather than letting the Contributor
  choose one.
- **Track metadata lookup**: given a Track's URL, attempts to retrieve title,
  artist and artwork.
- **Image intake**: accepts an uploaded cover image and stores it.
- **Curator dashboard**: presents claim state and Contributor names, deletion,
  and the single-Day reveal.
- **Calendar read API**: returns everything a viewer needs for one Calendar.
- **Reveal rules**: given a Calendar's year and the current moment, determines
  which Days have revealed and which are claimable.

### Data model

A **Calendar** has a name, description, year, Slug, Submit slug, public flag, an
owning Curator, and its set of Variants.

A **Submission** belongs to a Calendar and occupies exactly one Day, numbered 1
to 25. It carries the Contributor's credited name, an optional link to
themselves, an optional email address, and a secret token granting edit rights.

**A Calendar and a Day number together must be unique.** This constraint is what
makes a random deal safe under concurrency: two Contributors dealt the same Day
at the same moment cannot both insert successfully, and the loser is dealt
another rather than told to pick one.

A **Track** belongs to a Submission and carries its Variant. A Submission and a
Variant together must be unique. A Track holds its source URL, title, artist,
description, buy link, and its cover — which may be an uploaded image, a URL
returned by metadata lookup, or neither, in which case the existing placeholder
behaviour applies. Uploaded image wins over looked-up URL.

Tracks are stored **one row per Variant**, not as prefixed columns on a shared
row. This is both simpler than the current shape and incidentally supports more
than two Variants without a schema change.

### Variants

The data model supports any number of Variants per Calendar. The interface
supports exactly two, `light` and `heavy`, with the existing presentation copy
frozen. Per-Calendar Variant labels are stored but unused for now. Introducing a
third Variant is a data change plus interface work; it is not a migration.

### Random assignment

A Contributor is dealt a Day at random from the Calendar's still-claimable
ones — never shown a grid to pick from, before or after. This replaced an
earlier design where a Contributor saw every free Day and chose one; the
platform now treats which Day is whose as one more thing nobody, including the
Contributor, gets to see coming.

The Day is dealt at the moment of final submission, not when the Contributor
starts the form. The claim form is filled in first — two Tracks, a credited
name — and only submitting picks a random claimable Day and inserts the
Submission, in the same step, atomically. This is deliberate: dealing the Day
up front, before the form is filled in, would mean an abandoned form leaves a
Day permanently claimed with nothing behind it, and no way to notice or free
it. Claim-on-submit avoids that exactly as it did before, and losing a race —
the Day chosen collides with one just taken — costs nothing but a re-deal, since
the Contributor never knew which Day it was anyway.

The Contributor sees only how full the Calendar is, in round terms, while
filling in the form.

### Reveal

Reveal is decided on the viewer's device against its own clock. There is no
timezone handling and no server-side enforcement: the full contents of every Day
are present in the data a viewer receives, and the gate is presentational.

This is deliberate and is recorded as an architecture decision. It follows that
the Curator's blindness is an interface courtesy rather than a guarantee — a
determined Curator can read the raw response. That is accepted.

The rule that decides which Days have revealed is a plain function of the
Calendar's year and the current moment. It currently lives inside a React
context with the year 2025 hardcoded; it must be extracted and parameterised
because Calendars now have differing years.

Per-Calendar reveal progress is remembered in the browser and **keyed by
Calendar**, so following several Calendars keeps independent progress.

### Reading a Calendar

The Calendar page is a static shell that requests one payload containing every
Day. That payload is cached at the edge with a long lifetime and **purged
whenever the Calendar is written to** — a Submission, an edit, a deletion.

Consequently a normal page view costs no database work, and a new Submission
appears within milliseconds. This was chosen over rebuilding and redeploying the
site on every Submission, which takes minutes, queues badly when a community
submits in one evening, serves a half-built Calendar in the meantime, and
consumes a daily deployment allowance.

### Curator visibility

The dashboard payload contains claim state and Contributor names. **It must not
contain Track titles, URLs, descriptions or cover images.** Names are hidden by
default behind a "Show names" switch the Curator flips themselves — a Curator
only needs a name to chase the people who haven't submitted, so showing them is
the occasional case, not the resting one. Nothing about which Days are claimed
is hidden either way.

Revealing a single Day is a separate, explicitly requested action: reached by
clicking that Day and nothing else, and taking effect the moment the Curator
clicks to reveal it — one click, immediate, no second confirmation step.
Nothing about having looked is recorded anywhere: this is the Curator
overriding their own blindness for a moment because they have a reason to,
not a fact about the Day worth remembering. Looking again re-reads the same
Tracks.

Deletion operates on a Day, and does not require the content to have been
revealed first. It sends no notification to the Contributor — the sign-in code
and the Submission receipt remain the only mail this platform ever sends.

### Access

The Slug is readable and derived from the Calendar's name, and is therefore
guessable. The Curator may edit it, so a Curator wanting obscurity chooses an
obscure Slug. The public flag governs *listing* only; an unlisted Calendar's
Slug still works for anyone holding it.

The Submit slug is a separate secret and is never derived from the name. It is
two words from a small musical vocabulary (`mellow-tempo`, not a hex blob) —
readable enough to read aloud or paste into a group chat without it looking
like a password, at the cost of far less entropy than a random token. That
trade is deliberate: this is a link shared with people the Curator invited, not
a secret meant to resist being guessed by a stranger enumerating the word
space. Neither Slug rotates. A leaked Submit slug is out of scope; rotation
would be one field and one control if it becomes a real problem.

### Images

Cover images are resized in the browser before upload, to roughly 800 pixels.
JPEG, PNG and WebP are accepted below 5MB; other formats are rejected with an
explanatory message. No image processing happens on the server — this avoids
both the platform's per-request compute ceiling and its paid image pipeline.

Images are served by the application from object storage rather than from the
storage service's own public URL, which is documented as rate-limited and
intended for development only.

### Playback

The media player library is moved to its previous major version for better
SoundCloud support. This is a genuine code change rather than a version bump:
the current code uses the newer version's property and callback shapes. The
behaviour that prevents a Variant switch cutting off audio mid-track is subtle
and must survive the change.

### Platform

Everything runs on one vendor: application, database, and object storage, with a
single external dependency for sending email. Chosen primarily for seasonal
dormancy — the application receives essentially no traffic for ten months, and
this is the only free option with no documented idle-suspension policy. Recorded
as an architecture decision, since the reasoning is invisible from the code and
would otherwise be revisited annually.

Running cost is the domain registration. Everything else is free tier.

### Routes

Route names are readable words rather than single letters: viewing, submitting,
editing and image serving each use a spelled-out path segment.

## Testing Decisions

**No automated tests will be written for this feature.** This is a deliberate
decision by the project owner, made with the trade-off understood. The existing
codebase has no tests and none are being introduced.

Verification is by hand, exercising the real application:

- The whole path end to end: sign in, create a Calendar, open the Submit slug in
  a separate browser profile, claim a Day, submit two Tracks, upload an image,
  confirm it displays, then return via the edit link and change something.
- **The Curator dashboard response, inspected directly.** This is the one place
  where a failure is silent rather than visible, since a leak looks like a
  working page. Confirm the response carries Contributor names and no Track
  content.
- Playback against both a YouTube and a SoundCloud URL, including seeking and
  switching Variant mid-track. SoundCloud is the entire reason for the player
  change, so an untested SoundCloud path would defeat the purpose.
- Freshness: submit a Track, reload the Calendar, confirm it appears. A stale
  Calendar is the failure mode the caching decision introduces.
- Reveal: against the seeded 2025 Calendar, move the device clock forward and
  confirm Days open in order; confirm an archived Calendar shows all Days;
  confirm two Calendars open in the same browser keep separate progress.
- The whole path once more against the deployed application, since the database,
  object storage and edge cache all behave differently when deployed than they
  do locally.

One consequence of having no tests is recorded here so it isn't mistaken for an
oversight: the concurrent-claim collision is enforced by a uniqueness constraint
in the database and is not exercised deliberately. It is judged too unlikely to
be worth constructing.

## Out of Scope

- **Payment of any kind.** No plans, no limits, no billing. The data model
  carries nothing that anticipates it.
- **A browse page for public Calendars.** The public flag is stored and
  toggleable so this is a pure addition later, but nothing lists Calendars in
  this scope.
- **Scraping metadata from sources the lookup service doesn't handle**,
  Bandcamp in particular. The lookup is structured as prefill precisely so this
  can be added behind the same boundary later.
- **Any change to the public Calendar interface.** Layout, animation, copy and
  behaviour are frozen.
- **Configurable Calendar length or start date.** Twenty-five Days in December.
- **Timezone handling.** Reveal follows the viewer's device.
- **Server-enforced reveal.** Explicitly rejected; see the architecture decision.
- **An approval queue for Submissions.** Submissions are live immediately.
- **A cap on Calendars per account.** Accepted risk, with a known one-line
  remedy if abused.
- **Slug rotation** after a leak.
- **Contributor accounts, and any enforcement of one Day per person** beyond a
  soft in-browser reminder.
- **A platform-staff administration surface.** The term "admin" is deliberately
  reserved for it and used for nothing else.
- **Notification email beyond the sign-in code and the Submission receipt.** In
  particular, no daily "today's Day is open" mail — it is the largest volume
  driver and the most likely thing to get the sending domain flagged.

## Further Notes

Three decisions are worth recording as ADRs during implementation, each being
hard to reverse, surprising without context, and the result of a real trade-off:
the honour-system Reveal, the choice of platform on seasonal-dormancy grounds,
and Curator blindness together with its deliberate escape hatch.

The seed data from the original Calendar carries real mess that the import must
survive: columns present in the spreadsheet but absent from the code's own type,
empty cover-image columns sitting beside populated cover-identifier columns, a
file extension rewritten in code so that spreadsheet values don't match files on
disk, and cover files existing in both accented and unaccented spellings. This
is a feature of the import work, not an obstacle to it — it is the most
realistic data the project will ever have.

One assumption should be sanity-checked early, because it was inferred rather
than stated outright: that Days which have already revealed cannot be claimed,
leaving any gap in them permanently empty. This follows from the decision that
Calendars are expected to be full before December begins.
