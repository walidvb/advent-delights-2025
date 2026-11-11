import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurator, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/lib/auth';
import { listCalendars } from '@/lib/calendars';
import { signOutAction } from '@/app/sign-in/actions';
import { setPasswordAction } from './actions';
import { Occupancy } from '@/app/submit/Occupancy';

const pill = 'rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-50 hover:opacity-90';

const PASSWORD_MESSAGES: Record<string, string> = {
  ok: 'Password saved. You can sign in with it or with a code.',
  short: `That password is too short. Use at least ${MIN_PASSWORD_LENGTH} characters.`,
  long: `That password is too long. Use at most ${MAX_PASSWORD_LENGTH} characters.`,
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ taken?: string; passwordSet?: string }>;
}) {
  const curator = await getCurator();
  if (!curator) redirect('/sign-in');

  const [{ taken, passwordSet }, calendars] = await Promise.all([searchParams, listCalendars(curator.id)]);

  return (
    <main className="min-h-dvh bg-[url('/light.webp')] bg-cover bg-fixed bg-center">
      <header className="flex items-center justify-between gap-4 border-b border-black/5 bg-white/40 px-6 py-4 backdrop-blur sm:px-10">
        <Link href="/" className="font-title text-3xl italic font-light">
          Advent Delights
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-zinc-600 sm:inline">{curator.email}</span>
          <form action={signOutAction}>
            <button type="submit" className="text-sm text-zinc-600 underline">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 sm:px-10">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-title text-3xl font-light">Your calendars</h1>
            <p className="text-sm text-zinc-600">Signed in as {curator.email}.</p>
          </div>
          {calendars.length > 0 && (
            <Link href="/dashboard/new" className={pill}>
              New calendar
            </Link>
          )}
        </div>

        {taken && (
          <p role="status" className="rounded-md border border-border bg-white/90 px-3 py-2 text-sm">
            That address was already taken, so this Calendar is at{' '}
            <span className="font-mono">{taken}</span>. Change it in Settings if you&apos;d rather
            have something else.
          </p>
        )}

        {calendars.length === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/70 bg-white/90 p-10 text-center shadow-[0_12px_40px_rgba(0,0,0,.10)]">
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 25 }, (_, i) => (
                <span
                  key={i}
                  className="size-6 rounded-md border border-dashed border-zinc-900/20 bg-zinc-100/60"
                />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="font-title text-2xl font-light">Twenty-five empty days</h2>
              <p className="max-w-sm text-sm text-zinc-600">
                Name a calendar, send the submit link to your group chat, and watch the days get
                taken. You won&apos;t see what anyone picks — that&apos;s the whole idea.
              </p>
            </div>
            <Link href="/dashboard/new" className={pill}>
              Create your first calendar
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {calendars.map((calendar) => (
              <li key={calendar.id}>
                <Link
                  href={`/dashboard/calendar/${calendar.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] transition-shadow hover:shadow-[0_2px_4px_rgba(0,0,0,.06),0_14px_34px_rgba(0,0,0,.10)] sm:flex-row sm:items-center sm:justify-between sm:gap-8"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-lg font-medium">
                      {calendar.name} <span className="text-sm text-zinc-500">{calendar.year}</span>
                    </span>
                    <span className="text-sm text-zinc-500">
                      {calendar.claimedCount} of 25 claimed ·{' '}
                      {calendar.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <div className="w-full max-w-[220px] shrink-0">
                    <Occupancy total={25} opened={0} claimed={calendar.claimedCount} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <form
          action={setPasswordAction}
          className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)]"
        >
          <div className="flex flex-col gap-0.5">
            <label htmlFor="password" className="text-lg font-medium">
              {curator.hasPassword ? 'Change your password' : 'Set a password'}
            </label>
            <p className="text-sm text-zinc-500">
              Optional. Sign in with it next time instead of waiting for a code — the code keeps
              working too.
            </p>
          </div>
          {passwordSet && PASSWORD_MESSAGES[passwordSet] && (
            <p role="status" className="text-sm text-zinc-700">
              {PASSWORD_MESSAGES[passwordSet]}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Lets password managers file the new password under the right account. */}
            <input type="email" name="username" autoComplete="username" value={curator.email} readOnly hidden />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={MAX_PASSWORD_LENGTH}
              className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-base outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
            <button type="submit" className={`${pill} shrink-0`}>
              Save password
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
