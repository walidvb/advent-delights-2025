export type TrackVariant = 'light' | 'heavy';

/**
 * One piece of music: where to hear it, who made it, what it's called, why the
 * Contributor chose it, and where to buy it. Always a link to somewhere else —
 * nothing is hosted here.
 */
export interface Track {
  url: string;
  trackName: string;
  artistName: string;
  description: string;
  buyLink: string;
  coverImage: string;
}

/**
 * A position from 1 to 25 in the Calendar, holding one Track per Variant.
 *
 * Tracks are keyed by Variant rather than kept in prefixed fields, so a
 * consumer reads `day.tracks[variant]` instead of branching field by field.
 * The map is partial and carries no count: a Day may hold one Track, two, or
 * none at all when nobody has claimed it.
 */
export interface Day {
  dayIndex: number;
  creditedTo: string;
  participantLink: string;
  tracks: Partial<Record<TrackVariant, Track>>;
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
  'Link to you (if you want one!)': string;
  'Track 1 cover id': string;
  'Track 2 cover id': string;
  'Artist name 1': string;
  'Track name 1': string;
  'Artist Name 2': string;
  'Track name 2': string;
}

export interface Participant {
  name: string;
  link: string;
}
