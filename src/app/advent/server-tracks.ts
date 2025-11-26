import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { CSVRow, Track } from './types';

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
  coverUrl: string | undefined,
  trackUrl: string,
  day: number
): Promise<string> {
  if (coverUrl) {
    // Check for Google Drive ID
    const driveIdMatch = coverUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveIdMatch) {
      const id = driveIdMatch[1];
      const localPath = path.join(
        process.cwd(),
        'public',
        'covers',
        `${id}.jpg`
      );
      if (fs.existsSync(localPath)) {
        return `/covers/${id}.jpg`;
      }
    } else if (!coverUrl.includes('drive.google.com')) {
      return coverUrl;
    }
  }

  const noembedThumbnail = await fetchNoembedThumbnail(trackUrl);
  if (noembedThumbnail) {
    return noembedThumbnail;
  }

  return getPlaceholderImage(day);
}

export async function getTracks(): Promise<Track[]> {
  const csvPath = path.join(process.cwd(), 'src/data.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const result = Papa.parse<CSVRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  const csvRows = result.data;

  // Create array of promises to resolve tracks in parallel
  const trackPromises = Array.from({ length: 25 }, async (_, i) => {
    const day = i + 1;
    const rowIndex = i % csvRows.length;
    const row = csvRows[rowIndex];

    const [lightCoverImage, heavyCoverImage] = await Promise.all([
      resolveCoverImage(
        row['Light Track cover image'],
        row['Light track URL'],
        day
      ),
      resolveCoverImage(
        row['Heavy Track cover image'],
        row['Heavy track URL'],
        day
      ),
    ]);

    return {
      dayIndex: day - 1,
      // Light track
      lightCreditedTo: row['Credited to'],
      lightTrackUrl: row['Light track URL'],
      lightDescription: row['Light track Description'],
      lightBuyLink: row['Light track buy link'],
      lightCoverImage,
      // Heavy track
      heavyCreditedTo: row['Credited to'],
      heavyTrackUrl: row['Heavy track URL'],
      heavyDescription: row['Heavy track Description'],
      heavyBuyLink: row['Heavy track buy link'],
      heavyCoverImage,
    };
  });

  return Promise.all(trackPromises);
}
