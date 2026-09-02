import { AdventCalendar } from './advent/AdventCalendar';
import { AdventDayProvider } from './advent/AdventDayContext';
import { getDays, getParticipants } from './advent/server-tracks';

export default async function Home() {
  const days = await getDays();
  const participants = getParticipants();

  return (
    <AdventDayProvider>
      <AdventCalendar days={days} participants={participants} />
    </AdventDayProvider>
  );
}
