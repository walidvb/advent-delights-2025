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
          Your Submission. Change anything you like — keep this link and you can come back.
        </p>
      </div>

      <EditForm
        editToken={editToken}
        variants={submission.variants}
        draft={submission.draft}
      />

      <Link
        href={calendarPath(submission.calendarSlug)}
        className="text-sm underline text-muted-foreground"
      >
        The Calendar
      </Link>
    </main>
  );
}
