import { AdventCalendar } from './advent/AdventCalendar';
import { AdventDayProvider } from './advent/AdventDayContext';
import { getTracks } from './advent/server-tracks';

export default function Home() {
  const tracks = getTracks();

  return (
    <AdventDayProvider>
      <AdventCalendar tracks={tracks} />
    </AdventDayProvider>
  );
}
