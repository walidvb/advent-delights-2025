'use server';

import { redirect } from 'next/navigation';
import { getCurator } from '@/lib/auth';
import { createCalendar, updateCalendar, type ChosenSlug } from '@/lib/calendars';
import { deleteSubmission } from '@/lib/curation';

export async function createCalendarAction(formData: FormData) {
  const curator = await getCurator();
  if (!curator) redirect('/sign-in');

  const result = await createCalendar(
    curator.id,
    String(formData.get('name') ?? ''),
    String(formData.get('description') ?? ''),
  );

  if (result === 'name') redirect('/dashboard/new?error=name');

  // Straight to the Calendar's own page: the two links to share are there, and
  // having just named it is exactly when the Curator wants to send them.
  redirect(withSlugNotice(`/dashboard/calendar/${result.id}`, result));
}

/**
 * A taken Slug is never a rejection, but the Curator is told they were given a
 * variation rather than left to spot the number on the end for themselves.
 */
function withSlugNotice(path: string, chosen: ChosenSlug) {
  return chosen.taken ? `${path}?taken=${encodeURIComponent(chosen.slug)}` : path;
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

  redirect(result ? withSlugNotice(`/dashboard/calendar/${id}`, result) : '/dashboard');
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
