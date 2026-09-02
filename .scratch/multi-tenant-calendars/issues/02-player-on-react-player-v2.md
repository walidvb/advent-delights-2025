# 02: Player on react-player v2

**What to build:** Playback that works on the previous major version of the media player library, which handles SoundCloud better. A listener can play a Track, seek within it, skip between Tracks, shuffle, and switch Variant mid-track without the audio cutting out.

This is not a version bump. The current code is written against the newer version's property and callback shapes and has to be rewritten against the older ones.

**Blocked by:** 01

**Status:** done

- [x] The player library is on the previous major version
- [x] Play, pause, seek, skip and shuffle all work against a YouTube Track
- [x] All of the above work against a SoundCloud Track — this is the entire reason for the change, so an unverified SoundCloud path fails this ticket
- [x] Switching Variant while a Track is playing does not interrupt or restart the audio
- [x] The now-playing bar still shows cover, Track name, artist and elapsed time correctly
- [x] No visible change to the player's appearance

## Comments

Rewritten against react-player v2.16.1. The v3 shapes the old code used
(`src`, `onTimeUpdate`, `playerRef.current.currentTime`, `onWaiting` /
`onPlaying`) became v2's (`url`, `onProgress(state)`, `seekTo(fraction,
'fraction')`, `onBuffer` / `onBufferEnd`).

Three things beyond the straight port:

- **v2 is not server-renderable.** It renders nothing on the server and mounts
  its player on the client, so SSR failed hydration on every page carrying the
  Player. It is now loaded through `next/dynamic` with `ssr: false`. v3 rendered
  a plain `<video>` and did not need this.
- **YouTube playlist parameters are stripped.** v2 reads `list=` / `channel=`
  in a YouTube URL as a request to load that playlist instead of the linked
  video, and submitted Track URLs carry them (Day 7's has `&list=RD…`). A Track
  is one piece of music, never a playlist.
- **Duration is read on every progress tick** rather than from `onDuration`. v2
  fires that at most once per url, and on SoundCloud the widget's PLAY event
  beats its own duration lookup, so the callback reports the previous Track's
  length and never corrects itself.

Also fixed, one line: the seek input's `value` flipped to `undefined` while
dragging, so React logged a controlled/uncontrolled warning on every seek.
`handleSeekChange` already keeps `progress` in step during a drag, so the
`undefined` was doing nothing but producing the warning.

### Verified

- **SoundCloud** (`soundcloud.com/pomelorecords/pomcast20-danlodig`): played to
  0:27, duration 91:38 resolved, dragged the seek bar to 46:50 and playback
  continued from there.
- **YouTube**, on the Day 7 URL carrying `&list=RD…`: loaded as a single 9:08
  Track rather than a radio playlist, played to 0:10.
- **Variant switch mid-Track, on the real Calendar**: Day 2 "Harvest Time"
  playing, switched light → heavy; the copy changed from "soothe your mind" to
  "get schwifty" and the audio ran through it unbroken, 0:25 → 0:33, same
  duration, no restart.
- **Skip / previous / shuffle** on the real Calendar with two Days opened: next
  moved Day 2 → Day 1, previous moved back, and reaching the last Track enabled
  shuffle as it did before.
- **Now-playing bar**: cover, Track name, artist, elapsed and total all correct
  throughout ("Birds" / Sam Sala / 0:03 / 5:47; "Harvest Time" / Pharoah
  Sanders / 20:25).
- `npx tsc --noEmit` clean; `next build` still reports `/` as `○ (Static)`;
  `opennextjs-cloudflare build` succeeds and the Worker serves `/` 200,
  `/sign-in` 200, `/dashboard` 307, `/bindings-check` `{"d1":"ok","r2":"ok"}`.

### Not fixed, and pre-existing

- `CalendarCard` hydrates with a mismatch: `motion` writes full-precision
  transforms on the client against rounded ones from the server. It is in a
  component this ticket does not touch and has nothing to do with the player.
- Two `react-hooks/set-state-in-effect` lint errors in the locked-playback
  effect, also pre-existing.

### One thing that was not the player

`opennextjs-cloudflare build` was failing on `sharp` — `No loader is configured
for ".node" files`. The cause was a corrupted `node_modules/node_modules`
holding 477 packages, left by two agents running `npm install` at the same
time. `rm -rf node_modules && npm ci` fixed it. Worth knowing if parallel work
continues: concurrent installs corrupt the tree, and the symptom looks like a
bundler problem.
