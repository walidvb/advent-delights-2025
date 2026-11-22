import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getSubmitView } from '@/lib/submissions';
import { SubmitForm } from './SubmitForm';

/** One lookup per request, shared by the metadata and the page. */
const submitView = cache(getSubmitView);

/**
 * The link preview a Curator gets when they paste the Submit slug into a chat.
 * It names the Calendar, not the Curator — a Curator is only an email address
 * here — and keeps the page out of search results, since the Submit slug is a
 * secret. The image is `opengraph-image.tsx`, drawn per Calendar.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ submitSlug: string }>;
}): Promise<Metadata> {
  const view = await submitView((await params).submitSlug);
  if (!view) return { robots: { index: false, follow: false } };

  const title = `Be a selector for ${view.calendarName}`;
  const description = `Take part in ${possessive(view.calendarName)} roster of selectors for this season's daily treats <3`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, siteName: 'Advent Delights', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function possessive(name: string) {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

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
  const view = await submitView((await params).submitSlug);
  if (!view) notFound();

  return (
    <main className="flex min-h-dvh justify-center bg-[url('/light.webp')] bg-cover bg-fixed bg-center px-4 py-10 sm:py-16">
      <div className="flex w-full max-w-xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-title text-4xl italic font-light sm:text-5xl">{view.calendarName}</h1>
          {view.lastYearSlug && (
            <a
              href={`/calendar/${view.lastYearSlug}`}
              target="_blank"
              rel="noopener"
              className="text-sm text-zinc-700 underline underline-offset-4 hover:text-zinc-900"
            >
              See last year&apos;s calendar ↗
            </a>
          )}
        </div>
        <div className="w-full">
          <SubmitForm view={view} />
        </div>
      </div>
    </main>
  );
}
