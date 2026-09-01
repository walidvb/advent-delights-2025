# 02: Player on react-player v2

**What to build:** Playback that works on the previous major version of the media player library, which handles SoundCloud better. A listener can play a Track, seek within it, skip between Tracks, shuffle, and switch Variant mid-track without the audio cutting out.

This is not a version bump. The current code is written against the newer version's property and callback shapes and has to be rewritten against the older ones.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The player library is on the previous major version
- [ ] Play, pause, seek, skip and shuffle all work against a YouTube Track
- [ ] All of the above work against a SoundCloud Track — this is the entire reason for the change, so an unverified SoundCloud path fails this ticket
- [ ] Switching Variant while a Track is playing does not interrupt or restart the audio
- [ ] The now-playing bar still shows cover, Track name, artist and elapsed time correctly
- [ ] No visible change to the player's appearance
