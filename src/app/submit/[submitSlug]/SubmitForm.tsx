'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CopyLink } from '@/app/dashboard/CopyLink';
import { Occupancy } from '../Occupancy';
import { ContributorFields, TrackFields, button } from '../SubmissionFields';
import { submitAction, type SubmitState } from '../actions';
import type { SubmissionDraft, SubmitView } from '@/lib/submissions';

/**
 * Being dealt a Day, and the three-step wizard that follows: the mellow Track,
 * then the energetic one, then who to credit. Nothing here is claimed until
 * the last step is sent — up to then this is all just typing, held in the
 * fields' own state, and a lost race (the deal collides with somebody else's)
 * costs nothing because nothing was written yet.
 *
 * The wizard never unmounts on a failed attempt, so nothing typed is lost the
 * way an earlier design needed a server round-trip to restore.
 */

const EMPTY: SubmissionDraft = { creditedTo: '', link: '', email: '', tracks: {} };

/** Remembers, per Calendar, that this browser has already claimed a Day. */
const rememberedKey = (submitSlug: string) => `advent.submitted.${submitSlug}`;

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
  const [started, setStarted] = useState(false);
  const alreadyClaimed = useRemembered(view.submitSlug);

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
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-white/70 bg-white/95 p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,.12)]">
        <h2 className="font-title text-3xl font-light">Your day is dealt.</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Two tracks, sealed behind a Day in December. We&apos;re not telling you which one — you
          get to be surprised too.
        </p>
        <div className="flex w-full flex-col gap-2 rounded-xl border-2 border-primary bg-background p-4 text-left">
          <CopyLink label="Your edit link" hint="keep this" url={absolute(state.claimed.editPath)} />
          <p className="text-xs text-muted-foreground">
            This is the only way back into your Submission. Paste it somewhere you&apos;ll find it
            again.
          </p>
        </div>
        <CopyLink label="The Calendar" url={absolute(state.claimed.calendarPath)} />
        <Link
          href={state.claimed.editPath}
          className="mt-2 w-full rounded-full border border-zinc-900/15 bg-white/90 py-3 text-center text-sm font-medium"
        >
          Open your Submission
        </Link>
      </section>
    );
  }

  const full = view.claimableCount === 0;

  return (
    <div className="flex flex-col gap-6">
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

      {!started ? (
        <DealCard view={view} full={full} onDeal={() => setStarted(true)} />
      ) : (
        <form action={act} className="flex flex-col gap-5">
          <input type="hidden" name="submit_slug" value={view.submitSlug} />
          <Wizard
            view={view}
            error={state.error}
            pending={pending}
            attempt={state.attempt}
          />
        </form>
      )}
    </div>
  );
}

function DealCard({
  view,
  full,
  onDeal,
}: {
  view: SubmitView;
  full: boolean;
  onDeal: () => void;
}) {
  const opened = view.revealedCount;
  const claimedUnrevealed = Math.max(0, view.totalDays - opened - view.claimableCount);
  const everythingOpened = opened >= view.totalDays;

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-white/70 bg-white/95 p-8 text-center shadow-[0_16px_44px_rgba(0,0,0,.12)]">
      <Occupancy total={view.totalDays} opened={opened} claimed={claimedUnrevealed} />
      {full ? (
        <div className="flex flex-col gap-2">
          <h2 className="font-title text-2xl font-light">
            {everythingOpened
              ? 'Every Day of this Calendar has already opened.'
              : 'Every Day has been claimed.'}
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {everythingOpened
              ? 'There is nothing left to claim, so there is nothing left to deal.'
              : 'All 25 are out. Nothing left to deal — but the calendar still opens on schedule.'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="font-title text-2xl font-light">We&apos;ll deal you a day.</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Which one is a surprise — you won&apos;t be told, and neither will anyone else. Just
              leave two tracks and let December do the rest.
            </p>
          </div>
          <button type="button" onClick={onDeal} className={`${button} rounded-full px-8 py-3.5`}>
            Deal me a day
          </button>
          <span className="text-sm text-muted-foreground">
            {view.claimedCount} of {view.totalDays} days taken · {view.claimableCount} still going
          </span>
        </>
      )}
    </div>
  );
}

const STEP_LABELS = ['The mellow one', 'The energetic one', 'And you'];

function Wizard({
  view,
  error,
  pending,
  attempt,
}: {
  view: SubmitView;
  error?: string;
  pending: boolean;
  attempt: number;
}) {
  const totalSteps = view.variants.length + 1;
  const [step, setStep] = useState(1);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);

  // A failed deal (the Day collided) leaves everything typed exactly where it
  // was — nothing here unmounts — but it should still land back on the last
  // step, since that is where "Seal my day" lives.
  useEffect(() => {
    if (attempt > 0) setStep(totalSteps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  function next() {
    const container = stepRefs.current[step - 1];
    if (container) {
      const invalid = Array.from(container.querySelectorAll<HTMLInputElement>('[required]')).find(
        (el) => !el.reportValidity(),
      );
      if (invalid) return;
    }
    setStep((s) => Math.min(totalSteps, s + 1));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/70 px-5 py-3 backdrop-blur">
        <span className="text-sm text-muted-foreground">
          {step <= view.variants.length ? 'A day is yours' : STEP_LABELS[STEP_LABELS.length - 1]}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          Step {step} of {totalSteps}
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }, (_, i) => (
          <span
            key={i}
            className={`h-[3px] flex-1 rounded-full ${i < step ? 'bg-zinc-900' : 'bg-zinc-900/15'}`}
          />
        ))}
      </div>

      {view.variants.map(({ variant, label }, i) => (
        <div
          key={variant}
          ref={(el) => {
            stepRefs.current[i] = el;
          }}
          hidden={step !== i + 1}
          className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/95 p-6 shadow-[0_10px_30px_rgba(0,0,0,.08)]"
        >
          <TrackFields variant={variant} label={label} track={undefined} auth={{ submit_slug: view.submitSlug }} />
        </div>
      ))}

      <div
        ref={(el) => {
          stepRefs.current[view.variants.length] = el;
        }}
        hidden={step !== totalSteps}
        className="flex flex-col gap-4 rounded-2xl border border-white/70 bg-white/95 p-6 shadow-[0_10px_30px_rgba(0,0,0,.08)]"
      >
        <h3 className="font-title text-xl font-light">And you</h3>
        <ContributorFields draft={EMPTY} />
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="rounded-full border border-zinc-900/15 px-6 py-3 text-sm font-medium"
          >
            Back
          </button>
        )}
        {step < totalSteps ? (
          <button type="button" onClick={next} className={`${button} rounded-full px-8 py-3`}>
            Next
          </button>
        ) : (
          <button type="submit" disabled={pending} className={`${button} rounded-full px-8 py-3.5`}>
            {pending ? 'Sealing…' : 'Seal my day'}
          </button>
        )}
        <span className="text-xs text-muted-foreground">
          Nobody sees this until your day opens — not even the curator, and not even you.
        </span>
      </div>
    </div>
  );
}

/** Absolute, because a Contributor copies these links somewhere else. */
function absolute(path: string) {
  return typeof window === 'undefined' ? path : window.location.origin + path;
}
