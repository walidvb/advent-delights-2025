'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState, useSyncExternalStore } from 'react';
import { CopyLink } from '@/app/dashboard/CopyLink';
import { SubmissionFields, button } from '../SubmissionFields';
import { submitAction, type SubmitState } from '../actions';
import type { DayState, SubmissionDraft, SubmitView } from '@/lib/submissions';

/**
 * Claiming a Day and submitting its Tracks.
 *
 * The grid says claimed or free and gives the credited name — never a Track
 * title, an artist or a cover, because a Contributor helping build the Calendar
 * must not have it spoiled for them.
 *
 * Nothing is claimed by picking a tile. The claim happens when the form is
 * submitted and the database's unique index on the Day decides who got it, so
 * two people can be filling in Day 12 at the same time and exactly one of them
 * wins. The loser is told, gets the grid as it now stands, and keeps every word
 * they typed — the fields are remounted with what came back as their defaults.
 */

const EMPTY: SubmissionDraft = { creditedTo: '', link: '', email: '', tracks: {} };

/** Remembers, per Calendar, that this browser has already claimed a Day. */
const rememberedKey = (submitSlug: string) => `advent.submitted.${submitSlug}`;

/**
 * The edit link this browser stored the last time it claimed a Day here, or
 * null. Read through `useSyncExternalStore` rather than an effect: the server
 * has no storage to read, and the client reads it once on hydration.
 */
function useRemembered(submitSlug: string) {
  return useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return localStorage.getItem(rememberedKey(submitSlug));
      } catch {
        return null;
      }
    },
    () => null,
  );
}

export function SubmitForm({ view }: { view: SubmitView }) {
  const [state, act, pending] = useActionState<SubmitState, FormData>(submitAction, { attempt: 0 });
  const [picked, setPicked] = useState<number | null>(null);
  const alreadyClaimed = useRemembered(view.submitSlug);

  const days = state.days ?? view.days;
  const free = days.filter((day) => day.claimable && !day.claimedBy);
  // A Day picked before someone else took it is no longer a choice.
  const day = free.some((slot) => slot.day === picked) ? picked : null;

  // Remembering the claim is the whole of the "one Day each" rule: a reminder,
  // never a refusal. A browser that refuses storage simply gets no reminder.
  useEffect(() => {
    if (!state.claimed) return;
    try {
      localStorage.setItem(rememberedKey(view.submitSlug), state.claimed.editPath);
    } catch {
      // Nothing to do: the edit link is on screen either way.
    }
  }, [state.claimed, view.submitSlug]);

  if (state.claimed) {
    return (
      <section className="flex flex-col gap-4">
        <h2 className="font-title text-3xl">That&apos;s your Day claimed.</h2>
        <p className="text-sm">
          Keep the first link — it is the only way back to your Submission, and anyone holding it
          can change it. The second is the Calendar itself, for December.
        </p>
        <CopyLink
          label="Your edit link"
          hint="keep this"
          url={absolute(state.claimed.editPath)}
        />
        <CopyLink label="The Calendar" url={absolute(state.claimed.calendarPath)} />
        <Link href={state.claimed.editPath} className="text-sm underline">
          Open your Submission
        </Link>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Grid days={days} picked={day} onPick={setPicked} />

      {alreadyClaimed && (
        <p role="status" className="rounded-md border border-border px-3 py-2 text-sm">
          You&apos;ve already claimed a Day in this Calendar on this device.{' '}
          <Link href={alreadyClaimed} className="underline">
            Edit that Submission
          </Link>{' '}
          instead? Take another Day if you really mean to — there just may be someone else who
          wanted one.
        </p>
      )}

      {/* Outside the form: a refusal must still be readable when the refusal was
          that there is nothing left to claim and the form has just gone away. */}
      {state.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      {free.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-8 text-center">
          {days.some((day) => day.claimable)
            ? 'Every free Day here has been claimed. This Calendar is full.'
            : 'Every Day of this Calendar has already opened, so there is nothing left to claim.'}
        </p>
      ) : (
        <form key={state.attempt} action={act} className="flex flex-col gap-3">
          <input type="hidden" name="submit_slug" value={view.submitSlug} />
          <input type="hidden" name="day" value={day ?? ''} />

          <SubmissionFields
            variants={view.variants}
            draft={state.draft ?? EMPTY}
            auth={{ submit_slug: view.submitSlug }}
          />

          <button type="submit" disabled={!day || pending} className={`${button} self-start`}>
            {pending ? 'Claiming…' : day ? `Claim Day ${day} and submit` : 'Pick a Day above'}
          </button>
          <p className="text-xs text-muted-foreground">
            The Day is claimed when you submit, not when you pick it. If someone beats you to it
            you&apos;ll be told and nothing you&apos;ve typed will be lost.
          </p>
        </form>
      )}
    </div>
  );
}

/** Absolute, because a Contributor copies these links somewhere else. */
function absolute(path: string) {
  return typeof window === 'undefined' ? path : window.location.origin + path;
}

function Grid({
  days,
  picked,
  onPick,
}: {
  days: DayState[];
  picked: number | null;
  onPick: (day: number) => void;
}) {
  return (
    <ul className="grid grid-cols-5 gap-2">
      {days.map((day) => {
        const free = day.claimable && !day.claimedBy;
        return (
          <li key={day.day}>
            <button
              type="button"
              disabled={!free}
              onClick={() => onPick(day.day)}
              aria-label={`Day ${day.day}: ${
                day.claimedBy ? `claimed by ${day.claimedBy}` : day.claimable ? 'free' : 'already opened'
              }`}
              aria-pressed={picked === day.day}
              className={`flex h-20 w-full flex-col items-center justify-center gap-0.5 rounded-md border p-1 text-center ${
                picked === day.day
                  ? 'border-primary ring-2 ring-ring'
                  : free
                    ? 'border-input hover:bg-muted'
                    : 'border-border bg-muted text-muted-foreground'
              }`}
            >
              <span className="font-title text-xl">{day.day}</span>
              <span className="line-clamp-2 text-[0.65rem] leading-tight">
                {day.claimedBy ? day.claimedBy : day.claimable ? 'free' : 'opened'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
