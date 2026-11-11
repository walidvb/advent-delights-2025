import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // @cucu/media ships TypeScript source, not a build.
  transpilePackages: ['@cucu/media'],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
};

// Uploads source maps to the personal Sentry org when SENTRY_AUTH_TOKEN is set
// in the build environment; without it the build still succeeds, unsymbolicated.
export default withSentryConfig(nextConfig, {
  org: "cucu-he",
  project: "advent",
  silent: !process.env.CI,
});

// Makes the wrangler.jsonc bindings (DB, BUCKET) available to `next dev`.
initOpenNextCloudflareForDev();
