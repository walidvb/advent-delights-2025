# 12: Cover image upload

**What to build:** A Contributor who does not like the looked-up artwork uploads their own, including straight from a phone, and sees it on their Day.

Images are shrunk in the browser before they are sent, so a photo taken on a phone uploads quickly and nothing large or slow happens on the server. An uploaded image always wins over a looked-up one.

**Blocked by:** 11

**Status:** done

- [x] A Contributor can upload a cover for each Track and see a preview before submitting
- [x] The image is resized in the browser before upload, to roughly 800 pixels on its long edge
- [x] JPEG, PNG and WebP under 5MB are accepted
- [x] Anything else, including phone-native formats, is refused with a message that says what to do instead
- [x] No image processing happens on the server
- [x] Uploaded images are served back by the application from the object store, not from the store's own public development URL
- [x] An uploaded cover takes precedence over a looked-up one, and removing it falls back to the looked-up one
- [x] Editing a Submission can replace a previously uploaded cover

## Comments

`src/lib/covers.ts` is the image intake: what a cover has to be, the refusal
message when it isn't, the browser-side shrinking, and `coverPath` (moved here
from `calendar-payload.ts`, which now imports it — image concerns in one file).
`uploadCoverAction` in `src/app/submit/actions.ts` stores the bytes.
`SubmissionFields.tsx` holds the control, for both the claim and edit forms.

### The upload happens when the image is chosen, not when the form is submitted

This is the decision everything else follows from. Choosing an image shrinks it
on the device, posts it, and gets back an object key which the form then carries
in a hidden `<variant>.cover_key` field — an ordinary form answer, indistinguishable
from a typed one.

So **an upload survives ticket 10's `key={state.attempt}` remount for free.** The
bytes are already in the bucket; the draft that comes back from a lost race
carries only the key, and the remounted field initialises from it exactly as a
typed value does. Nothing large is ever held in React state waiting to be sent,
and the preview is the stored object served back through `/cover/`, so what is on
screen is literally what the Calendar will show.

### Shrinking, in the browser, with nothing installed

`createImageBitmap` → `<canvas>` → `toBlob('image/webp', 0.85)`, scaled so the
long edge is 800 (never upscaled). `imageOrientation: 'from-image'` so a photo
taken sideways stays the right way up — the canvas would otherwise drop the EXIF
rotation. No dependency was added and none is needed. **Nothing is processed on
the server**, per the spec: the Worker checks the type and size and calls
`BUCKET.put` on the bytes as they arrived.

A browser too old to encode WebP gets PNG from `toBlob` instead, silently and by
specification, which is why the stored extension and content type are read off
the blob rather than assumed.

### Where the key comes from, and the orphans

`uploads/<random uuid>.<ext>`. Random, so an upload can never overwrite another
and a replacement is simply a different object; prefixed, so Contributors'
images stay apart from the seeded `covers/` ones. It also keeps the `/cover/`
route's `immutable` cache header honest — a cover never changes under its key.

**Nothing deletes from the bucket, deliberately.** Three ways to orphan an
object: replacing an upload, removing one, and abandoning a form after
uploading. Deleting on replace or remove would be *wrong* — the Submission still
points at the old key until the form is saved, so an eager delete would break a
live Day for anyone who changed their mind and closed the tab — and it would not
cover the abandoned-form case anyway. So a sweep is needed regardless, and one
sweep of `uploads/` keys that no `tracks.cover_key` names collects all three at
once, including the deleted-Submission case ticket 13 handed over. `ponytail:`
orphans cost bytes and nothing else; sweep the day the bucket matters.

### The seam ticket 11 left, closed

`trackUpsert` now names `cover_key` alongside `cover_url`. Ticket 11 kept it out
so an edit could not wipe an upload it knew nothing about; now the form carries
both, so the form is the whole truth about a Track's cover — which is exactly
what makes **removing an upload fall back to the looked-up image** rather than to
nothing. The two are stored side by side and never overwrite each other;
`coverImage` in `calendar-payload.ts` (ticket 09, unchanged) still decides which
one shows.

### A public endpoint gets a guard

The upload action is reachable by anyone who can reach the site, so it re-checks
the type and the size — the browser is not a trust boundary — and requires the
caller to hold the Calendar's Submit slug or one of its edit tokens. Otherwise
it is an open invitation to fill someone else's bucket. The type check is
`Object.hasOwn`, not a truthiness test: a forged `content-type` of `constructor`
would otherwise find something on `Object.prototype` and pass.

What it checks is the *declared* type. Sniffing the bytes would be reading the
image, which is the thing this ticket exists not to do on the server, and it
buys nothing: `/cover/` serves an object back under the same declared type, so a
file lying about being a PNG is a broken image and not markup. Ticket 09's route
gained one line — `x-content-type-options: nosniff` — because this is the ticket
that first puts Contributor-supplied bytes behind it, and the browser should not
sniff where we deliberately didn't.

### Verified

By hand, per the spec. `next dev` on :3012 and the Worker on :8791, both against
local D1 and R2, in the `ticket-ten-test` Calendar (2026). Test images made with
`sips` from a real cover: a 3200×2400 JPEG, a 1600×1200 PNG, an 8000×6000 15MB
JPEG, and a **real HEIC** (`sips -s format heic`), not a renamed file.

- **Resized, and it is the resized bytes that are served.** 3200×2400 JPEG,
  647,903 bytes → **800×600 WebP, 32,868 bytes** in the bucket, and the same
  32,868 bytes back from `/cover/uploads/…`, `content-type: image/webp`.
  1600×1200 PNG, 1,531,414 bytes → 800×600 WebP, 31,310 bytes. A 1200×1200 WebP
  of 16,540 bytes → 800×800, 7,122 bytes. Nothing is upscaled.
- **Preview before submitting.** Both Tracks showed their uploaded cover, served
  through `/cover/…`, next to a "Remove this upload" control, with the looked-up
  preview beside it dimmed to show which one wins.
- **Uploaded beats looked-up.** Day 13 claimed with both a `cover_key` and a
  `cover_url` on each Track: the Calendar page rendered `/cover/uploads/…` twice
  and the looked-up URL **zero** times. On the Worker, Day 22 has an upload on
  its light Track and only a looked-up URL on its heavy one — the page serves
  `/cover/…` for one and the looked-up URL for the other, side by side.
- **Removing falls back.** Through the edit link: replaced the light cover with a
  different image and removed the heavy one, saved. D1 then held a new
  `cover_key` for light, `cover_key` null for heavy, and **`cover_url` intact on
  both** — the Calendar showed the new upload for light and the looked-up image
  for heavy. Editing therefore replaces an upload, and the old object stayed in
  the bucket as designed.
- **Refusals say what to do.** A real HEIC: "HEIC images can't be used as a
  cover — we take JPEG, PNG and WebP… On an iPhone, Settings → Camera → Formats →
  'Most Compatible' makes the camera take JPEGs from now on." The 15MB JPEG:
  "That image is 14.4MB and 5MB is the most we take. Export a smaller copy…". A
  `text/plain` file: "That kind of file can't be used…". After two refusals in a
  row the form was still fully usable and the next upload succeeded, and a
  refused *replacement* left the existing upload in place.
- **The losing racer keeps their upload.** Two Tracks uploaded, Day 15 picked,
  then a competing Submission for Day 15 inserted into D1 behind the form. The
  claim came back "Someone claimed Day 15 just before you did", the grid showed
  Day 15 as the winner's, **both `cover_key`s and both previews survived the
  remount**, and every typed field survived down to a two-line description. The
  same content then claimed Day 21 and both uploads landed in D1.
- **The guard.** The upload action posted directly with a bogus Submit slug, with
  a bogus edit token, and with no credential at all: refused each time with "This
  submission link is not valid." and nothing written to the bucket. With a real
  Submit slug it returns a key. Forged `content-type`s of `constructor` and
  `__proto__` are refused.
- **On the Worker.** `opennextjs-cloudflare build && preview` on :8791: HEIC
  refused, JPEG shrunk and stored through the real `BUCKET` binding, byte-identical
  to the dev run, served back through `/cover/` with `immutable`, Day 22 claimed
  and the Calendar payload purged so it appeared on the very next load.
- `npx tsc --noEmit` clean. `npm run lint` reports the same 8 problems as before,
  none of them in a file this ticket touched.

### Left undone

- **Not run against the deployed application**, as with tickets 10, 11 and 13.
  The deployed D1 and R2 are still empty.
- **Next's own server-action body limit is 1MB** and it refuses a larger POST
  before our 5MB check is reached, with its own generic error. It cannot happen
  in normal use — what the browser sends is a few tens of kilobytes — and the
  tighter limit is protective, so it was left alone rather than raised to match
  the message.
- **`public/covers` is still shipped**, as ticket 09 noted; uploads live under
  `uploads/` and do not touch it.
- **`cover_key` is taken from its hidden field unvalidated.** A Contributor who
  forges it can point their own Day at another public cover, or at nothing — a
  broken tile rather than the fallback. Requiring the `uploads/` prefix was the
  obvious guard and was rejected: it would silently wipe the seeded `covers/…`
  keys the first time one of those Submissions is ever edited. Every object
  under `/cover/` is public to anyone holding a Slug either way, so this buys a
  forger nothing but their own broken tile.
- **Submitting during the second or two an upload is in flight loses it.** The
  key isn't in the field yet. The Contributor is told the upload is happening,
  and their edit link puts it right; blocking the button would mean threading
  that state up through both forms for a one-second window. Marked `ponytail:`
  in `SubmissionFields.tsx`.
- **The local test Calendar keeps this ticket's Submissions** — `ticket-ten-test`
  Days 13, 21 and 22, with uploads on them, plus a handful of orphaned
  `uploads/` objects from replaced and abandoned uploads. Deliberate: it is the
  data a sweep would be written against.
