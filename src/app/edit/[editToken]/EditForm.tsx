'use client';

import { useActionState } from 'react';
import { SubmissionFields, button } from '@/app/submit/SubmissionFields';
import { saveSubmissionAction, type EditState } from '@/app/submit/actions';
import type { SubmissionDraft, Variant } from '@/lib/submissions';

/**
 * Editing one Submission. Same fields as claiming it, minus the Day: the Day
 * was claimed once and changing it would be a second claim rather than an edit.
 *
 * A save that is refused keeps what was typed, exactly as a lost race does.
 */
export function EditForm({
  editToken,
  variants,
  draft,
}: {
  editToken: string;
  variants: Variant[];
  draft: SubmissionDraft;
}) {
  const [state, act, pending] = useActionState<EditState, FormData>(saveSubmissionAction, {
    attempt: 0,
  });

  return (
    <form key={state.attempt} action={act} className="flex flex-col gap-3">
      <input type="hidden" name="edit_token" value={editToken} />

      {state.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="rounded-md border border-border px-3 py-2 text-sm">
          Saved. Your Day on the Calendar has changed already.
        </p>
      )}

      <SubmissionFields
        variants={variants}
        draft={state.draft ?? draft}
        auth={{ edit_token: editToken }}
      />

      <button type="submit" disabled={pending} className={`${button} self-start`}>
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
