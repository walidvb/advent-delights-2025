export type TrackVariant = 'light' | 'heavy';

export interface Track {
  dayIndex: number;
  // Light track
  lightCreditedTo: string;
  lightTrackUrl: string;
  lightDescription: string;
  lightBuyLink: string;
  lightCoverImage: string;
  // Heavy track
  heavyCreditedTo: string;
  heavyTrackUrl: string;
  heavyDescription: string;
  heavyBuyLink: string;
  heavyCoverImage: string;
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
