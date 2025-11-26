import Papa from 'papaparse';
import { CSVRow, Track } from './types';

const CSV_DATA = `Timestamp,Credited to,Light track URL,Light track Description,Light track buy link,Heavy track URL,Heavy track Description,Heavy track buy link,Light Track cover image,Heavy Track cover image
25/11/2025 12:55:14,Phil E Bloomfield,https://www.youtube.com/watch?v=dW5ptFKf8jo,"Met Sam in Milan a few weeks ago, and he gave me this beautiful acid-etched metal-plated CD - Diathomee. I love when 'real' musicians produce electronic music - this sounds like live recording. RIYL Hesaitix, the new JASSS, trip-hop, illbient.",https://samsala.bandcamp.com/track/birds,https://www.youtube.com/watch?v=GZkxfwgLS2s,"Each Friday, Neurot records (run by Neurosis) offers an LP as a pay-what-you-want download. That's how I can across Grey Daturas. Perfect for my current 2000s noise/heavy psych obsession. RIYL guitars, Yellow Swans, feedback, overdrive.",https://greydaturas.bandcamp.com/track/neuralgia,,
25/11/2025 17:08:14,Cyril Yeterian,https://www.youtube.com/watch?v=ZMGoVdv85Ig,one of the most beautiful track i've ever had to listen to. it instantly connects me with myself and delivers me a deep feeling of belonging to something way bigger than me,https://pharoahsanders.bandcamp.com/album/pharoah,https://www.youtube.com/watch?v=j6D8TiOJUiE,my hometown most infectious and enthralling live band at the moment. can't do anything but shake my body on their music.,https://boundbyendogamy.bandcamp.com/album/bound-by-endogamy,https://drive.google.com/open?id=1yfO6v-OxiOR7iVGrAxjEy6RpTJfDo3W_,https://drive.google.com/open?id=1Z0Pv8gQvkHJQr2nkkvTUxc2ncajnzGL5`;

function parseCSV(): CSVRow[] {
  const result = Papa.parse<CSVRow>(CSV_DATA, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data;
}

function getPlaceholderImage(seed: number): string {
  return `https://picsum.photos/seed/advent${seed}/400/400`;
}

function getCoverImage(url: string | undefined, day: number): string {
  if (!url || url.includes('drive.google.com')) {
    return getPlaceholderImage(day);
  }
  return url;
}

export function generateTracks(): Track[] {
  const csvRows = parseCSV();
  const tracks: Track[] = [];

  for (let day = 1; day <= 25; day++) {
    const rowIndex = (day - 1) % csvRows.length;
    const row = csvRows[rowIndex];

    const coverImage = getCoverImage(row['Light Track cover image'], day);

    tracks.push({
      dayIndex: day - 1,
      creditedTo: row['Credited to'],
      trackUrl: row['Light track URL'],
      description: row['Light track Description'],
      buyLink: row['Light track buy link'],
      coverImage,
    });
  }

  return tracks;
}

export const TRACKS = generateTracks();
