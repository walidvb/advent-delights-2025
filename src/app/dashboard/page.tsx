import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurator } from '@/lib/auth';
import { calendarPath, listCalendars, submitPath } from '@/lib/calendars';
import { signOutAction } from '@/app/sign-in/actions';
import { createCalendarAction } from './actions';
import { CopyLink } from './CopyLink';

const field =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring';
const button = 'rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground hover:opacity-90';

/**
 * Where the shareable links point. Taken from the incoming request so the same
 * code serves localhost, preview and production without configuration.
 *
 * ponytail: trusts the Host header, which only the signed-in Curator can forge,
 * and only for their own page. Pin a configured base URL if the links ever get
 * used for anything but showing the Curator their own address.
 */
async function origin() {
  const incoming = await headers();
  return `${incoming.get('x-forwarded-proto') ?? 'http'}://${incoming.get('host')}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; taken?: string }>;
}) {
  const curator = await getCurator();
  if (!curator) redirect('/sign-in');

  const [{ error, taken }, calendars, base] = await Promise.all([
    searchParams,
    listCalendars(curator.id),
    origin(),
  ]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 p-6">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="font-title text-4xl">Your Calendars</h1>
        <form action={signOutAction}>
          <button type="submit" className="text-sm underline text-muted-foreground">
            Sign out
          </button>
        </form>
      </header>

      <p className="text-sm text-muted-foreground">Signed in as {curator.email}.</p>

      {taken && (
        <p role="status" className="rounded-md border border-border px-3 py-2 text-sm">
          That address was already taken, so this Calendar is at{' '}
          <span className="font-mono">{taken}</span>. Change it in Settings if you&apos;d rather
          have something else.
        </p>
      )}

      {calendars.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
          You haven&apos;t made a Calendar yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {calendars.map((calendar) => (
            <li key={calendar.id} className="flex flex-col gap-3 rounded-md border border-border p-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-title text-2xl">
                  {calendar.name}{' '}
                  <span className="text-base text-muted-foreground">{calendar.year}</span>
                </h2>
                <Link href={`/dashboard/calendar/${calendar.id}`} className="text-sm underline">
                  Settings
                </Link>
              </div>

              {calendar.description && <p className="text-sm">{calendar.description}</p>}

              <p className="text-xs text-muted-foreground">
                {calendar.is_public ? 'Public — may be listed.' : 'Unlisted — shared by link only.'}
              </p>

              <CopyLink
                label="Calendar link"
                hint="share this in December"
                url={base + calendarPath(calendar.slug)}
              />
              <CopyLink
                label="Submission link"
                hint="secret — share this beforehand"
                url={base + submitPath(calendar.submit_slug)}
              />
            </li>
          ))}
        </ul>
      )}

      <form action={createCalendarAction} className="flex flex-col gap-3 border-t border-border pt-8">
        <h2 className="font-title text-2xl">Make a Calendar</h2>

        {error === 'name' && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Give your Calendar a name.
          </p>
        )}

        <label htmlFor="name" className="text-sm">
          Name
        </label>
        <input id="name" name="name" required placeholder="Our Street's Advent" className={field} />

        <label htmlFor="description" className="text-sm">
          Description <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Who this is for."
          className={field}
        />

        <button type="submit" className={`${button} self-start`}>
          Make it
        </button>
      </form>
    </main>
  );
}
