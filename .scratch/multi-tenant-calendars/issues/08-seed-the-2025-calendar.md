# 08: Seed the 2025 Calendar

**What to build:** A one-off script that loads the original 2025 Calendar — 21 real Submissions and their existing cover images — into the database and object store as a real Calendar owned by a real account.

This runs before the read path deliberately, so every ticket after it has genuine content to develop against instead of invented fixtures.

The source data is messy in ways the import has to survive, and that is the point: it is the most realistic data this project will ever have.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] Running the script produces a complete Calendar with its Submissions and two Tracks each
- [ ] Cover images are uploaded to the object store and referenced from their Tracks
- [ ] Columns present in the source but absent from the old code's type are handled deliberately: imported or dropped, decided rather than ignored
- [ ] Rows where the cover-image column is empty but a cover-identifier column is populated resolve to the right image
- [ ] The file-extension rewrite in the old code, which makes source values differ from the files on disk, is accounted for
- [ ] Cover files existing in both accented and unaccented spellings resolve to one image without a crash
- [ ] Days with no Submission in the source are left empty rather than filled with placeholders
- [ ] The script is re-runnable without creating duplicates
