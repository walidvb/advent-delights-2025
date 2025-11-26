import { AdventCalendar } from './advent/AdventCalendar';
import { AdventDayProvider } from './advent/AdventDayContext';
import { getTracks } from './advent/server-tracks';

export default async function Home() {
  const tracks = await getTracks();

  return (
    <AdventDayProvider>
      <AdventCalendar tracks={tracks} />
    </AdventDayProvider>
  );
}
