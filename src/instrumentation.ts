import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN } from '@/lib/sentry';

export function register() {
  // On the Worker, `withSentry` in worker.ts owns the client and this creates
  // none; it is what reports errors under `next dev`, which runs on Node.js.
  if (process.env.NEXT_RUNTIME === 'nodejs') Sentry.init({ dsn: SENTRY_DSN });
}

// Errors from Server Components, route handlers and server actions.
export const onRequestError = Sentry.captureRequestError;
