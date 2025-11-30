import { AdventCalendar } from './advent/AdventCalendar';
import { AdventDayProvider } from './advent/AdventDayContext';
import { getTracks, getParticipants } from './advent/server-tracks';

export default async function Home() {
  const tracks = await getTracks();
  const participants = getParticipants();

  return (
    <AdventDayProvider>
      <AdventCalendar tracks={tracks} participants={participants} />
    </AdventDayProvider>
  );
}
