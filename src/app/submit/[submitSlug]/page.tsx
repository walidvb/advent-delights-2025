import { notFound } from 'next/navigation';
import { getSubmitView } from '@/lib/submissions';
import { SubmitForm } from './SubmitForm';

/**
 * The Submit slug: where a Contributor is dealt a Day.
 *
 * Everything on this page comes from `getSubmitView`, which reports only how
 * full the Calendar is — no Day, no credited name, no Track content — so
 * there is nothing in this page's response for a Contributor to see ahead of
 * their own reveal.
 */
export default async function SubmitPage({
  params,
}: {
  params: Promise<{ submitSlug: string }>;
}) {
  const view = await getSubmitView((await params).submitSlug);
  if (!view) notFound();

  return (
    <main className="flex min-h-dvh justify-center bg-[url('/light.webp')] bg-cover bg-fixed bg-center px-4 py-10 sm:py-16">
      <div className="flex w-full max-w-xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-title text-4xl italic font-light sm:text-5xl">{view.calendarName}</h1>
          <p className="text-sm text-zinc-700">
            Take a day, give it two tracks. No account, nothing to sign up for.
          </p>
        </div>
        <p className="max-w-sm text-center text-sm text-zinc-700">
          You won&apos;t see what anyone else has put in — only roughly how full the Calendar is.
          December should still be a surprise for you too.
        </p>
        <div className="w-full">
          <SubmitForm view={view} />
        </div>
      </div>
    </main>
  );
}
