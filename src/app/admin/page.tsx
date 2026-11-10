import Link from 'next/link';
import { isArchived } from '@/app/advent/reveal';
import { listAllCalendars, requireAdmin } from '@/lib/admin';
import { calendarPath } from '@/lib/calendars';
import { deleteCalendarAction, deleteSubmissionAction, refreshCalendarAction } from './actions';
import { ConfirmDelete } from './ConfirmDelete';

export default async function AdminPage() {
  const admin = await requireAdmin();
  const calendars = await listAllCalendars();
  const now = new Date();

  return (
    <main className="min-h-dvh bg-[url('/light.webp')] bg-cover bg-fixed bg-center">
      <header className="flex items-center justify-between gap-4 border-b border-black/5 bg-white/40 px-6 py-4 backdrop-blur sm:px-10">
        <Link href="/" className="font-title text-3xl italic font-light">
          Advent Delights
        </Link>
        <div className="flex items-center gap-4 text-sm text-zinc-600">
          <span className="hidden sm:inline">{admin.email}</span>
          <Link href="/dashboard" className="underline">
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="font-title text-3xl font-light">All calendars</h1>
          <p className="text-sm text-zinc-600">{calendars.length} on the platform.</p>
        </div>

        <ul className="flex flex-col gap-3">
          {calendars.map((calendar) => {
            const archived = isArchived(calendar.year, now);
            return (
              <li
                key={calendar.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Link href={calendarPath(calendar.slug)} className="text-lg font-medium hover:underline">
                      {calendar.name} <span className="text-sm text-zinc-500">{calendar.year}</span>
                    </Link>
                    <span className="truncate text-sm text-zinc-500">
                      {calendar.curatorEmail} · {calendar.claims.length} of 25 claimed
                      {archived && ' · Archived'}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={refreshCalendarAction.bind(null, calendar.id)}>
                      <button
                        type="submit"
                        title="Clear the cached copy so the page reads the database again"
                        className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Refresh
                      </button>
                    </form>
                    <ConfirmDelete
                      action={deleteCalendarAction.bind(null, calendar.id)}
                      label="Delete"
                      title={`Delete “${calendar.name}”?`}
                      message={`This removes the Calendar and all ${calendar.claims.length} of its Submissions. Its links stop working. No undo.`}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                    />
                  </div>
                </div>

                {!archived && calendar.claims.length > 0 && (
                  <ul className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                    {calendar.claims.map((claim) => (
                      <li
                        key={claim.day}
                        className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-1 pl-3 pr-1 text-xs"
                      >
                        <span className="font-mono text-zinc-400">{claim.day}</span>
                        <span className="max-w-[12ch] truncate">{claim.claimedBy}</span>
                        <ConfirmDelete
                          action={deleteSubmissionAction.bind(null, calendar.id, claim.day)}
                          label="×"
                          ariaLabel={`Delete the Submission on Day ${claim.day}`}
                          title={`Delete the Submission on Day ${claim.day}?`}
                          message={`Removes ${claim.claimedBy}'s Submission from Day ${claim.day} of “${calendar.name}”. The Day becomes free again if it hasn't opened. No undo.`}
                          className="flex size-5 items-center justify-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-700"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
