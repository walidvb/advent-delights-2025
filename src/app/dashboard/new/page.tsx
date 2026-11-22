import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurator } from '@/lib/auth';
import { createCalendarAction } from '@/app/dashboard/actions';

const field =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring';

export default async function NewCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const curator = await getCurator();
  if (!curator) redirect('/sign-in');
  const { error } = await searchParams;

  return (
    <main className="flex min-h-dvh justify-center bg-[url('/light.webp')] bg-cover bg-fixed bg-center px-4 py-10 sm:py-16">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Link href="/dashboard">Your calendars</Link>
          <span className="text-zinc-400">/</span>
          <span>New</span>
        </div>

        <form
          action={createCalendarAction}
          className="flex flex-col gap-5 rounded-2xl border border-white/70 bg-white/95 p-8 shadow-[0_12px_40px_rgba(0,0,0,.10)]"
        >
          <div className="flex flex-col gap-1">
            <h1 className="font-title text-3xl font-light">Start a calendar</h1>
            <p className="text-sm text-zinc-500">You can change any of this later, except the tracks per day.</p>
          </div>

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
            Short description <span className="text-zinc-400">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            placeholder="Who this is for."
            className={field}
          />
          <p className="-mt-3 text-xs text-zinc-400">
            Shown on the Submit page. One line is plenty.
          </p>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm">Tracks per day</legend>
            <label className="flex items-start gap-2 text-sm">
              <input type="radio" name="tracksPerDay" value="two" defaultChecked className="mt-1" />
              <span>
                Two <span className="text-zinc-500">— one light, one heavy; listeners switch between them</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="radio" name="tracksPerDay" value="one" className="mt-1" />
              <span>
                One <span className="text-zinc-500">— a single track each day</span>
              </span>
            </label>
          </fieldset>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-6 py-3 font-medium text-zinc-50 hover:opacity-90"
            >
              Create calendar
            </button>
            <Link href="/dashboard" className="text-sm text-zinc-500">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
