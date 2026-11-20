import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurator } from '@/lib/auth';
import { getOwnedCalendar } from '@/lib/calendars';
import { getClaim, getClaims, revealDay } from '@/lib/curation';
import { getDayToFill } from '@/lib/submissions';
import { DAYS_IN_CALENDAR } from '@/app/advent/reveal';
import { deleteSubmissionAction } from '@/app/dashboard/actions';
import { FillForm } from './FillForm';

/**
 * One Day, from the Curator's side. Two things happen here: the Submission
 * can be deleted, and the Day can be spoiled.
 *
 * **Spoiling is one click, immediate, no separate confirmation step** — the
 * click on "Spoil" is the whole of the decision. `?spoil=1` is only ever
 * reached by that click (a plain `<a>`, never prefetched), and `revealDay`
 * marks the Day spoiled the first time, so the Curator's grid keeps showing it
 * that way afterward.
 *
 * A self-filled Calendar has no surprise to keep from its Curator, so there
 * this page is the form for the Day instead — empty or already filled.
 */
export default async function CuratorDayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; day: string }>;
  searchParams: Promise<{ spoil?: string }>;
}) {
  const curator = await getCurator();
  if (!curator) redirect('/sign-in');

  const [{ id, day: rawDay }, { spoil }] = await Promise.all([params, searchParams]);
  const day = Number(rawDay);
  if (!Number.isInteger(day) || day < 1 || day > DAYS_IN_CALENDAR) notFound();

  const calendar = await getOwnedCalendar(id, curator.id);
  if (!calendar) notFound();
  if (calendar.self_filled) {
    return <SelfFilledDay calendarId={id} curatorId={curator.id} submitSlug={calendar.submit_slug} day={day} />;
  }

  const claim = await getClaim(id, curator.id, day);
  if (!claim) notFound();

  const revealed = spoil === '1' ? await revealDay(id, curator.id, day) : null;

  return (
    <main className="flex min-h-dvh justify-center bg-[url('/light.webp')] bg-cover bg-fixed bg-center px-4 py-10">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <Link href={`/dashboard/calendar/${id}`} className="text-sm text-zinc-600">
          ← Back to the Calendar
        </Link>

        <div className="rounded-2xl border border-white/70 bg-white/95 p-6 shadow-[0_10px_30px_rgba(0,0,0,.10)]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-zinc-400">Day {day}</span>
          </div>
          <p className="mt-2 text-sm">
            Claimed by <strong>{claim.claimedBy}</strong>.
          </p>

          <form action={deleteSubmissionAction} className="mt-5 flex items-center gap-3 border-t border-zinc-100 pt-5">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="day" value={day} />
            <button
              type="submit"
              className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Delete Day {day}
            </button>
            <span className="text-xs text-zinc-400">
              Frees the Day again — as long as it hasn&apos;t opened yet. No undo.
            </span>
          </form>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/95 p-6 shadow-[0_10px_30px_rgba(0,0,0,.10)]">
          {revealed ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wide text-red-700">
                  Seal broken
                </span>
                <span className="font-mono text-xs text-zinc-400">{day}</span>
              </div>
              {revealed.tracks.map((track) => (
                <div key={track.variant} className="flex items-center gap-3">
                  {track.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={track.cover} alt="" className="size-11 shrink-0 rounded-md object-cover" />
                  )}
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{track.title}</span>
                    <span className="text-xs text-zinc-500">
                      {track.artist} · {track.label.toLowerCase()}
                    </span>
                  </div>
                </div>
              ))}
              {revealed.link && (
                <p className="text-xs text-zinc-500">
                  {claim.claimedBy}&apos;s link: <span className="font-mono">{revealed.link}</span>
                </p>
              )}
              <p className="border-t border-zinc-100 pt-3 text-xs text-zinc-500">
                Only you can see this. Day {day} still reveals normally for everyone else.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-600">
                Nothing here has been read yet — spoiling is instant, one click.
              </span>
              {/* A plain anchor, not a Link: nothing is prefetched into the
                  browser before the Curator has actually clicked to spoil. */}
              <a
                href={`/dashboard/calendar/${id}/day/${day}?spoil=1`}
                className="shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50"
              >
                Spoil
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

const card = 'rounded-2xl border border-white/70 bg-white/95 p-6 shadow-[0_10px_30px_rgba(0,0,0,.10)]';

async function SelfFilledDay({
  calendarId,
  curatorId,
  submitSlug,
  day,
}: {
  calendarId: string;
  curatorId: string;
  submitSlug: string;
  day: number;
}) {
  const [target, claims] = await Promise.all([
    getDayToFill(calendarId, curatorId, day),
    getClaims(calendarId, curatorId),
  ]);
  if (!target || !claims) notFound();

  // Simply the following Day, filled or not: its page shows whatever is
  // already there, so walking the Days in order also works for editing.
  const nextDay = day < DAYS_IN_CALENDAR ? day + 1 : null;
  const editable = !target.archived && (target.claimed || claims.days[day - 1].claimable);
  const base = `/dashboard/calendar/${calendarId}`;

  return (
    <main className="flex min-h-dvh justify-center bg-[url('/light.webp')] bg-cover bg-fixed bg-center px-4 py-10">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <div className="flex items-center justify-between text-sm text-zinc-600">
          <Link href={base}>← Back to the Calendar</Link>
          <span className="flex gap-4">
            {day > 1 && <Link href={`${base}/day/${day - 1}`}>‹ Day {day - 1}</Link>}
            {day < DAYS_IN_CALENDAR && <Link href={`${base}/day/${day + 1}`}>Day {day + 1} ›</Link>}
          </span>
        </div>

        <div className={card}>
          <div className="mb-4 flex items-baseline justify-between">
            <h1 className="font-title text-3xl font-light">Day {day}</h1>
            <span className="font-mono text-xs text-zinc-400">
              {target.claimed ? 'filled' : 'empty'}
            </span>
          </div>

          {editable ? (
            // Keyed by Day: moving on to the next Day must start a fresh form,
            // not carry over what was typed into this one.
            <FillForm
              key={day}
              calendarId={calendarId}
              submitSlug={submitSlug}
              day={day}
              nextDay={nextDay}
              variants={target.variants}
              draft={target.draft}
            />
          ) : (
            <p className="text-sm text-zinc-600">
              {target.archived
                ? 'This Calendar has finished — an Archive can no longer be changed.'
                : `Day ${day} has already opened, so it stays empty.`}
            </p>
          )}
        </div>

        {target.claimed && !target.archived && (
          <form action={deleteSubmissionAction} className={`${card} flex items-center gap-3`}>
            <input type="hidden" name="id" value={calendarId} />
            <input type="hidden" name="day" value={day} />
            <button
              type="submit"
              className="shrink-0 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Empty Day {day}
            </button>
            <span className="text-xs text-zinc-400">
              Removes what&apos;s on this Day — as long as it hasn&apos;t opened yet. No undo.
            </span>
          </form>
        )}
      </div>
    </main>
  );
}
