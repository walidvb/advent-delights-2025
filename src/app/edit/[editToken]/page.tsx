import Link from 'next/link';
import { notFound } from 'next/navigation';
import { calendarPath } from '@/lib/calendars';
import { getSubmission } from '@/lib/submissions';
import { EditForm } from './EditForm';

/**
 * One Contributor's own Submission, reached by the edit link they were given.
 *
 * The token is the whole of the authority and it names exactly one Submission,
 * so this page can show no one else's — there is no id in the URL to change to
 * somebody else's row. A token nobody holds is a plain 404.
 *
 * Once the Calendar is an Archive the link still works — it names the Day it
 * always named, and points at the Calendar, where every Day is now open and the
 * Contributor can read their own Submission as everyone else does. What it no
 * longer does is offer to change it. The refusal itself is
 * `updateSubmission`'s; dropping the form is only the courtesy of not offering
 * a button that cannot work.
 */
export default async function EditSubmissionPage({
  params,
}: {
  params: Promise<{ editToken: string }>;
}) {
  const { editToken } = await params;
  const submission = await getSubmission(editToken);
  if (!submission) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-title text-4xl">
          Day {submission.day}{' '}
          <span className="text-2xl text-muted-foreground">{submission.calendarName}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {submission.archived
            ? 'Your Submission, as it will stay.'
            : 'Your Submission. Change anything you like — keep this link and you can come back.'}
        </p>
      </div>

      {submission.archived ? (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-sm">
          {submission.calendarName} has finished — every Day has opened, and it is now an Archive
          that stays exactly as it was. Your Submission can no longer be changed, and the Calendar
          will keep it at this link for good.
        </p>
      ) : (
        <EditForm
          editToken={editToken}
          variants={submission.variants}
          draft={submission.draft}
        />
      )}

      <Link
        href={calendarPath(submission.calendarSlug)}
        className="text-sm underline text-muted-foreground"
      >
        The Calendar
      </Link>
    </main>
  );
}
