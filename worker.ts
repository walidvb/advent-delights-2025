// The Worker entry: the one OpenNext generates, wrapped so Sentry captures
// errors and D1 spans from every request.
import * as Sentry from '@sentry/nextjs/cloudflare';
// `.open-next/worker.js` exists only after a build, so expect-error would fail
// the next one.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import handler from './.open-next/worker.js';
import { SENTRY_DSN } from './src/lib/sentry';

export default Sentry.withSentry(() => ({ dsn: SENTRY_DSN }), handler);
