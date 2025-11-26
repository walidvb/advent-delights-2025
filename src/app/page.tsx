import { AdventCalendar } from './advent/AdventCalendar';
import { AdventDayProvider } from './advent/AdventDayContext';

export default function Home() {
  return (
    <AdventDayProvider>
      <AdventCalendar />
    </AdventDayProvider>
  );
}
