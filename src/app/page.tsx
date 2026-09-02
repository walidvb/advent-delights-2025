import { AdventCalendar } from './advent/AdventCalendar';
import { AdventDayProvider } from './advent/AdventDayContext';
import { getDays, getParticipants } from './advent/server-tracks';
import { CalendarIdentity } from './advent/types';

/**
 * The one Calendar this site serves, until ticket 09 addresses Calendars by
 * Slug and this comes from the database.
 */
const CALENDAR: CalendarIdentity = { slug: 'advent-2025', year: 2025 };

export default async function Home() {
  const days = await getDays();
  const participants = getParticipants();

  return (
    <AdventDayProvider calendar={CALENDAR}>
      <AdventCalendar days={days} participants={participants} />
    </AdventDayProvider>
  );
}
