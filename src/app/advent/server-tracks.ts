import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { CSVRow, Track } from './types';

function getPlaceholderImage(seed: number): string {
  return `https://picsum.photos/seed/advent${seed}/400/400`;
}

function getCoverImage(url: string | undefined, day: number): string {
  if (!url || url.includes('drive.google.com')) {
    return getPlaceholderImage(day);
  }
  return url;
}

export function getTracks(): Track[] {
  const csvPath = path.join(process.cwd(), 'src/data.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const result = Papa.parse<CSVRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  const csvRows = result.data;
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
