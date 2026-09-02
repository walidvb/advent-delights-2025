'use server';

import { headers } from 'next/headers';
import { calendarPath } from '@/lib/calendars';
import { sendEmail } from '@/lib/email';
import { lookupTrackMetadata, type TrackMetadata } from '@/lib/track-metadata';
import {
  createSubmission,
  draftProblem,
  editPath,
  getSubmission,
  getSubmitView,
  readDraft,
  updateSubmission,
  type DayState,
  type SubmissionDraft,
} from '@/lib/submissions';

/**
 * What the claim form knows after a try. Everything a Contributor typed comes
 * back in `draft`, so losing the race to a Day — or mistyping a link — never
 * costs them their work; `attempt` remounts the form so the fields re-read
 * those values as their defaults.
 *
 * `days` is the freshly re-read claim state, so a Contributor who lost is
 * choosing from what is actually free now rather than from the grid they
 * loaded.
 */
export type SubmitState = {
  attempt: number;
  error?: string;
  day?: number;
  draft?: SubmissionDraft;
  days?: DayState[];
  claimed?: { editPath: string; calendarPath: string };
};

export async function submitAction(
  previous: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const submitSlug = String(formData.get('submit_slug') ?? '');
  const view = await getSubmitView(submitSlug);
  if (!view) return { attempt: previous.attempt + 1, error: 'This submission link is not valid.' };

  const draft = readDraft(formData, view.variants);
  // The hidden input is empty until a Day is picked, and `Number('')` is 0 —
  // so this must ask for a real Day, not merely an integer.
  const day = Number(formData.get('day'));
  const failed = (error: string, days?: DayState[]): SubmitState => ({
    attempt: previous.attempt + 1,
    error,
    day,
    draft,
    days: days ?? view.days,
  });

  if (!Number.isInteger(day) || day < 1) return failed('Pick a Day first.');

  const problem = draftProblem(draft, view.variants);
  if (problem) return failed(problem);

  const result = await createSubmission(submitSlug, day, draft);
  if (result === 'not-found') {
    return { attempt: previous.attempt + 1, error: 'This submission link is not valid.' };
  }
  if (result === 'not-claimable') {
    return failed(`Day ${day} has already opened, so it can't be claimed. Pick another.`);
  }
  if (result === 'taken') {
    // Somebody else's Submission landed first and nothing of theirs was
    // written. The grid is re-read so the Day they lost now shows as claimed.
    return failed(
      `Someone claimed Day ${day} just before you did. Pick another — everything you typed is still here.`,
      (await getSubmitView(submitSlug))?.days,
    );
  }

  const claimed = {
    editPath: editPath(result.editToken),
    calendarPath: calendarPath(result.calendarSlug),
  };

  // The Submission is already written and the cache already purged. The receipt
  // comes after, and cannot unmake any of it — see `sendReceipt`.
  await sendReceipt(draft.email, view.calendarName, claimed);

  return { attempt: previous.attempt + 1, claimed };
}

/**
 * The one message a Contributor ever receives: their own edit link, and the
 * Calendar's, so closing the tab doesn't cost them the ability to fix a typo.
 * Giving an address is optional, and with none given nothing is sent.
 *
 * **Never throws.** It runs only once the Submission is saved, and a provider
 * that refuses must not undo a claim the Contributor already has — the same two
 * links are on screen either way. So the failure is logged and swallowed.
 *
 * ponytail: absolute links are built from the incoming Host, as the dashboard
 * does. A forged Host only misdirects the forger's own receipt to their own
 * address; pin a configured base URL if that ever stops being true.
 */
async function sendReceipt(
  email: string,
  calendarName: string,
  claimed: { editPath: string; calendarPath: string },
): Promise<void> {
  if (!email) return;
  try {
    const incoming = await headers();
    const base = `${incoming.get('x-forwarded-proto') ?? 'http'}://${incoming.get('host')}`;
    await sendEmail({
      to: email,
      subject: `Your Day in ${calendarName}`,
      text: [
        `Thanks for contributing to ${calendarName}.`,
        '',
        'Change your submission any time with this link — keep it, it is the only way back in:',
        base + claimed.editPath,
        '',
        'The Calendar itself, for December:',
        base + claimed.calendarPath,
        '',
        "This is the only message we'll send you.",
      ].join('\n'),
    });
  } catch (error) {
    console.error('[receipt] submission saved but the receipt did not send', error);
  }
}

/** What the edit form knows after a save: the same keep-what-you-typed shape. */
export type EditState = { attempt: number; error?: string; saved?: boolean; draft?: SubmissionDraft };

/**
 * Holding the edit token is the whole of a Contributor's authority, and it
 * names exactly one Submission — so this can neither be pointed at somebody
 * else's nor be talked into changing the Day or the Calendar.
 */
export async function saveSubmissionAction(
  previous: EditState,
  formData: FormData,
): Promise<EditState> {
  const attempt = previous.attempt + 1;
  const editToken = String(formData.get('edit_token') ?? '');

  // Re-read rather than trust the form for which Variants this Submission has.
  const existing = await getSubmission(editToken);
  if (!existing) return { attempt, error: 'This edit link is not valid.' };

  const draft = readDraft(formData, existing.variants);
  const problem = draftProblem(draft, existing.variants);
  if (problem) return { attempt, error: problem, draft };

  const result = await updateSubmission(editToken, draft);
  if (result === 'archived') {
    const error = `${existing.calendarName} has finished — an Archive can no longer be changed.`;
    return { attempt, error, draft };
  }
  return { attempt, saved: true, draft };
}

/**
 * A guess at a Track's title, artist and artwork from its URL, for prefilling
 * the form. Never throws and never refuses: `null` means "nothing to suggest",
 * which is what an unrecognised source, an unreachable one and a private link
 * all look like from here. The Contributor types the fields themselves in
 * exactly the way they always could, and nothing on screen changes.
 */
export async function lookupTrackAction(url: string): Promise<TrackMetadata | null> {
  return lookupTrackMetadata(url);
}
