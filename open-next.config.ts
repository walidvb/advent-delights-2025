import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // The Calendar page is prerendered at build time and never revalidates, so the
  // prerendered HTML is served straight from the Workers assets. Without this the
  // Worker re-renders the page per request, and the build-time CSV read fails.
  incrementalCache: () =>
    import(
      "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache"
    ).then((m) => m.default),
});
