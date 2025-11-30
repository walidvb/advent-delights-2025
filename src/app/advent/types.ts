export type TrackVariant = 'light' | 'heavy';

export interface Track {
  dayIndex: number;
  // Light track (1)
  lightCreditedTo: string;
  lightTrackUrl: string;
  lightDescription: string;
  lightBuyLink: string;
  lightCoverImage: string;
  lightArtistName: string;
  lightTrackName: string;
  // Heavy track (2)
  heavyCreditedTo: string;
  heavyTrackUrl: string;
  heavyDescription: string;
  heavyBuyLink: string;
  heavyCoverImage: string;
  heavyArtistName: string;
  heavyTrackName: string;
}

export interface CSVRow {
  Timestamp: string;
  'Credited to': string;
  '1 Track URL': string;
  '1 Track Description': string;
  '1 Track buy link': string;
  '2 Track URL': string;
  '2 Track Description': string;
  '2 Track buy link': string;
  '1 Track cover image': string;
  '2 Track cover image': string;
  'Track 1 cover id': string;
  'Track 2 cover id': string;
  'Artist name 1': string;
  'Track name 1': string;
  'Artist Name 2': string;
  'Track name 2': string;
}
