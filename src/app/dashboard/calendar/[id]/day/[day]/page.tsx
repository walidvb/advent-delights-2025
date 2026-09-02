import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurator } from '@/lib/auth';
import { getClaim, revealDay } from '@/lib/curation';
import { DAYS_IN_CALENDAR } from '@/app/advent/reveal';
import { deleteSubmissionAction } from '@/app/dashboard/actions';

/**
 * One Day, from the Curator's side. Two things happen here and nothing else:
 * the Submission can be deleted, and the Day can be spoiled.
 *
 * **Nothing is read from `tracks` unless `?spoil=1` is on the URL**, which is
 * only ever reached by clicking the link under the warning below. Arriving at
 * this page, hovering the link, or deleting from it all leave the surprise
 * intact — and spoiling this Day says nothing about any other, because
 * `revealDay` is asked for one Day.
 */

const button = 'rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground hover:opacity-90';

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

  // Null for somebody else's Calendar and for a Day nobody has claimed, so
  // neither is distinguishable from a Day that does not exist.
  const claim = await getClaim(id, curator.id, day);
  if (!claim) notFound();

  const revealed = spoil === '1' ? await revealDay(id, curator.id, day) : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <Link href={`/dashboard/calendar/${id}`} className="text-sm underline text-muted-foreground">
        Back to the Calendar
      </Link>

      <h1 className="font-title text-4xl">Day {day}</h1>
      <p>
        Claimed by <strong>{claim.claimedBy}</strong>.
      </p>

      <form action={deleteSubmissionAction} className="flex flex-col gap-2 border-t border-border pt-6">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="day" value={day} />
        <h2 className="font-title text-2xl">Remove this Submission</h2>
        <p className="text-sm text-muted-foreground">
          Deletes what {claim.claimedBy} put behind Day {day} without showing it to you, and frees
          the Day for someone else — as long as it hasn&apos;t opened yet. There is no undo.
        </p>
        <button type="submit" className={`${button} self-start bg-destructive`}>
          Delete Day {day}
        </button>
      </form>

      <section className="flex flex-col gap-2 border-t border-border pt-6">
        <h2 className="font-title text-2xl">Look behind Day {day}</h2>
        {revealed ? (
          <>
            <p className="text-sm text-muted-foreground">
              Day {day}, spoiled at your request. Every other Day is still a surprise.
            </p>
            {revealed.link && (
              <p className="text-sm">
                {claim.claimedBy}&apos;s link: <span className="font-mono">{revealed.link}</span>
              </p>
            )}
            {revealed.tracks.map((track) => (
              <article key={track.variant} className="flex flex-col gap-1 rounded-md border border-border p-4">
                <h3 className="font-title text-xl">{track.label}</h3>
                <p>
                  <strong>{track.title}</strong> — {track.artist}
                </p>
                <p className="text-sm">{track.description}</p>
                <p className="break-all font-mono text-xs text-muted-foreground">{track.url}</p>
                {track.buyLink && (
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    Buy: {track.buyLink}
                  </p>
                )}
                {track.cover && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={track.cover} alt="" className="size-32 rounded-md object-cover" />
                )}
              </article>
            ))}
          </>
        ) : (
          <>
            <p className="text-sm">
              This will show you the tracks {claim.claimedBy} chose for Day {day}, and you
              won&apos;t be able to unsee them. Only do this if you have a reason to — a broken
              link, or something that shouldn&apos;t be there. Nothing on this page has been read
              from the Calendar yet.
            </p>
            {/* A plain anchor, not a Link: nothing is to be prefetched into the
                browser before the Curator has decided to spoil themselves. */}
            <a href={`/dashboard/calendar/${id}/day/${day}?spoil=1`} className={`${button} self-start`}>
              Spoil Day {day} for me
            </a>
          </>
        )}
      </section>
    </main>
  );
}
