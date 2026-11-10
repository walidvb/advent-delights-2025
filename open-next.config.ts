import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default {
  ...defineCloudflareConfig({
    // Serves the pages Next prerenders at build time straight from the Workers
    // assets. Nothing revalidates: a Calendar is rendered per request from its
    // cached payload, which is purged on a write rather than rebuilt on a timer.
    incrementalCache: () =>
      import(
        "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache"
      ).then((m) => m.default),
  }),
  // `pnpm run build` is this OpenNext build, so Next itself is built by a
  // separate script — the default (`build`) would call back into this one.
  buildCommand: "pnpm run build:next",
};
