export interface Track {
  dayIndex: number;
  creditedTo: string;
  trackUrl: string;
  description: string;
  buyLink: string;
  coverImage: string;
}

export interface CSVRow {
  Timestamp: string;
  'Credited to': string;
  'Light track URL': string;
  'Light track Description': string;
  'Light track buy link': string;
  'Heavy track URL': string;
  'Heavy track Description': string;
  'Heavy track buy link': string;
  'Light Track cover image': string;
  'Heavy Track cover image': string;
}
