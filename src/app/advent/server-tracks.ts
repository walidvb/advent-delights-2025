import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { CSVRow, Track, Participant } from './types';

function readCSVData(): CSVRow[] {
  const csvPath = path.join(process.cwd(), 'src/artist.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const result = Papa.parse<CSVRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data;
}

export function getTracks(): Track[] {
  const csvRows = readCSVData();

  return Array.from({ length: 25 }, (_, i) => {
    const dayIndex = i;
    if (dayIndex < 4) {
      return {
        dayIndex,
        title: '',
        description: '',
        author: '',
        color: '#ffffff',
        disabled: true,
      };
    }
    const row = csvRows[dayIndex - 4] || {};
    return {
      dayIndex,
      title: row.Title || '',
      description: row.Description || '',
      author: row.Author || '',
      color: row.Color || '#ffffff',
      disabled: false,
    };
  });
}

export function getParticipants(): Participant[] {
  const csvRows = readCSVData();

  const seen = new Set<string>();
  const participants: Participant[] = [];

  for (const row of csvRows) {
    const name = row.Author;
    if (name && !seen.has(name)) {
      seen.add(name);
      participants.push({ name });
    }
  }

  return participants;
}
