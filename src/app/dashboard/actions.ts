'use server';

import { redirect } from 'next/navigation';
import { getCurator, setPassword } from '@/lib/auth';
import { createCalendar, updateCalendar, type ChosenSlug } from '@/lib/calendars';
import { deleteSubmission } from '@/lib/curation';
import { DAYS_IN_CALENDAR } from '@/app/advent/reveal';
import { resolveTracks } from '@/lib/media';
import { draftProblem, fillDay, getDayToFill, readDraft, type SubmissionDraft } from '@/lib/submissions';

export async function createCalendarAction(formData: FormData) {
  const curator = await getCurator();
  if (!curator) redirect('/sign-in');

  const result = await createCalendar(
    curator.id,
    String(formData.get('name') ?? ''),
    String(formData.get('description') ?? ''),
  );

  redirect(result === 'name' ? '/dashboard/new?error=name' : dashboardWithSlugNotice(result));
}

/**
 * A taken Slug is never a rejection, but the Curator is told they were given a
 * variation rather than left to spot the number on the end for themselves.
 */
function dashboardWithSlugNotice(chosen: ChosenSlug) {
  return chosen.taken ? `/dashboard?taken=${encodeURIComponent(chosen.slug)}` : '/dashboard';
}

/**
 * Ownership is checked inside `updateCalendar`, which writes nothing for a
 * Calendar belonging to somebody else — a forged id in this form gets the same
 * answer as a mistyped one.
 */
export async function updateCalendarAction(formData: FormData) {
  const curator = await getCurator();
  if (!curator) redirect('/sign-in');

  const id = String(formData.get('id') ?? '');
  const result = await updateCalendar(id, curator.id, {
    name: String(formData.get('name') ?? ''),
    description: String(formData.get('description') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    isPublic: formData.get('is_public') === 'on',
  });

  redirect(result ? dashboardWithSlugNotice(result) : '/dashboard');
}

/**
 * Removes the Submission on one Day, unseen. Ownership is checked inside
 * `deleteSubmission`, so a forged id in this form deletes nothing and gets the
 * same answer as a mistyped one.
 */
export async function deleteSubmissionAction(formData: FormData) {
  const curator = await getCurator();
  if (!curator) redirect('/sign-in');

  const id = String(formData.get('id') ?? '');
  await deleteSubmission(id, curator.id, Number(formData.get('day')));

  redirect(`/dashboard/calendar/${id}`);
}

export async function setPasswordAction(formData: FormData) {
  const curator = await getCurator();
  if (!curator) redirect('/sign-in');

  const result = await setPassword(curator.id, String(formData.get('password') ?? ''));
  redirect(`/dashboard?passwordSet=${result}`);
}

/** What the fill form knows after a refused save: the keep-what-you-typed shape. */
export type FillState = { attempt: number; error?: string; draft?: SubmissionDraft };

/**
 * Saves one Day of a self-filled Calendar, then goes wherever the button that
 * was pressed said: back to the grid, or straight on to the Day named in its
 * value — the following one.
 *
 * Ownership and the self-filled flag are both checked inside `fillDay`, so a
 * forged id or a Calendar that is not self-filled writes nothing.
 */
export async function fillDayAction(previous: FillState, formData: FormData): Promise<FillState> {
  const curator = await getCurator();
  if (!curator) redirect('/sign-in');

  const attempt = previous.attempt + 1;
  const id = String(formData.get('id') ?? '');
  const day = Number(formData.get('day'));

  const target = await getDayToFill(id, curator.id, day);
  if (!target) return { attempt, error: 'This Calendar is not one you fill yourself.' };

  // The form carries Tracks only; who is credited comes from the Day itself.
  const draft = {
    ...readDraft(formData, target.variants),
    creditedTo: target.draft.creditedTo,
    link: target.draft.link,
    email: target.draft.email,
  };
  const problem =
    draftProblem(draft, target.variants) ?? (await resolveTracks(draft.tracks, target.variants));
  if (problem) return { attempt, error: problem, draft };

  const result = await fillDay(id, curator.id, day, draft);
  if (result === 'revealed') {
    return { attempt, error: `Day ${day} has already opened, so it stays empty.`, draft };
  }
  if (result === 'archived') {
    return { attempt, error: 'This Calendar has finished — an Archive can no longer be changed.', draft };
  }
  if (result === 'not-found') return { attempt, error: 'This Calendar is not one you fill yourself.' };

  const next = Number(formData.get('next'));
  redirect(
    Number.isInteger(next) && next >= 1 && next <= DAYS_IN_CALENDAR
      ? `/dashboard/calendar/${id}/day/${next}`
      : `/dashboard/calendar/${id}`,
  );
}
