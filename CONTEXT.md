# Context

Domain glossary for the advent calendar platform. Terms only — no implementation
detail, no decisions, no schema. If you need the *why* behind a choice, look in
`docs/adr/`.

## Core terms

### Calendar

One community's advent calendar, for one year. It has a name, twenty-five Days,
and a Curator. A Calendar belongs to exactly one year; running the same thing
again next December means creating a new Calendar, not reopening this one.

### Curator

The person who created a Calendar. There is exactly one per Calendar.

Deliberately not called *admin*. "Admin" is reserved for platform staff, who do
not exist yet — using it for the person who made a calendar would make that
future distinction impossible to name.

A Curator can see *who* has claimed each Day, but not *what* they submitted. The
surprise belongs to the Curator too.

### Day

A position from 1 to 25 within a Calendar. A Day is a slot, not a date: Day 7 is
the seventh door, and it reveals on the 7th of December.

Keep the two senses apart. "Day" always means the position. When the calendar
date is meant, say so explicitly.

A Day is either claimed (it has a Submission) or empty. An empty Day stays empty
once it has revealed.

### Submission

One Contributor's claim on one Day. Carries the name they want to be credited
under, an optional link to themselves, and one Track per Variant.

A Submission is made once and can be edited afterwards by whoever holds its edit
link. It is live the moment it is made — nobody approves it.

### Contributor

A person who makes a Submission. Contributors have no accounts and no verified
identity: the name attached to a Submission is free text they typed, and two
Contributors may well claim the same one.

Distinct from the Curator, though a Curator may also contribute to their own
Calendar.

### Track

One piece of music: where to hear it, who made it, what it's called, why the
Contributor chose it, and where to buy it. A Track is always a link to somewhere
else — nothing is hosted here.

### Variant

The axis along which a Day's Tracks differ from one another. A Calendar's
Variants are the same for every Day in it.

The two Variants are `light` and `heavy`. A Day holds one Track per Variant, and
a viewer reads the Calendar one Variant at a time, switching between them.

## Access and naming

### Slug

A Calendar's readable address, derived from its name and adjustable by the
Curator. Being readable, it is also guessable — a Slug is a name, not a secret.

### Submit slug

A separate secret used to claim a Day and make a Submission. Never derived from
the Calendar's name.

The two are separate because they are shared with different intent and at
different times: the Slug is what you send round in December, the Submit slug is
what you send round beforehand.

### Public

A Calendar the Curator has marked as listable. Public is about *discovery*, not
access: a Calendar that is not public is simply not advertised, and its Slug
still works for anyone holding it.

## Time

### Reveal

A Day becoming visible. Days reveal one at a time through December, in order.

Reveal is an honour system, judged against the viewer's own device. It is a
social convention the platform presents, not a rule it enforces.

### Archive

What a Calendar becomes after the 25th: permanently readable, every Day open, no
further Submissions. Archived Calendars are never deleted.
