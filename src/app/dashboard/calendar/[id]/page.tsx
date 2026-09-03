import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getCurator } from '@/lib/auth';
import { calendarPath, getOwnedCalendar, submitPath } from '@/lib/calendars';
import { getClaims } from '@/lib/curation';
import { updateCalendarAction } from '@/app/dashboard/actions';
import { CopyLink } from '@/app/dashboard/CopyLink';
import { ClaimGrid } from './ClaimGrid';

const field =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring';

async function origin() {
  const incoming = await headers();
  return `${incoming.get('x-forwarded-proto') ?? 'http'}://${incoming.get('host')}`;
}

export default async function CalendarSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const curator = await getCurator();
  if (!curator) redirect('/sign-in');

  const id = (await params).id;
  const [calendar, claims, base] = await Promise.all([
    getOwnedCalendar(id, curator.id),
    getClaims(id, curator.id),
    origin(),
  ]);
  if (!calendar || !claims) notFound();

  return (
    <main className="min-h-dvh bg-[url('/light.webp')] bg-cover bg-fixed bg-center">
      <header className="flex items-center justify-between gap-4 border-b border-black/5 bg-white/40 px-6 py-4 backdrop-blur sm:px-10">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Link href="/dashboard">Your calendars</Link>
          <span className="text-zinc-400">/</span>
          <span className="text-zinc-900">{calendar.name}</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-title text-3xl font-light">
              {calendar.name} <span className="text-lg text-zinc-500">{calendar.year}</span>
            </h1>
            <p className="text-sm text-zinc-600">
              {claims.claimedCount} of {claims.days.length} days claimed. Names are hidden until you
              ask — contents never.
            </p>
          </div>

          <ClaimGrid calendarId={calendar.id} days={claims.days} />
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 rounded-2xl border border-white/70 bg-white/95 p-5 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)]">
            <span className="font-mono text-[11px] uppercase tracking-wide text-zinc-400">
              Two links, two jobs
            </span>
            <CopyLink
              label="Submit link"
              hint="send this now — how people claim a day"
              url={base + submitPath(calendar.submit_slug)}
            />
            <CopyLink
              label="Calendar link"
              hint="send in December — nothing opens early"
              url={base + calendarPath(calendar.slug)}
            />
          </div>

          <form
            action={updateCalendarAction}
            className="flex flex-col gap-4 rounded-2xl border border-white/70 bg-white/95 p-5 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)]"
          >
            <span className="font-mono text-[11px] uppercase tracking-wide text-zinc-400">Settings</span>
            <input type="hidden" name="id" value={calendar.id} />

            <label htmlFor="name" className="text-sm">
              Name
            </label>
            <input id="name" name="name" required defaultValue={calendar.name} className={field} />

            <label htmlFor="description" className="text-sm">
              Description <span className="text-zinc-400">(optional)</span>
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
            <input id="slug" name="slug" defaultValue={calendar.slug} className={`${field} font-mono text-sm`} />
            <p className="-mt-2 text-xs text-zinc-400">
              Changing this breaks links you&apos;ve already sent.
            </p>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_public"
                defaultChecked={Boolean(calendar.is_public)}
                className="size-4"
              />
              Public
            </label>
            <p className="-mt-2 text-xs text-zinc-400">
              Listed for others to discover. Private isn&apos;t advertised — anyone with the link
              can still open it.
            </p>

            <button
              type="submit"
              className="self-start rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-50 hover:opacity-90"
            >
              Save changes
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
