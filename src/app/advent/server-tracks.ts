import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { CSVRow, Track, Participant } from './types';

function getPlaceholderImage(seed: number): string {
  return `https://picsum.photos/seed/advent${seed}/400/400`;
}

async function fetchNoembedThumbnail(url: string): Promise<string | null> {
  try {
    if (!url) return null;
    const response = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(url)}`
    );
    const data = await response.json();
    return data.thumbnail_url || null;
  } catch (error) {
    console.error(`Error fetching noembed for ${url}:`, error);
    return null;
  }
}

async function resolveCoverImage(
  coverId: string | undefined,
  trackUrl: string,
  day: number
): Promise<string> {
  if (coverId) {
    return `/covers/${coverId}`;
  }

  const noembedThumbnail = await fetchNoembedThumbnail(trackUrl);
  if (noembedThumbnail) {
    console.log(trackUrl, noembedThumbnail);
    return noembedThumbnail;
  }

  return getPlaceholderImage(day);
}

export async function getTracks(): Promise<Track[]> {
  const csvPath = path.join(process.cwd(), 'src/data-toz.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const result = Papa.parse<CSVRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  const csvRows = result.data;

  const trackPromises = Array.from({ length: 25 }, async (_, i) => {
    const day = i + 1;
    const rowIndex = i;
    const row = csvRows[rowIndex] || {};
    const [lightCoverImage, heavyCoverImage] = await Promise.all([
      resolveCoverImage(row['Track 1 cover id'], row['1 Track URL'], day),
      resolveCoverImage(row['Track 2 cover id'], row['2 Track URL'], day),
    ]);

    return {
      dayIndex: day - 1,
      creditedTo: row['Credited to'],
      participantLink: row['Link to you (if you want one!)'] || '',
      // Light track (1)
      lightCreditedTo: row['Credited to'],
      lightTrackUrl: row['1 Track URL'],
      lightDescription: row['1 Track Description'],
      lightBuyLink: row['1 Track buy link'],
      lightCoverImage: `${lightCoverImage
        .replace(/\.\w+$/, '.webp')
        .replace(/\s/g, '-')}`,
      lightArtistName: (row['Artist name 1'] || '').trim(),
      lightTrackName: (row['Track name 1'] || '').trim(),
      // Heavy track (2)
      heavyCreditedTo: row['Credited to'],
      heavyTrackUrl: row['2 Track URL'],
      heavyDescription: row['2 Track Description'],
      heavyBuyLink: row['2 Track buy link'],
      heavyCoverImage: `${heavyCoverImage
        .replace(/\s/g, '-')
        .replace(/\.\w+$/, '.webp')}`,
      heavyArtistName: (row['Artist Name 2'] || '').trim(),
      heavyTrackName: (row['Track name 2'] || '').trim(),
    };
  });

  return Promise.all(trackPromises);
}

export function getParticipants(): Participant[] {
  const csvPath = path.join(process.cwd(), 'src/data-toz.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const result = Papa.parse<CSVRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  const seen = new Set<string>();
  const participants: Participant[] = [];

  for (const row of result.data) {
    const name = row['Credited to'];
    if (name && !seen.has(name)) {
      seen.add(name);
      participants.push({
        name,
        link: row['Link to you (if you want one!)'] || '',
      });
    }
  }

  return participants;
}
