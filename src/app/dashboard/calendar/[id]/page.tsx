import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurator } from '@/lib/auth';
import { getOwnedCalendar } from '@/lib/calendars';
import { updateCalendarAction } from '@/app/dashboard/actions';

const field =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring';
const button = 'rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground hover:opacity-90';

export default async function CalendarSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const curator = await getCurator();
  if (!curator) redirect('/sign-in');

  // Someone else's Calendar is indistinguishable from one that doesn't exist.
  const calendar = await getOwnedCalendar((await params).id, curator.id);
  if (!calendar) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <Link href="/dashboard" className="text-sm underline text-muted-foreground">
        Your Calendars
      </Link>

      <h1 className="font-title text-4xl">
        {calendar.name} <span className="text-2xl text-muted-foreground">{calendar.year}</span>
      </h1>

      <form action={updateCalendarAction} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={calendar.id} />

        <label htmlFor="name" className="text-sm">
          Name
        </label>
        <input id="name" name="name" required defaultValue={calendar.name} className={field} />

        <label htmlFor="description" className="text-sm">
          Description <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={calendar.description}
          className={field}
        />

        <label htmlFor="slug" className="text-sm">
          Address
        </label>
        <input id="slug" name="slug" defaultValue={calendar.slug} className={`${field} font-mono`} />
        <p className="text-xs text-muted-foreground">
          The readable half of the pair, so it is guessable by design. If it is taken you&apos;ll get
          the next free number on the end. Want it hard to find? Choose something nobody would guess.
        </p>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_public"
            defaultChecked={Boolean(calendar.is_public)}
            className="size-4"
          />
          List this Calendar publicly
        </label>
        <p className="text-xs text-muted-foreground">
          Listing only. The link works for anyone holding it either way.
        </p>

        <button type="submit" className={`${button} self-start`}>
          Save
        </button>
      </form>
    </main>
  );
}
