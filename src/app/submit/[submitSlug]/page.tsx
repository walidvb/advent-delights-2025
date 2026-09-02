import { notFound } from 'next/navigation';
import { getSubmitView } from '@/lib/submissions';
import { SubmitForm } from './SubmitForm';

/**
 * The Submit slug: where a Contributor claims a Day.
 *
 * Everything on this page comes from `getSubmitView`, which reads Days and
 * credited names and nothing else — so there is no Track content in this
 * page's response to leak. The Submit slug is a secret, so an unknown one is a
 * plain 404 that says nothing about whether it nearly matched.
 */
export default async function SubmitPage({
  params,
}: {
  params: Promise<{ submitSlug: string }>;
}) {
  const view = await getSubmitView((await params).submitSlug);
  if (!view) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-title text-4xl">{view.calendarName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Take a Day, give it two tracks. No account, nothing to sign up for.
        </p>
      </div>

      <p className="text-sm">
        You won&apos;t see what anyone else has put in — only which Days are taken and who took
        them. December should still be a surprise for you too.
      </p>

      <SubmitForm view={view} />
    </main>
  );
}
