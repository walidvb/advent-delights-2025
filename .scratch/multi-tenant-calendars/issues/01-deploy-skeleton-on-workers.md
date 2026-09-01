# 01: Deploy skeleton on Workers

**What to build:** The existing single-Calendar site, running as a deployed Cloudflare Worker instead of a static export, with a database and an object store attached and reachable. Nothing about what a visitor sees changes — this ticket exists so that every ticket after it has somewhere to land.

The adapter the project currently deploys with has been deprecated and its repository archived; it is replaced with the supported one. The static-export setting goes with it, since everything after this needs server routes.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The upstream project is present locally as this repo's starting commit, with the domain docs already in this directory preserved
- [ ] The deprecated deploy adapter and the static-export setting are both gone
- [ ] The app builds and deploys as a Worker and serves the 2025 Calendar exactly as before
- [ ] A database binding and an object-store binding are configured and readable from a route, proven by a throwaway endpoint that touches both
- [ ] The same works locally against local emulation of both
- [ ] Watch for: the Calendar data is read from a spreadsheet file on disk in a server component. That is fine while the page is prerendered at build time, and breaks if it ever renders per request. Confirm which is happening before closing this ticket.
