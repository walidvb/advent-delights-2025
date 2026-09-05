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
      <AdventCalendar days={calendar.days} contributors={calendar.contributors} />
    </AdventDayProvider>
  );
}
