'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { headers } from 'next/headers';
import { calendarPath } from '@/lib/calendars';
import { COVER_TYPES, coverProblem } from '@/lib/covers';
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
  type SubmissionDraft,
} from '@/lib/submissions';

/**
 * What the claim form knows after a try. Nothing a Contributor typed is
 * carried here — the wizard holding it never unmounts on a failed attempt, so
 * their fields keep exactly what they typed without a round trip.
 */
export type SubmitState = {
  attempt: number;
  error?: string;
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
  const problem = draftProblem(draft, view.variants);
  if (problem) return { attempt: previous.attempt + 1, error: problem };

  const result = await createSubmission(submitSlug, draft);
  if (result === 'not-found') {
    return { attempt: previous.attempt + 1, error: 'This submission link is not valid.' };
  }
  if (result === 'full' || result === 'taken') {
    return {
      attempt: previous.attempt + 1,
      error:
        'Every Day here is spoken for now. Nothing you typed is lost — try again shortly, or ask the Curator if someone drops out.',
    };
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

/**
 * Stores one uploaded cover and answers with its object key, which the form
 * then carries as a hidden field like any other answer.
 *
 * **The upload happens when the image is chosen, not when the form is
 * submitted.** That is what makes an upload survive losing the race to a Day:
 * the bytes are already in the bucket and the draft that comes back holds only
 * the key, so a remounted form still knows where its cover is. It also means
 * the Contributor sees the real stored image as their preview rather than a
 * promise of one.
 *
 * Nothing is processed here. The browser has already shrunk the image; the
 * Worker checks the declared type against the three we serve and the bytes
 * against the size limit, and puts them in the bucket unaltered. Neither check
 * reads the image — that is the point — so the type is the one the uploader
 * claimed, and `/cover/` serves it back under that same claim with `nosniff`.
 *
 * The limits are re-checked here rather than trusted from the browser, and the
 * caller has to hold the Calendar's Submit slug or one of its edit tokens —
 * otherwise this is an open invitation to fill somebody else's bucket. In
 * practice Next refuses a server-action body over 1MB before either check is
 * reached; a shrunk cover is a few tens of kilobytes, so this only ever bites a
 * forged request.
 */
export async function uploadCoverAction(
  formData: FormData,
): Promise<{ key: string } | { error: string }> {
  const file = formData.get('cover');
  if (!(file instanceof File)) return { error: 'No image arrived. Try choosing it again.' };

  const problem = coverProblem(file);
  if (problem) return { error: problem };

  const submitSlug = String(formData.get('submit_slug') ?? '');
  const editToken = String(formData.get('edit_token') ?? '');
  const allowed = submitSlug
    ? await getSubmitView(submitSlug)
    : editToken
      ? await getSubmission(editToken)
      : null;
  if (!allowed) return { error: 'This submission link is not valid.' };

  // A key nobody can guess and nothing can collide with, so an upload never
  // overwrites another and a replacement is simply a different object. The
  // prefix keeps Contributors' images apart from the seeded `covers/` ones.
  const key = `uploads/${crypto.randomUUID().replaceAll('-', '')}.${COVER_TYPES[file.type]}`;
  const { env } = await getCloudflareContext({ async: true });
  await env.BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  // ponytail: replacing or removing a cover leaves the old object in the
  // bucket, as does abandoning the form before submitting — the row simply
  // stops pointing at it. Deleting on replace would be wrong (the Submission
  // still points at the old key until it is saved) and would not cover the
  // abandoned-form case anyway, so nothing here deletes: a sweep of keys under
  // `uploads/` that no `tracks.cover_key` names collects all three at once, the
  // day the bucket is worth sweeping. Same call ticket 13 made for deletion.
  return { key };
}
