import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { CSVRow, Day, Participant } from './types';

function getPlaceholderImage(seed: number): string {
  return `https://picsum.photos/seed/advent${seed}/400/400`;
}

async function fetchNoembedThumbnail(url: string): Promise<string | null> {
  try {
    if (!url) return null;
    const response = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(url)}`
    );
    const data = (await response.json()) as { thumbnail_url?: string };
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
    return noembedThumbnail;
  }

  return getPlaceholderImage(day);
}

/**
 * Cover files on disk are all `.webp` and carry no spaces, whatever the
 * spreadsheet says.
 */
function coverPath(cover: string): string {
  return cover.replace(/\s/g, '-').replace(/\.\w+$/, '.webp');
}

export async function getDays(): Promise<Day[]> {
  const csvPath = path.join(process.cwd(), 'src/data.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const result = Papa.parse<CSVRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  const csvRows = result.data;

  const dayPromises = Array.from({ length: 25 }, async (_, i) => {
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
      tracks: {
        light: {
          url: row['1 Track URL'],
          trackName: (row['Track name 1'] || '').trim(),
          artistName: (row['Artist name 1'] || '').trim(),
          description: row['1 Track Description'],
          buyLink: row['1 Track buy link'],
          coverImage: coverPath(lightCoverImage),
        },
        heavy: {
          url: row['2 Track URL'],
          trackName: (row['Track name 2'] || '').trim(),
          artistName: (row['Artist Name 2'] || '').trim(),
          description: row['2 Track Description'],
          buyLink: row['2 Track buy link'],
          coverImage: coverPath(heavyCoverImage),
        },
      },
    };
  });

  return Promise.all(dayPromises);
}

export function getParticipants(): Participant[] {
  const csvPath = path.join(process.cwd(), 'src/data.csv');
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
