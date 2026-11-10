import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdventCalendar } from '@/app/advent/AdventCalendar';
import { AdventDayProvider } from '@/app/advent/AdventDayContext';
import { getCalendarPayload } from '@/lib/calendar-payload';

/**
 * A Calendar, at its Slug. The page is a shell: it asks for the one cached
 * payload holding every Day and hands it to the interface unchanged, so a
 * normal visit does no database work of its own.
 *
 * A Slug no Calendar has is a 404, not an error — the Slug is guessable by
 * design, so being asked for one that does not exist is ordinary.
 */
/**
 * A Calendar that is not Public stays reachable at its Slug but is kept out of
 * search results: Public is about discovery, and a search index is discovery.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const calendar = await getCalendarPayload((await params).slug);
  return calendar && !calendar.isPublic ? { robots: { index: false, follow: false } } : {};
}

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const calendar = await getCalendarPayload(slug);
  if (!calendar) notFound();

  return (
    <AdventDayProvider calendar={{ slug: calendar.slug, year: calendar.year }}>
      <AdventCalendar year={calendar.year} days={calendar.days} contributors={calendar.contributors} />
    </AdventDayProvider>
  );
}
