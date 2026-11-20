'use client';

import { useActionState } from 'react';
import { SubmissionFields, button } from '@/app/submit/SubmissionFields';
import { fillDayAction, type FillState } from '@/app/dashboard/actions';
import type { SubmissionDraft, Variant } from '@/lib/submissions';

/**
 * One Day of a self-filled Calendar, filled in by its Curator. The same fields
 * a Contributor sees, all on one page, with two ways out: save and go back to
 * the grid, or save and go straight on to the following Day.
 *
 * A refused save keeps what was typed, exactly as the edit form does. The page
 * keys this by Day, so moving on to the next one starts from a fresh form.
 */
export function FillForm({
  calendarId,
  submitSlug,
  day,
  nextDay,
  variants,
  draft,
}: {
  calendarId: string;
  submitSlug: string;
  day: number;
  /** The Day after this one, or null on the last Day. */
  nextDay: number | null;
  variants: Variant[];
  draft: SubmissionDraft;
}) {
  const [state, act, pending] = useActionState<FillState, FormData>(fillDayAction, { attempt: 0 });

  return (
    <form key={state.attempt} action={act} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={calendarId} />
      <input type="hidden" name="day" value={day} />

      <SubmissionFields
        variants={variants}
        draft={state.draft ?? draft}
        auth={{ submit_slug: submitSlug }}
        withEmail={false}
      />

      {state.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-zinc-900/15 bg-white/90 px-6 py-3 text-sm font-medium disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {nextDay !== null && (
          <button
            type="submit"
            name="next"
            value={nextDay}
            disabled={pending}
            className={`${button} rounded-full px-6 py-3`}
          >
            Save &amp; go to Day {nextDay} →
          </button>
        )}
      </div>
    </form>
  );
}
