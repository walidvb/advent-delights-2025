import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN } from '@/lib/sentry';

Sentry.init({ dsn: SENTRY_DSN });
