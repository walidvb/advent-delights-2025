# 12: Cover image upload

**What to build:** A Contributor who does not like the looked-up artwork uploads their own, including straight from a phone, and sees it on their Day.

Images are shrunk in the browser before they are sent, so a photo taken on a phone uploads quickly and nothing large or slow happens on the server. An uploaded image always wins over a looked-up one.

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] A Contributor can upload a cover for each Track and see a preview before submitting
- [ ] The image is resized in the browser before upload, to roughly 800 pixels on its long edge
- [ ] JPEG, PNG and WebP under 5MB are accepted
- [ ] Anything else, including phone-native formats, is refused with a message that says what to do instead
- [ ] No image processing happens on the server
- [ ] Uploaded images are served back by the application from the object store, not from the store's own public development URL
- [ ] An uploaded cover takes precedence over a looked-up one, and removing it falls back to the looked-up one
- [ ] Editing a Submission can replace a previously uploaded cover
